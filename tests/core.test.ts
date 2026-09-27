import { test, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
process.env.LOCAL_DB_PATH = "memory://";
process.env.DATABASE_URL = "";
process.env.SESSION_SECRET =
  "test-session-secret-at-least-thirty-two-characters";
import { getDb } from "../src/lib/db";
import {
  submitNominee,
  castVote,
  listNominees,
  rateLimit,
  reportNominee,
  adminAction,
  finalize,
  normalizeNominee,
  resultArchives,
} from "../src/lib/service";
import { nominationInput, winners } from "../src/lib/validation";
import { sign, verify, passwordHash, passwordValid } from "../src/lib/auth";
const input = {
  company: "Test Company",
  headline: "The update that removed everything",
  category: "technology",
  sector: "technology",
  changedAt: "2026-06-15",
  description:
    "This product removed the useful features customers had already paid for.",
  before: "Customers could use the core features included with their purchase.",
  after: "The company removed those features in its June 2026 product update.",
  impact: "Existing customers lost functionality that was part of the product they bought.",
  sources: [
    {
      url: "https://example.com/evidence",
      title: "June product update notes",
      publisher: "Example News",
      publishedAt: "2026-06-15",
      type: "reporting" as const,
    },
  ],
  images: [
    {
      kind: "external" as const,
      url: "https://example.com/evidence.png",
      alt: "Screenshot of the removed feature",
      fit: "contain" as const,
    },
  ],
  website: "",
};
before(async () => {
  await getDb();
});
test("validation accepts plain text and rejects unsafe sources and honeypot", () => {
  assert.equal(nominationInput.safeParse(input).success, true);
  assert.equal(
    nominationInput.safeParse({
      ...input,
      sources: [{ ...input.sources[0], url: "javascript:alert(1)" }],
    }).success,
    false,
  );
  assert.equal(
    nominationInput.safeParse({ ...input, website: "spam" }).success,
    false,
  );
  assert.equal(
    nominationInput.safeParse({ ...input, sources: [] }).success,
    false,
  );
  assert.equal(
    nominationInput.safeParse({
      ...input,
      images: Array.from({ length: 4 }, () => input.images[0]),
    }).success,
    false,
  );
  assert.equal(
    nominationInput.safeParse({
      ...input,
      images: [{ ...input.images[0], url: "http://example.com/image.png" }],
    }).success,
    false,
  );
});
test("signed tokens reject tampering; password hashes verify", () => {
  const token = sign("hello");
  assert.equal(verify(token), "hello");
  assert.equal(verify(token + "x"), null);
  process.env.ADMIN_PASSWORD_HASH = passwordHash("long-test-password");
  assert.equal(passwordValid("long-test-password"), true);
  assert.equal(passwordValid("wrong"), false);
});
test("winner calculation preserves ties and empty categories", () => {
  const result = winners([
    { category: "technology", count: 2 },
    { category: "travel", count: 2 },
    { category: "technology", count: 1 },
  ]);
  assert.equal(result.overall.length, 2);
  assert.equal(result.categories.technology.length, 1);
  assert.equal(result.categories["fast-food"].length, 0);
  assert.equal(winners([]).overall.length, 0);
});
test("database-backed submission, votes, moderation, reports, limits and finalization", async () => {
  const db = await getDb();
  const id = await submitNominee(input);
  const other = await submitNominee({ ...input, company: "Second Company" });
  await assert.rejects(
    () => submitNominee({ ...input, changedAt: "2025-12-31" }),
    /2026 award year/,
  );
  const voter = randomUUID();
  assert.equal((await listNominees()).length, 2);
  assert.equal(
    (await listNominees()).find((n) => n.id === id)?.images[0].alt,
    "Screenshot of the removed feature",
  );
  assert.equal(
    (await listNominees()).find((n) => n.id === id)?.sources[0].title,
    "June product update notes",
  );
  const normalized = normalizeNominee({
    ...(await listNominees()).find((n) => n.id === id)!,
    changedAt: new Date("2026-06-15T00:00:00Z") as unknown as string,
    sources: JSON.stringify(input.sources) as unknown as typeof input.sources,
    images: JSON.stringify(input.images) as unknown as typeof input.images,
    verified: 1 as unknown as boolean,
  });
  assert.equal(normalized.changedAt, "2026-06-15");
  assert.equal(normalized.sources[0].publishedAt, "2026-06-15");
  assert.equal(normalized.images[0].alt, "Screenshot of the removed feature");
  assert.equal(normalized.images[0].fit, "contain");
  assert.equal(normalized.verified, true);
  await adminAction({
    action: "review",
    id,
    verified: true,
    outcome: "partial",
  });
  const reviewed = (await listNominees()).find((n) => n.id === id);
  assert.equal(reviewed?.verified, true);
  assert.equal(reviewed?.outcome, "partial");
  await Promise.all(
    Array.from({ length: 12 }, () => castVote(id, voter, true)),
  );
  assert.equal((await listNominees(voter)).find((n) => n.id === id)?.count, 1);
  assert.equal(
    (await listNominees(voter)).find((n) => n.id === id)?.voted,
    true,
  );
  await castVote(id, voter, false);
  await castVote(id, voter, false);
  assert.equal((await listNominees()).find((n) => n.id === id)?.count, 0);
  await Promise.all(
    Array.from({ length: 8 }, () => castVote(id, randomUUID(), true)),
  );
  assert.equal((await listNominees()).find((n) => n.id === id)?.count, 8);
  await reportNominee(id, "Please review this source.");
  const [report] = await db.query<{ id: string }>("SELECT id FROM reports");
  await adminAction({ action: "resolve", id: report.id });
  assert.equal(
    (await db.query<{ resolved: number }>("SELECT resolved FROM reports"))[0]
      .resolved,
    1,
  );
  await adminAction({ action: "moderate", id, status: "hidden" });
  assert.equal(
    (await listNominees()).some((n) => n.id === id),
    false,
  );
  await assert.rejects(() => castVote(id, voter, true), /not open/);
  await adminAction({ action: "moderate", id, status: "visible" });
  await adminAction({
    action: "removeImage",
    id,
    url: "https://example.com/evidence.png",
  });
  assert.equal((await listNominees()).find((n) => n.id === id)?.images.length, 0);
  await assert.rejects(
    () =>
      adminAction({
        action: "moderate",
        id,
        status: "duplicate",
        duplicateOf: id,
      }),
    /itself/,
  );
  await adminAction({
    action: "moderate",
    id: other,
    status: "duplicate",
    duplicateOf: id,
  });
  assert.equal((await listNominees()).length, 1);
  assert.equal((await listNominees())[0].count, 8);
  await rateLimit("test-limit", 2, 60);
  await rateLimit("test-limit", 2, 60);
  await assert.rejects(() => rateLimit("test-limit", 2, 60), /enthusiastic/);
  await db.query(
    "UPDATE rate_limits SET expires_at=now()-interval '1 second' WHERE key='test-limit'",
  );
  await rateLimit("test-limit", 2, 60);
  await adminAction({ action: "deadline", date: "2029-01-01T05:00:00Z" });
  await finalize();
  assert.equal((await db.query("SELECT * FROM results")).length, 0);
  await db.query("UPDATE seasons SET closes_at=now()-interval '1 second'");
  await assert.rejects(() => castVote(id, voter, true), /closed/);
  await assert.rejects(() => submitNominee(input), /closed/);
  await Promise.all([finalize(), finalize(), finalize()]);
  const archives = await resultArchives();
  assert.equal(archives.length, 1);
  assert.equal(archives[0].snapshot.overall[0].count, 8);
  await adminAction({ action: "moderate", id, status: "hidden" });
  assert.equal((await resultArchives())[0].snapshot.overall[0].count, 8);
  await assert.rejects(
    () => adminAction({ action: "deadline", date: "2030-01-01T00:00:00Z" }),
    /reopened/,
  );
});
