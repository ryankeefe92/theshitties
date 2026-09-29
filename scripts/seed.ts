import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
import { getDb } from "../src/lib/db";
import { randomUUID } from "node:crypto";
async function main() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL ||
    (process.env.DATABASE_URL && process.env.ALLOW_DEMO_SEED !== "true")
  )
    throw new Error(
      "Demo seeding is only allowed locally or in an explicitly enabled development database.",
    );
  const db = await getDb();
  const [existing] = await db.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM nominees",
  );
  if (existing.count) {
    console.log("Database already has nominations; seed skipped.");
    return;
  }
  const entries = [
    {
      company: "Streamly",
      headline: "Now with ads. Even when you pay.",
      category: "entertainment",
      sector: "entertainment",
      description: "The fictional streaming service added commercial breaks to its paid plan. The uninterrupted experience became an extra.",
      before: "The paid plan offered uninterrupted films and shows without commercial breaks.",
      after: "The standard paid plan began inserting commercial breaks in February 2026.",
      impact: "Subscribers now watch ads or pay for a more expensive tier to restore the old experience.",
      changedAt: "2026-02-12",
    },
    {
      company: "CloudPocket",
      headline: "Your files. Their exit fee.",
      category: "technology",
      sector: "technology",
      description: "This fictional storage company replaced one-click export with a paid migration package.",
      before: "Customers could download a complete archive of their own files with one click.",
      after: "A May 2026 change moved bulk export into a paid migration package.",
      impact: "Leaving the service now costs money and requires extra steps for existing customers.",
      changedAt: "2026-05-08",
    },
    {
      company: "NoteNest",
      headline: "The search feature has left the chat.",
      category: "technology",
      sector: "technology",
      description: "A fictional note-taking app removed offline search in its latest update.",
      before: "Users could search downloaded notebooks without an internet connection.",
      after: "The July 2026 app update made search dependent on an active connection.",
      impact: "Finding saved notes now fails on flights, commutes, and anywhere with poor service.",
      changedAt: "2026-07-19",
    },
    {
      company: "FitLoop",
      headline: "Congratulations. Your watch needs a subscription.",
      category: "technology",
      sector: "technology",
      description: "This fictional fitness tracker moved previously included sleep history behind a monthly membership.",
      before: "Device owners could view their complete sleep history as part of the purchase.",
      after: "An April 2026 update limited history unless owners started a monthly membership.",
      impact: "People who already bought the hardware must keep paying to access their own older data.",
      changedAt: "2026-04-03",
    },
    {
      company: "QuietSearch",
      headline: "The private search engine that changed its mind.",
      category: "technology",
      sector: "technology",
      description: "A fictional search engine changed its privacy-first default experience.",
      before: "The default search experience did not use individual search history for promotions.",
      after: "In August 2026, personalized promotions based on search history became the default.",
      impact: "Users must find and change a setting to recover the privacy posture they signed up for.",
      changedAt: "2026-08-24",
    },
    {
      company: "RecipeRoom",
      headline: "A recipe for more pop-ups.",
      category: "food-drink",
      sector: "food-drink",
      description: "This fictional recipe site now covers its ingredient lists with autoplay video and sticky promotions.",
      before: "Readers could open a recipe and reach the ingredient list without an overlay.",
      after: "A March 2026 redesign added autoplay video and promotions over the recipe content.",
      impact: "Readers spend more time dismissing ads and can accidentally lose their place while cooking.",
      changedAt: "2026-03-17",
    },
  ];
  for (const entry of entries) {
    await db.query(
      "INSERT INTO nominees(id,season_id,company,headline,category,sector,description,before_state,after_state,impact,changed_at,sources) VALUES($1,2026,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)",
      [
        randomUUID(),
        entry.company,
        entry.headline,
        entry.category,
        entry.sector,
        entry.description,
        entry.before,
        entry.after,
        entry.impact,
        entry.changedAt,
        JSON.stringify([
          {
            url: "https://example.com/fictional-demo",
            title: "Fictional demonstration source",
            publisher: "Example.com",
            publishedAt: entry.changedAt,
            type: "reporting",
          },
        ]),
      ],
    );
  }
  console.log("Added six fictional nominations; no demo votes.");
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
