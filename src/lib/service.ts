import { randomUUID } from "node:crypto";
import { del, head } from "@vercel/blob";
import { getDb, type Connection } from "./db";
import {
  categoryId,
  outcomes,
  type Nominee,
  type NomineeImage,
  type NomineeSource,
  type Season,
} from "./constants";
import { nominationInput, winners } from "./validation";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number,
) {
  const db = await getDb();
  const rows = await db.query<{ count: number }>(
    `INSERT INTO rate_limits(key,count,expires_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires_at<=now() THEN 1 ELSE rate_limits.count+1 END, expires_at=CASE WHEN rate_limits.expires_at<=now() THEN now()+$2*interval '1 second' ELSE rate_limits.expires_at END RETURNING count`,
    [key, windowSeconds],
  );
  if (rows[0].count > max)
    throw new AppError(
      "A little too enthusiastic. Please try again later.",
      429,
    );
}
const select = `SELECT n.id,n.season_id AS "seasonId",n.company,n.headline,n.description,n.before_state AS "before",n.after_state AS "after",n.impact,n.changed_at AS "changedAt",n.category,n.sector,n.sources,n.images,n.status,n.outcome,n.verified,n.duplicate_of AS "duplicateOf",n.created_at AS "createdAt",(SELECT count(*)::int FROM votes v WHERE v.nominee_id=n.id) AS count`;

function legacySource(url: string): NomineeSource {
  let publisher = "Source";
  try {
    publisher = new URL(url).hostname.replace(/^www\./, "");
  } catch {}
  return {
    url,
    title: publisher,
    publisher,
    publishedAt: "",
    type: "reporting",
  };
}

function jsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function dateOnly(value: unknown): string | null {
  if (typeof value === "string") {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
    if (match) return match[1];
  }
  if (value instanceof Date && Number.isFinite(value.getTime()))
    return value.toISOString().slice(0, 10);
  return null;
}

export function normalizeNominee(row: Nominee): Nominee {
  const rawSources = jsonArray(row.sources);
  const sources = rawSources
    .map((item): NomineeSource | null => {
      if (typeof item === "string") return legacySource(item);
      if (!item || typeof item !== "object") return null;
      const value = item as Partial<NomineeSource>;
      if (typeof value.url !== "string") return null;
      const fallback = legacySource(value.url);
      return {
        url: value.url,
        title: value.title || fallback.title,
        publisher: value.publisher || fallback.publisher,
        publishedAt: value.publishedAt || "",
        type:
          value.type &&
          ["primary", "regulator", "reporting", "community"].includes(value.type)
            ? value.type
            : "reporting",
      };
    })
    .filter((item): item is NomineeSource => item !== null);
  const images = jsonArray(row.images)
    .map((item): NomineeImage | null => {
      if (!item || typeof item !== "object") return null;
      const value = item as Partial<NomineeImage>;
      if (
        (value.kind !== "upload" && value.kind !== "external") ||
        typeof value.url !== "string" ||
        typeof value.alt !== "string"
      )
        return null;
      return {
        kind: value.kind,
        url: value.url,
        alt: value.alt,
        ...(value.fit === "cover" || value.fit === "contain"
          ? { fit: value.fit }
          : {}),
      };
    })
    .filter((item): item is NomineeImage => item !== null);
  const normalizedCategory = categoryId(row.category, row.sector);
  return {
    ...row,
    changedAt: dateOnly(row.changedAt),
    category: normalizedCategory,
    sector: normalizedCategory,
    sources,
    images,
    outcome: outcomes.some((item) => item.id === row.outcome)
      ? row.outcome
      : "ongoing",
    verified: Boolean(row.verified),
  };
}

