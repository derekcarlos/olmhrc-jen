import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const parts = [
  "processional",
  "penitential-rite",
  "gloria",
  "gospel-acclamation",
  "offertory",
  "sanctus",
  "memorial-acclamation",
  "great-amen",
  "pater-noster",
  "doxology",
  "agnus-dei",
  "communion",
  "recessional",
];
const page = (path) => readFileSync(`dist/${path}/index.html`, "utf8");
const hub = page("songs");
assert(
  hub.includes("Upcoming Sunday Mass"),
  "Sunday selection must appear first",
);
const orderedLinks = [
  ...hub.matchAll(/href="\/songs\/([^"/]+-placeholder)"/g),
].map((match) => match[1]);
assert.deepEqual(
  orderedLinks,
  parts.map((part) => `${part}-placeholder`),
);
for (const path of [
  "songs/mass",
  "songs/marian",
  "songs/selections",
  "songs/selections/upcoming-sunday",
]) {
  assert(existsSync(`dist/${path}/index.html`), path);
}
for (const slug of [...parts, "marian-1", "marian-2"]) {
  const song = page(`songs/${slug}-placeholder`);
  assert(song.includes("Practice recording coming soon."), slug);
  assert(song.includes("Verse 1") && song.includes("Refrain"), slug);
  assert(
    !song.includes("<audio"),
    "No fake audio player for an empty recording",
  );
  assert(song.includes('href="/songs"'), "Return link");
}
assert(page("songs/mass").includes("Filter by Mass part"));
assert(page("songs/mass").includes("Search songs"));
assert(page("songs/marian").includes("marian-1-placeholder"));
assert(!page("songs/marian").includes("processional-placeholder"));
assert(page("songs/selections").includes("No previous selections yet"));
console.log(
  "PASS: Sunday-first hub, exact 13-part order, 15 lyric pages, repertoire routes, filter markup, empty audio and archive.",
);
