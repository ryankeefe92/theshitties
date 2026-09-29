import Link from "next/link";
import { notFound } from "next/navigation";
import { listNominees, season } from "@/lib/service";
import { voterId } from "@/lib/auth";
import { category, sourceType } from "@/lib/constants";
import { ImageGallery, NomineeBadges, Vote, Report } from "@/components/ui";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const n = (await listNominees()).find((n) => n.id === id);
  return {
    title: n?.headline || "Nomination",
    description: n?.description.slice(0, 160),
  };
}
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [items, s] = await Promise.all([
    listNominees(await voterId(), true),
    season(),
  ]);
  const n = items.find((n) => n.id === id);
  if (!n || n.status === "hidden") notFound();
  return (
    <article className="page narrow">
      <Link className="back" href="/#nominees">
        ← Back to the nominees
      </Link>
      <div className="eyebrow">
        {n.seasonId} NOMINATION · {category(n.category).name}
      </div>
      <h1>{n.headline}</h1>
      <div className="detail-company">
        <strong>
          <Link href={`/companies/${encodeURIComponent(n.company)}`}>
            {n.company} ↗
          </Link>
        </strong>
        <span>
          Change dated{" "}
          {n.changedAt
            ? new Date(`${n.changedAt}T12:00:00Z`).toLocaleDateString("en-US", {
                timeZone: "UTC",
                dateStyle: "medium",
              })
            : "not recorded"}
        </span>
      </div>
      <NomineeBadges nominee={n} />
      {n.status === "duplicate" ? (
        <aside className="notice">
          This nomination duplicates an existing entry.{" "}
          <Link href={"/nominees/" + n.duplicateOf}>Visit the original →</Link>
        </aside>
      ) : (
        <Vote
          nominee={n}
          closed={
            n.seasonId !== s.id || new Date(s.closesAt).getTime() <= Date.now()
          }
        />
      )}
      <ImageGallery images={n.images || []} title={n.headline} />
      <p className="detail-body">{n.description}</p>
      {n.before && n.after && n.impact ? (
        <section className="case-file" aria-label="The case">
          <div>
            <span>01 · Before</span>
            <p>{n.before}</p>
          </div>
          <div>
            <span>02 · After</span>
            <p>{n.after}</p>
          </div>
          <div>
            <span>03 · Damage</span>
            <p>{n.impact}</p>
          </div>
        </section>
      ) : null}
      <section className="sources">
        <h2>The receipts</h2>
        {n.sources.map((source, i) => (
          <a
            className="source-card"
            key={source.url + i}
            href={source.url}
            target="_blank"
            rel="nofollow noopener noreferrer"
          >
            <span className="source-number">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>
              <strong>{source.title}</strong>
              <small>
                {source.publisher} · {sourceType(source.type).name}
                {source.publishedAt
                  ? ` · ${new Date(`${source.publishedAt}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", dateStyle: "medium" })}`
                  : ""}
              </small>
            </span>
            <span>↗</span>
          </a>
        ))}
      </section>
      <p className="muted">
        Community nomination.{" "}
        {n.verified ? "Receipts checked by an editor." : "Receipts not yet verified."}
      </p>
      {n.status === "visible" && <Report id={n.id} />}
    </article>
  );
}
