import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Trophy } from "@/components/trophy";
import { NomineeList } from "@/components/ui";
import { finalize, listNominees, season } from "@/lib/service";
import { voterId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  await finalize();
  const [s, items] = await Promise.all([
    season(),
    listNominees(await voterId()),
  ]);
  const closed = new Date(s.closesAt).getTime() <= Date.now();

  return (
    <>
      <section className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" />
            THE {s.id} SHITTIES · {closed ? "VOTING CLOSED" : "VOTING OPEN"}
          </div>
          <h1>
            The annual awards
            <br />
            for things that got
            <br />
            <em>worse.</em>
          </h1>
          <p>
            Vote on the year&apos;s worst product and service changes, or
            nominate one we missed.
          </p>
          <div className="hero-actions">
            <Link className="button" href={closed ? "/results" : "/submit"}>
              {closed ? "View results" : "Submit a nomination"}{" "}
              <ArrowUpRight size={17} />
            </Link>
            <Link className="text-link" href="#nominees">
              View nominees <ArrowDown size={15} />
            </Link>
          </div>
        </div>
        <div className="trophy-panel">
          <span className="edition">
            {s.id}
            <br />
            <strong>THE SHITTIES</strong>
          </span>
          <Trophy />
          <span className="trophy-caption">THE GOLDEN SHITTY</span>
        </div>
      </section>

      <section id="nominees" className="shell ballot">
        <div className="section-heading">
          <div>
            <div className="eyebrow">CATEGORIES</div>
            <h2>
              The {s.id} ballot<span>.</span>
            </h2>
          </div>
          <p>
            {closed ? (
              "Voting is closed."
            ) : (
              <>
                Voting closes{" "}
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "America/New_York",
                }).format(new Date(s.closesAt))}{" "}
                ET.
              </>
            )}
          </p>
        </div>
        {!process.env.DATABASE_URL && (
          <div className="demo-note">
            LOCAL PREVIEW · Sample nominations are fictional.
          </div>
        )}
        <NomineeList
          items={items.filter((n) => n.seasonId === s.id)}
          closed={closed}
        />
        <p className="ballot-footnote">
          Vote for as many nominees as you want.{" "}
          <Link href="/how-it-works">How it works ↗</Link>
        </p>
      </section>
    </>
  );
}
