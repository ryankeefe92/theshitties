import Link from "next/link";

export const metadata = { title: "How it works" };

export default function How() {
  return (
    <article className="page narrow prose">
      <div className="eyebrow">THE SHITTIES</div>
      <h1>How it works.</h1>
      <p className="lede">
        The Shitties is an annual public ballot for products, services, and
        systems that got worse during the year.
      </p>

      <h2>Nominate</h2>
      <p>
        Submit a specific change from the current award year, choose one
        category, and link to supporting sources.
      </p>

      <h2>Vote</h2>
      <p>Vote for as many nominees as you want. Click again to remove a vote.</p>

      <h2>Results</h2>
      <p>
        The top vote-getter in each category wins. The overall leader receives
        The Golden Shitty. Ties share the award.
      </p>

      <Link className="button" href="/rules">
        Read the submission rules ↗
      </Link>
    </article>
  );
}
