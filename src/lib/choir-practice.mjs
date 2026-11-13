import { z } from "astro/zod";
export { choirPracticePath } from "./song-practice.mjs";

const schema = z.object({
  title: z.string().trim().min(1),
  notes: z.string().default(""),
  items: z.array(z.object({
    song: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    note: z.string().default(""),
  })),
});

/** @param {unknown} data @param {Set<string>} songIds */
export function parseChoirPractice(data, songIds) {
  const list = schema.parse(data);
  const seen = new Set();
  for (const item of list.items) {
    if (seen.has(item.song)) throw new Error(`Duplicate practice song: ${item.song}`);
    if (!songIds.has(item.song)) throw new Error(`Practice list references a missing or draft song: ${item.song}`);
    seen.add(item.song);
  }
  return list;
}