export async function listNominees(voter: string | null = null, all = false) {
  const db = await getDb();
  const rows = await db.query<Nominee>(
    `${select},EXISTS(SELECT 1 FROM votes v WHERE v.nominee_id=n.id AND v.voter_id=$1::uuid) AS voted FROM nominees n ${all ? "" : "WHERE n.status='visible'"} ORDER BY count DESC,n.created_at ASC,n.id`,
    [voter],
  );
  return rows.map(normalizeNominee);
}
export async function season() {
  const db = await getDb();
  const [s] = await db.query<Season>(
    'SELECT id,closes_at AS "closesAt",finalized_at AS "finalizedAt" FROM seasons ORDER BY id DESC LIMIT 1',
  );
  if (!s) throw new AppError("No award season configured.", 503);
  return s;
}
async function lockedSeason(tx: Connection) {
  const [locked] = await tx.query<{ id: number }>(
    `SELECT id FROM seasons ORDER BY id DESC LIMIT 1 FOR UPDATE`,
  );
  if (!locked) throw new AppError("No award season configured.", 503);
  const [s] = await tx.query<{ id: number; closed: boolean }>(
    `SELECT id,closes_at<=clock_timestamp() AS closed FROM seasons WHERE id=$1`,
    [locked.id],
  );
  if (!s) throw new AppError("No award season configured.", 503);
  return s;
}
export async function submitNominee(input: unknown) {
  const parsed = nominationInput.safeParse(input);
  if (!parsed.success) throw new AppError(parsed.error.issues[0].message);
  const n = parsed.data;
  await validateUploadedImages(n.images);
  const db = await getDb();
  return db.transaction(async (tx) => {
    const s = await lockedSeason(tx);
    if (s.closed) throw new AppError("This year’s nominations have closed.");
    const changedAt = new Date(`${n.changedAt}T12:00:00Z`);
    if (changedAt.getUTCFullYear() !== s.id)
      throw new AppError(
        `The nominated change must have happened during the ${s.id} award year.`,
      );
    if (changedAt.getTime() > Date.now())
      throw new AppError("The change date cannot be in the future.");
    if (
      n.sources.some(
        (item) =>
          new Date(`${item.publishedAt}T12:00:00Z`).getTime() > Date.now(),
      )
    )
      throw new AppError("Receipt dates cannot be in the future.");
    const id = randomUUID();
    await tx.query(
      `INSERT INTO nominees(id,season_id,company,headline,description,before_state,after_state,impact,changed_at,category,sector,sources,images) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb)`,
      [
        id,
        s.id,
        n.company,
        n.headline,
        n.description,
        n.before,
        n.after,
        n.impact,
        n.changedAt,
        n.category,
        n.category,
        JSON.stringify(n.sources),
        JSON.stringify(n.images),
      ],
    );
    return id;
  });
}

const maxImageBytes = 5 * 1024 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
async function validateUploadedImages(images: NomineeImage[]) {
  for (const image of images) {
    if (image.kind !== "upload") continue;
    if (!process.env.BLOB_READ_WRITE_TOKEN)
      throw new AppError("Image uploads are not configured right now.", 503);
    try {
      const parsed = new URL(image.url);
      if (
        parsed.protocol !== "https:" ||
        !parsed.hostname.endsWith(".public.blob.vercel-storage.com") ||
        !parsed.pathname.startsWith("/nominations/")
      )
        throw new AppError("One of the uploaded images is not a recognized Blob image.");
      const blob = await head(image.url, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      if (!imageTypes.has(blob.contentType) || blob.size > maxImageBytes)
        throw new AppError("Each uploaded image must be a JPG, PNG, or WebP under 5 MB.");
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("One of the uploaded images could not be verified.");
    }
  }
}
export async function castVote(id: string, voter: string, active: boolean) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const s = await lockedSeason(tx);
    if (s.closed) throw new AppError("Voting has closed for this year.");
    const [n] = await tx.query<{ status: string; season_id: number }>(
      "SELECT status,season_id FROM nominees WHERE id=$1",
      [id],
    );
    if (!n || n.status !== "visible" || n.season_id !== s.id)
      throw new AppError("This nomination is not open for voting.", 404);
    await tx.query("INSERT INTO voters(id) VALUES($1) ON CONFLICT DO NOTHING", [
      voter,
    ]);
    if (active)
      await tx.query(
        "INSERT INTO votes(nominee_id,voter_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [id, voter],
      );
    else
      await tx.query("DELETE FROM votes WHERE nominee_id=$1 AND voter_id=$2", [
        id,
        voter,
      ]);
    const [row] = await tx.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM votes WHERE nominee_id=$1",
      [id],
    );
    return { count: row.count, voted: active };
  });
}
async function snapshotClosedSeason(tx: Connection, id: number) {
  const existing = await tx.query(
    "SELECT season_id FROM results WHERE season_id=$1",
    [id],
  );
  if (existing.length) return;
  const rawRows = await tx.query<Nominee>(
    `${select},false AS voted FROM nominees n WHERE n.status='visible' AND n.season_id=$1 ORDER BY count DESC,n.created_at ASC,n.id`,
    [id],
  );
  const rows = rawRows.map(normalizeNominee);
  await tx.query(
    "INSERT INTO results(season_id,snapshot) VALUES($1,$2::jsonb)",
    [id, JSON.stringify({ nominees: rows, ...winners(rows) })],
  );
  await tx.query("UPDATE seasons SET finalized_at=now() WHERE id=$1", [id]);
}
export async function finalize() {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const s = await lockedSeason(tx);
    if (s.closed) await snapshotClosedSeason(tx, s.id);
  });
}
export async function resultArchives() {
  await finalize();
  const rows = await (await getDb()).query<{
    season_id: number;
    snapshot: {
      nominees: Nominee[];
      overall: Nominee[];
      categories: Record<string, Nominee[]>;
    };
  }>("SELECT season_id,snapshot FROM results ORDER BY season_id DESC");
  return rows.map((row) => {
    const nominees = row.snapshot.nominees.map(normalizeNominee);
    return {
      ...row,
      snapshot: {
        nominees,
        ...winners(nominees),
      },
    };
  });
}

