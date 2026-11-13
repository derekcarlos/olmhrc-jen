import { z } from "astro/zod";
import type { CollectionEntry } from "astro:content";
import { getSinglePage } from "@/lib/contentParser.astro";
import selectionsData from "@/config/song-selections.json";
import practiceData from "@/config/choir-practice.json";
import { parseChoirPractice } from "./choir-practice.mjs";
import { massParts } from "@/lib/mass-parts";

import { selectionSchema, parseSelections } from "./selection-catalog.mjs";
import { manilaToday } from "./calendar.mjs";
export type SongSelection = z.infer<typeof selectionSchema>;

export function selectionSongTracks(
  selection: SongSelection | null,
  songMap: Map<string, CollectionEntry<"songs">>,
) {
  const seen = new Set<string>();
  return massParts.flatMap((part) => {
    const item = selection?.items.find((item) => item.part === part.id);
    const song = item?.used && item.song ? songMap.get(item.song) : undefined;
    if (!song || seen.has(song.id)) return [];
    seen.add(song.id);
    return [{ id: song.id, title: song.data.title, part: part.label }];
  });
}

export function defaultSongSelection(
  selections: SongSelection[],
  songId: string,
) {
  const matches = selections.filter((s) =>
    s.items.some((item) => item.used && item.song === songId),
  );
  const today = manilaToday();
  return (
    matches
      .filter((s) => s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ||
    matches.sort((a, b) => b.date.localeCompare(a.date))[0] ||
    null
  );
}

export async function getChoirLibrary() {
  const songs = (await getSinglePage("songs")).sort((a, b) =>
    a.data.title.localeCompare(b.data.title),
  );
  const songMap = new Map(songs.map((song) => [song.id, song]));
  for (const song of songs) {
    if (["mass", "marian", "selections", "practice"].includes(song.id))
      throw new Error(`Reserved song filename: ${song.id}`);
  }
  const selections = parseSelections(
    selectionsData,
    massParts.map((part) => part.id),
    new Set(songMap.keys()),
  );
  return { songs, songMap, selections };
}

export async function getChoirPractice() {
  const { songMap } = await getChoirLibrary();
  const list = parseChoirPractice(practiceData, new Set(songMap.keys()));
  const entries = list.items.map(item => ({ ...item, entry: songMap.get(item.song)! }));
  return { list, entries };
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
