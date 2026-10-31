import test from "node:test";
import assert from "node:assert/strict";
import { matchesSong } from "../src/lib/song-filter.mjs";

const song = {
  title: "Áma Namin",
  composer: "Choir Composer",
  arranger: "",
  language: "Tagalog",
  mass_parts: ["pater-noster"],
  seasons: ["Ordinary Time"],
  occasions: [],
};
test("search finds title, composer and language, ignoring case and accents", () => {
  assert(matchesSong(song, { query: "AMA tagalog composer" }));
  assert(!matchesSong(song, { query: "Gloria" }));
});
test("part, season and occasion combine with the text query", () => {
  assert(
    matchesSong(song, {
      query: "namin",
      part: "pater-noster",
      season: "Ordinary Time",
      occasion: "__untagged",
    }),
  );
  assert(!matchesSong(song, { part: "gloria" }));
  assert(!matchesSong(song, { season: "Lent" }));
  assert(!matchesSong(song, { occasion: "All Saints" }));
});
test("blank filters reset the library and untagged filters identify empty metadata", () => {
  assert(matchesSong(song, { query: "   " }));
  assert(!matchesSong(song, { season: "__untagged" }));
  assert(matchesSong({ ...song, seasons: [] }, { season: "__untagged" }));
});