export async function publicHistory() {
  const [archives, current] = await Promise.all([
    resultArchives(),
    listNominees(),
  ]);
  const unique = new Map<string, Nominee>();
  for (const archive of archives)
    for (const nominee of archive.snapshot.nominees)
      unique.set(nominee.id, nominee);
  for (const nominee of current) unique.set(nominee.id, nominee);
  return [...unique.values()].sort(
    (a, b) =>
      b.seasonId - a.seasonId ||
      b.count - a.count ||
      a.company.localeCompare(b.company),
  );
}

export async function companyRollups() {
  const groups = new Map<
    string,
    {
      company: string;
      nominations: Nominee[];
      seasons: Set<number>;
      votes: number;
    }
  >();
  for (const nominee of await publicHistory()) {
    const key = nominee.company.trim().toLocaleLowerCase();
    const group = groups.get(key) ?? {
      company: nominee.company.trim(),
      nominations: [],
      seasons: new Set<number>(),
      votes: 0,
    };
    group.nominations.push(nominee);
    group.seasons.add(nominee.seasonId);
    group.votes += nominee.count;
    groups.set(key, group);
  }
  return [...groups.values()].sort(
    (a, b) =>
      b.nominations.length - a.nominations.length ||
      b.votes - a.votes ||
      a.company.localeCompare(b.company),
  );
}
export async function reportNominee(id: string, reason: string) {
  if (reason.trim().length < 5 || reason.length > 1000)
    throw new AppError("Please give a reason between 5 and 1,000 characters.");
  const db = await getDb();
  const rows = await db.query(
    "SELECT id FROM nominees WHERE id=$1 AND status='visible'",
    [id],
  );
  if (!rows.length) throw new AppError("Nomination not found.", 404);
  await db.query("INSERT INTO reports(id,nominee_id,reason) VALUES($1,$2,$3)", [
    randomUUID(),
    id,
    reason.trim(),
  ]);
}
export async function adminAction(body: Record<string, unknown>) {
  await finalize();
  const db = await getDb();
  if (body.action === "resolve") {
    await db.query("UPDATE reports SET resolved=1 WHERE id=$1", [body.id]);
    return;
  }
  if (body.action === "removeImage") {
    const db = await getDb();
    const [row] = await db.query<{ images: NomineeImage[] }>(
      "SELECT images FROM nominees WHERE id=$1",
      [body.id],
    );
    if (!row) throw new AppError("Nomination not found.", 404);
    const images = Array.isArray(row.images) ? row.images : [];
    const removed = images.find((image) => image.url === body.url);
    if (!removed) throw new AppError("Image not found.", 404);
    await db.query("UPDATE nominees SET images=$1::jsonb WHERE id=$2", [
      JSON.stringify(images.filter((image) => image.url !== body.url)),
      body.id,
    ]);
    if (removed.kind === "upload") {
      try {
        await del(removed.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
      } catch (error) {
        console.error("Could not delete removed Blob image", error);
      }
    }
    return;
  }
  if (body.action === "review") {
    if (
      typeof body.verified !== "boolean" ||
      !outcomes.some((item) => item.id === body.outcome)
    )
      throw new AppError("Invalid review status.");
    await db.query(
      "UPDATE nominees SET verified=$1,outcome=$2 WHERE id=$3",
      [body.verified ? 1 : 0, body.outcome, body.id],
    );
    return;
  }
  await db.transaction(async (tx) => {
    const s = await lockedSeason(tx);
    if (s.closed) await snapshotClosedSeason(tx, s.id);
    if (body.action === "deadline") {
      const date = new Date(String(body.date));
      if (s.closed) throw new AppError("A closed season cannot be reopened.");
      if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now())
        throw new AppError("Choose a future closing date.");
      await tx.query("UPDATE seasons SET closes_at=$1 WHERE id=$2", [
        date,
        s.id,
      ]);
      return;
    }
    if (body.action === "moderate") {
      if (!["visible", "hidden", "duplicate"].includes(String(body.status)))
        throw new AppError("Invalid status.");
      if (body.status === "duplicate") {
        if (s.closed)
          throw new AppError("Duplicates cannot be changed after closing.");
        if (body.id === body.duplicateOf)
          throw new AppError("An entry cannot duplicate itself.");
        const targets = await tx.query(
          "SELECT id FROM nominees WHERE id=$1 AND status='visible' AND season_id=$2",
          [body.duplicateOf, s.id],
        );
        if (!targets.length)
          throw new AppError("Choose a visible original from this season.");
      }
      await tx.query(
        "UPDATE nominees SET status=$1,duplicate_of=$2 WHERE id=$3 AND season_id=$4",
        [
          body.status,
          body.status === "duplicate" ? body.duplicateOf : null,
          body.id,
          s.id,
        ],
      );
      return;
    }
    throw new AppError("Unknown action.");
  });
}
