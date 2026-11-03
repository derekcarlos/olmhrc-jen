import { z } from "astro/zod";

export const selectionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().trim().min(1),
    date: z.union([z.literal(""), z.iso.date()]),
    celebration: z.string().trim().min(1),
    status: z.enum(["draft", "published"]),
    readiness: z.enum(["preliminary", "confirmed"]).default("preliminary"),
    notes: z.string().default(""),
    items: z.array(
      z.object({
        part: z.string(),
        song: z.string().nullable(),
        used: z.boolean().default(true),
      }),
    ),
  })
  .superRefine((selection, ctx) => {
    if (selection.status === "published" && !selection.date)
      ctx.addIssue({
        code: "custom",
        path: ["date"],
        message: "A published selection needs a celebration date",
      });
  });

/** @param {unknown} data @param {string[]} partIds @param {Set<string>} songIds */
export function parseSelections(data, partIds, songIds) {
  const selections = z.array(selectionSchema).parse(data);
  const ids = new Set();
  for (const selection of selections) {
    if (ids.has(selection.id))
      throw new Error(`Duplicate selection: ${selection.id}`);
    ids.add(selection.id);
    const parts = new Set();
    for (const item of selection.items) {
      if (!partIds.includes(item.part))
        throw new Error(`Unknown Mass part ${item.part} in ${selection.id}`);
      if (parts.has(item.part))
        throw new Error(`Duplicate Mass part in ${selection.id}`);
      parts.add(item.part);
      if (
        selection.status === "published" &&
        item.used &&
        item.song &&
        !songIds.has(item.song)
      )
        throw new Error(
          `Selection ${selection.id} references a missing or draft song: ${item.song}`,
        );
    }
  }
  return selections.filter((selection) => selection.status === "published");
}
