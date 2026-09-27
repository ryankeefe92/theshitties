import { loadEnvConfig } from "@next/env";
import { randomUUID } from "node:crypto";
import type { NomineeImage, NomineeSource } from "../src/lib/constants";

loadEnvConfig(process.cwd());

import { getDb } from "../src/lib/db";

type EditorialNominee = {
  company: string;
  headline: string;
  category: string;
  sector: string;
  description: string;
  before: string;
  after: string;
  impact: string;
  changedAt: string;
  sources: NomineeSource[];
  images: NomineeImage[];
  outcome?: "ongoing" | "partial" | "reversed" | "settled";
};

// These Commons-hosted brand marks avoid republishing copyrighted news photos.
// The redirect produces a browser-friendly PNG thumbnail from the source SVG.
function commonsLogo(file: string, alt: string): NomineeImage {
  return {
    kind: "external",
    url: `https://commons.wikimedia.org/wiki/Special:Redirect/file/${file}?width=800`,
    alt,
    fit: "contain",
  };
}

const nominees: EditorialNominee[] = [
  {
    company: "Southwest Airlines",
    headline: "Open seating got assigned a funeral.",
    category: "travel",
    sector: "travel",
    description:
      "Southwest ended nearly six decades of open seating and moved to assigned seats, including a Basic fare whose passengers generally receive their assignments at check-in.",
    before:
      "Passengers received a boarding position and chose any available seat after boarding, a defining feature that distinguished Southwest from other major U.S. airlines.",
    after:
      "Flights on and after January 27 use assigned seating. Most fares can select a seat while Basic passengers generally receive an assignment at check-in unless a card or status benefit applies.",
    impact:
      "Travelers who valued choosing after boarding lost that flexibility, while the new fare structure turns seat location and extra legroom into differentiated benefits.",
    changedAt: "2026-01-27",
    images: [
      commonsLogo(
        "Southwest_Airlines_logo_2014.svg",
        "Southwest Airlines logo",
      ),
    ],
    sources: [
      {
        url: "https://www.latimes.com/business/story/2026-01-27/southwests-open-seating-ends-with-final-flight",
        title: "Southwest's open seating ends with final flight",
        publisher: "Los Angeles Times",
        publishedAt: "2026-01-27",
        type: "reporting",
      },
    ],
  },
  {
    company: "American Airlines",
    headline: "The fare is basic. The fees are advanced.",
    category: "travel",
    sector: "travel",
    description:
      "American raised checked-bag charges and further restricted its Basic Economy fare, making the headline ticket price cover less of an ordinary trip.",
    before:
      "Tickets bought before April 9 retained American's previous, lower checked-bag charges, and Basic Economy had fewer of the newly announced restrictions.",
    after:
      "For many tickets bought April 9 onward, the first checked bag costs $45 prepaid or $50 at the airport and the second costs $55 or $60. Additional Basic Economy restrictions began May 18.",
    impact:
      "Travelers carrying normal luggage pay more beyond the advertised fare, with the highest prices imposed at the airport and additional limitations concentrated in the cheapest fare class.",
    changedAt: "2026-04-09",
    images: [
      commonsLogo(
        "American_Airlines_wordmark_%282013%29.svg",
        "American Airlines logo",
      ),
    ],
    sources: [
      {
        url: "https://news.aa.com/news/news-details/2026/American-Airlines-updates-bag-fees-and-Basic-Economy-fares-OPS-POL-04/default.aspx",
        title: "American Airlines updates bag fees and Basic Economy fares",
        publisher: "American Airlines",
        publishedAt: "2026-04-09",
        type: "primary",
      },
    ],
  },
  {
    company: "Delta Air Lines",
    headline: "Your suitcase just hit an upgrade fee.",
    category: "travel",
    sector: "travel",
    description:
      "Delta raised checked-bag fees across most domestic and short-haul international itineraries, adding as much as $50 to a single bag charge.",
    before:
      "The common domestic prices were $35 for a first checked bag, $45 for a second, and $150 for a third.",
    after:
      "Beginning April 8, the first checked bag costs $45, the second $55, and the third $200 on affected itineraries.",
    impact:
      "A round trip with one checked bag now adds $90 beyond the displayed fare, while a third bag costs $50 more each way than it did previously.",
    changedAt: "2026-04-08",
    images: [commonsLogo("Delta_logo.svg", "Delta Air Lines logo")],
    sources: [
      {
        url: "https://apnews.com/article/delta-air-fuel-bag-fees-5c1c2d4214ce745b03890f47850b9dd6",
        title:
          "Delta raises checked baggage fees as the Iran war drives up jet fuel prices",
        publisher: "Associated Press",
        publishedAt: "2026-04-07",
        type: "reporting",
      },
      {
        url: "https://www.delta.com/us/en/baggage/checked-baggage/previous-baggage-fees",
        title: "Previous checked baggage fees",
        publisher: "Delta Air Lines",
        publishedAt: "2026-04-08",
        type: "primary",
      },
    ],
  },
  {
    company: "Spotify",
    headline: "Premium now comes with a premium-er price.",
    category: "entertainment",
    sector: "entertainment",
    description:
      "Spotify raised every major U.S. Premium plan in February, its latest increase in a recurring series of subscription price hikes.",
    before:
      "Premium cost $11.99 for Individual, $16.99 for Duo, $19.99 for Family, and $5.99 for Student each month.",
    after:
      "The monthly prices rose to $12.99 for Individual, $18.99 for Duo, $21.99 for Family, and $6.99 for Student.",
    impact:
      "Subscribers pay between $12 and $24 more per year for the same plan category, with Duo and Family customers absorbing the largest increases.",
    changedAt: "2026-02-01",
    images: [commonsLogo("2024_Spotify_Logo.svg", "Spotify logo")],
    sources: [
      {
        url: "https://newsroom.spotify.com/2026-01-15/premium-pricing-update/",
        title: "Upcoming Changes to Spotify Premium Subscriptions",
        publisher: "Spotify",
        publishedAt: "2026-01-15",
        type: "primary",
      },
      {
        url: "https://www.whathifi.com/streaming-entertainment/music-streaming/spotifys-us-prices-set-to-rise-again",
        title: "Spotify's US prices set to rise again",
        publisher: "What Hi-Fi?",
        publishedAt: "2026-01-20",
        type: "reporting",
      },
    ],
  },
  {
    company: "Netflix",
    headline: "The price plot thickens. Again.",
    category: "entertainment",
    sector: "entertainment",
    description:
      "Netflix raised the price of every U.S. streaming plan in March, including its ad-supported tier and extra-member add-ons.",
    before:
      "The U.S. plans cost $7.99 with ads, $17.99 for ad-free Standard, and $24.99 for Premium each month.",
    after:
      "On March 26, prices became $8.99 with ads, $19.99 for Standard, and $26.99 for Premium, with extra-member prices also increasing.",
    impact:
      "Every plan became more expensive, including the tier that already monetizes viewing with advertising.",
    changedAt: "2026-03-26",
    images: [commonsLogo("Netflix_2015_logo.svg", "Netflix logo")],
    sources: [
      {
        url: "https://techcrunch.com/2026/03/26/netflix-confirms-its-raising-prices-again/",
        title: "Netflix confirms it's raising prices again",
        publisher: "TechCrunch",
        publishedAt: "2026-03-26",
        type: "reporting",
      },
    ],
  },
  {
    company: "YouTube",
    headline: "Pay more to keep the ads away.",
    category: "entertainment",
    sector: "entertainment",
    description:
      "YouTube raised U.S. prices across Premium, Premium Lite, and YouTube Music, with the largest jump landing on families.",
    before:
      "YouTube Premium cost $13.99 per month for an individual and $22.99 for a family, while Premium Lite cost $7.99.",
    after:
      "The individual price rose to $15.99, the family price to $26.99, and Premium Lite to $8.99, with increases also reaching YouTube Music.",
    impact:
      "A family pays $48 more per year to retain Premium, while the cheaper Lite tier still excludes ad-free music videos and songs.",
    changedAt: "2026-04-10",
    images: [commonsLogo("YouTube_2024.svg", "YouTube logo")],
    sources: [
      {
        url: "https://techcrunch.com/2026/04/10/youtube-premium-youtube-music-subscription-price-increase/",
        title: "YouTube Premium and YouTube Music are getting more expensive",
        publisher: "TechCrunch",
        publishedAt: "2026-04-10",
        type: "reporting",
      },
    ],
  },
  {
    company: "Meta",
    headline: "Instagram photos became AI props—until people noticed.",
    category: "technology",
    sector: "technology",
    description:
      "Meta briefly let people reference public Instagram accounts when generating AI images, without notifying the people whose photos were used, then removed the feature after backlash.",
    before:
      "Posting photos publicly on Instagram did not give other users a built-in tool to summon that account as a reference for newly generated AI images.",
    after:
      "Muse Image rolled out with public adult accounts opted into an @-mention reference feature. Meta removed it roughly three days later after immediate criticism.",
    impact:
      "Public-account holders were placed into a new image-generation workflow by default and were not designed to receive notice when somebody referenced their photos.",
    changedAt: "2026-07-07",
    images: [
      commonsLogo("Meta_Platforms_Inc._logo.svg", "Meta Platforms logo"),
    ],
    outcome: "reversed",
    sources: [
      {
        url: "https://techcrunch.com/2026/07/10/meta-removes-controversial-ai-feature-on-instagram-after-backlash/",
        title: "Meta removes controversial AI feature on Instagram after backlash",
        publisher: "TechCrunch",
        publishedAt: "2026-07-10",
        type: "reporting",
      },
      {
        url: "https://www.wired.com/story/meta-now-lets-anyone-use-your-instagram-photos-in-ai-images-unless-you-opt-out/",
        title:
          "Meta Now Lets Anyone Use Your Instagram Photos in AI Images—Unless You Opt Out",
        publisher: "Wired",
        publishedAt: "2026-07-09",
        type: "reporting",
      },
    ],
  },
];

