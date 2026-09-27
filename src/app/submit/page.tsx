import { SubmissionForm } from "@/components/ui";
import { season } from "@/lib/service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Submit a nomination" };

export default async function Submit() {
  const s = await season();
  return (
    <div className="page narrow">
      <div className="eyebrow">{s.id} NOMINATIONS</div>
      <h1>
        Submit a <em>nomination.</em>
      </h1>
      <p className="lede">
        Nominate a specific change that made a product, service, or public
        system worse.
      </p>
      <SubmissionForm
        closed={new Date(s.closesAt).getTime() <= Date.now()}
        seasonId={s.id}
      />
    </div>
  );
}
