import { z } from "astro/zod";
import { getSinglePage } from "@/lib/contentParser.astro";
import selectionsData from "@/config/song-selections.json";
import { massParts } from "@/lib/mass-parts";

const selectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string(),
  date: z.union([z.literal(""), z.iso.date()]),
  celebration: z.string(),
  status: z.enum(["upcoming", "archived"]),
  notes: z.string().default(""),
  items: z.array(
    z.object({
      part: z
        .string()
        .refine(
          (id) => massParts.some((part) => part.id === id),
          "Unknown Mass part",
        ),
      song: z.string().nullable(),
      used: z.boolean().default(true),
    }),
  ),
});
export type SongSelection = z.infer<typeof selectionSchema>;

export async function getChoirLibrary() {
  const songs = (await getSinglePage("songs")).sort((a, b) =>
    a.data.title.localeCompare(b.data.title),
  );
  const selections = z.array(selectionSchema).parse(selectionsData);
  const ids = new Set<string>();
  const songMap = new Map(songs.map((song) => [song.id, song]));
  for (const song of songs) {
    if (["mass", "marian", "selections"].includes(song.id))
      throw new Error(`Reserved song filename: ${song.id}`);
  }
  for (const selection of selections) {
    if (ids.has(selection.id))
      throw new Error(`Duplicate selection: ${selection.id}`);
    ids.add(selection.id);
    if (
      new Set(selection.items.map((item) => item.part)).size !==
      selection.items.length
    )
      throw new Error(`Duplicate Mass part in ${selection.id}`);
    for (const item of selection.items) {
      if (item.used && item.song && !songMap.has(item.song))
        throw new Error(
          `Selection ${selection.id} references a missing or draft song: ${item.song}`,
        );
    }
  }
  if (
    selections.filter((selection) => selection.status === "upcoming").length > 1
  )
    throw new Error("Only one choir selection can be upcoming");
  return { songs, songMap, selections };
}

export function selectionDate(date: string) {
  if (!date) return "Date to be confirmed";
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(`${date}T00:00:00+08:00`));
}