async function main() {
  if (process.env.ALLOW_EDITORIAL_IMPORT !== "true")
    throw new Error(
      "Set ALLOW_EDITORIAL_IMPORT=true to confirm this public-content import.",
    );
  const db = await getDb();
  const [current] = await db.query<{ id: number }>(
    "SELECT id FROM seasons ORDER BY id DESC LIMIT 1",
  );
  if (current?.id !== 2026)
    throw new Error("The current database season is not 2026; import stopped.");

  let added = 0;
  let updated = 0;
  let skipped = 0;
  await db.transaction(async (tx) => {
    for (const nominee of nominees) {
      const existing = await tx.query<{ id: string; images: unknown }>(
        "SELECT id,images FROM nominees WHERE season_id=2026 AND lower(company)=lower($1) AND headline=$2 LIMIT 1",
        [nominee.company, nominee.headline],
      );
      if (existing.length) {
        let currentImages = existing[0].images;
        if (typeof currentImages === "string") {
          try {
            currentImages = JSON.parse(currentImages);
          } catch {
            currentImages = [];
          }
        }
        if (Array.isArray(currentImages) && currentImages.length) {
          skipped += 1;
          continue;
        }
        await tx.query("UPDATE nominees SET images=$1::jsonb WHERE id=$2", [
          JSON.stringify(nominee.images),
          existing[0].id,
        ]);
        updated += 1;
        continue;
      }
      await tx.query(
        `INSERT INTO nominees(id,season_id,company,headline,description,before_state,after_state,impact,changed_at,category,sector,sources,images,outcome,verified)
         VALUES($1,2026,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,1)`,
        [
          randomUUID(),
          nominee.company,
          nominee.headline,
          nominee.description,
          nominee.before,
          nominee.after,
          nominee.impact,
          nominee.changedAt,
          nominee.category,
          nominee.sector,
          JSON.stringify(nominee.sources),
          JSON.stringify(nominee.images),
          nominee.outcome ?? "ongoing",
        ],
      );
      added += 1;
    }
  });
  console.log(
    `Added ${added} verified 2026 nominees; updated ${updated} empty galleries; skipped ${skipped} existing galleries.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
