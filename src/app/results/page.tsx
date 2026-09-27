import Link from "next/link";
import { resultArchives } from "@/lib/service";
import { categories } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Results" };

export default async function Results() {
  const archives = await resultArchives();

  return (
    <div className="page narrow prose">
      <div className="eyebrow">THE SHITTIES</div>
      <h1>Results.</h1>
      {!archives.length ? (
        <div className="empty">
          <h2>No results yet.</h2>
          <p>The current ballot is still open.</p>
          <Link className="button" href="/#nominees">
            View nominees ↗
          </Link>
        </div>
      ) : (
        archives.map((a) => (
          <section className="archive" key={a.season_id}>
            <h2>{a.season_id}</h2>
            {[
              {
                id: "overall",
                name: "The Golden Shitty",
                items: a.snapshot.overall,
              },
              ...categories.map((c) => ({
                ...c,
                items: a.snapshot.categories[c.id] ?? [],
              })),
            ].map((c) => (
              <div key={c.id}>
                <h3>{c.name}</h3>
                {c.items.length ? (
                  c.items.map((n) => (
                    <p key={n.id}>
                      <strong>{n.company}</strong> — {n.headline}{" "}
                      <span className="muted">({n.count} votes)</span>
                    </p>
                  ))
                ) : (
                  <p>No nominations.</p>
                )}
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
