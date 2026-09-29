export const categories = [
  { id: "technology", name: "Technology" },
  { id: "travel", name: "Travel" },
  { id: "food-drink", name: "Food & drink" },
  { id: "fast-food", name: "Fast food" },
  { id: "entertainment", name: "Entertainment" },
  { id: "entertainment-franchise", name: "Entertainment franchise" },
  { id: "film-studio", name: "Film studio" },
  { id: "retail", name: "Retail" },
  { id: "finance", name: "Finance" },
  { id: "public-services", name: "Public services" },
  { id: "other", name: "Other" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export const category = (id: string | null) =>
  categories.find((item) => item.id === id) ?? categories[categories.length - 1];

export function categoryId(
  id: string | null,
  legacySector: string | null = null,
): CategoryId {
  return (
    categories.find((item) => item.id === id) ??
    categories.find((item) => item.id === legacySector) ??
    categories[categories.length - 1]
  ).id;
}

// Kept as aliases while the legacy database column still exists.
export const sectors = categories;
export const sector = category;

export const sourceTypes = [
  { id: "primary", name: "Official announcement" },
  { id: "regulator", name: "Regulator or public record" },
  { id: "reporting", name: "Independent reporting" },
  { id: "community", name: "Community evidence" },
] as const;
export const sourceType = (id: string) =>
  sourceTypes.find((item) => item.id === id) ?? sourceTypes[2];

export const outcomes = [
  { id: "ongoing", name: "Ongoing" },
  { id: "partial", name: "Partially fixed" },
  { id: "reversed", name: "Reversed" },
  { id: "settled", name: "Settled" },
] as const;
export const outcome = (id: string) =>
  outcomes.find((item) => item.id === id) ?? outcomes[0];

export type NomineeSource = {
  url: string;
  title: string;
  publisher: string;
  publishedAt: string;
  type: (typeof sourceTypes)[number]["id"];
};
export type NomineeImage = {
  kind: "upload" | "external";
  url: string;
  alt: string;
  fit?: "cover" | "contain";
};
export type Nominee = {
  id: string;
  seasonId: number;
  company: string;
  headline: string;
  description: string;
  before: string | null;
  after: string | null;
  impact: string | null;
  changedAt: string | null;
  category: string;
  sector: string | null;
  sources: NomineeSource[];
  images: NomineeImage[];
  status: string;
  outcome: (typeof outcomes)[number]["id"];
  verified: boolean;
  duplicateOf: string | null;
  createdAt: string;
  count: number;
  voted: boolean;
};
export type Season = {
  id: number;
  closesAt: string;
  finalizedAt: string | null;
};
