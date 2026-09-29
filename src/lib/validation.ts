import { z } from "zod";
import { categories, sourceTypes } from "./constants";
const source = z
  .string()
  .trim()
  .max(2000)
  .url()
  .refine((v) => /^https?:\/\//i.test(v), "Use an HTTP or HTTPS link.");
const imageUrl = z
  .string()
  .trim()
  .max(2000)
  .url()
  .refine((v) => /^https:\/\//i.test(v), "Use an HTTPS image link.");
const image = z.object({
  kind: z.enum(["upload", "external"]),
  url: imageUrl,
  alt: z.string().trim().min(5).max(300),
  fit: z.enum(["cover", "contain"]).optional(),
});
const nominationSource = z.object({
  url: source,
  title: z.string().trim().min(4).max(200),
  publisher: z.string().trim().min(2).max(100),
  publishedAt: z.iso.date(),
  type: z.enum(sourceTypes.map((item) => item.id)),
});
export const nominationInput = z.object({
  company: z.string().trim().min(2).max(100),
  headline: z.string().trim().min(8).max(140),
  description: z.string().trim().min(30).max(1000),
  before: z.string().trim().min(20).max(1500),
  after: z.string().trim().min(20).max(1500),
  impact: z.string().trim().min(20).max(1500),
  changedAt: z.iso.date(),
  category: z.enum(categories.map((c) => c.id)),
  sector: z.enum(categories.map((item) => item.id)).optional(),
  sources: z.array(nominationSource).min(1).max(3),
  images: z.array(image).max(3).default([]),
  website: z.string().max(0).optional(),
});
export function winners<T extends { count: number; category: string }>(
  items: T[],
) {
  const top = (rows: T[]) =>
    rows.length
      ? rows.filter((r) => r.count === Math.max(...rows.map((x) => x.count)))
      : [];
  return {
    overall: top(items),
    categories: Object.fromEntries(
      categories.map((c) => [
        c.id,
        top(items.filter((n) => n.category === c.id)),
      ]),
    ),
  };
}
