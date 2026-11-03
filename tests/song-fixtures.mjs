import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";

const selectionPath = "src/config/song-selections.json";
const published = "src/content/songs/verify-practice-song.md";
const draft = "src/content/songs/verify-draft-song.md";
const audioPath = "public/audio/verify-practice.wav";
const read = (path) => readFileSync(`dist/${path}/index.html`, "utf8");
const mode = process.argv[2];

if (mode === "create") {
  for (const path of [published, draft, audioPath])
    assert(!existsSync(path), `Refusing to overwrite ${path}`);
  const selections = JSON.parse(readFileSync(selectionPath));
  assert(!selections.some((item) => item.id === "verify-archived"));
  writeFileSync(
    published,
    '---\ntitle: "Verification practice song"\ndescription: "Temporary verification only"\ncomposer: "Verification composer"\nlanguage: "Tagalog"\nmass_parts: ["processional"]\nseasons: ["Ordinary Time"]\noccasions: ["All Saints"]\naudio: "/audio/verify-practice.wav"\naudio_credit: "Verification recording"\ndraft: false\n---\n\nTest lyrics.\n',
  );
  writeFileSync(
    draft,
    '---\ntitle: "Hidden verification song"\ndescription: "Temporary draft"\ndraft: true\n---\n\nHidden lyrics.\n',
  );
  // A short silent WAV verifies audio wiring without adding a real recording.
  mkdirSync("public/audio", { recursive: true });
  const wav = Buffer.alloc(44 + 1600);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(1600, 40);
  writeFileSync(audioPath, wav);
  selections.push({
    id: "verify-archived",
    title: "Verification archived selection",
    date: "2026-10-25",
    celebration: "Verification only",
    status: "published",
    readiness: "confirmed",
    items: [
      { part: "processional", song: "verify-practice-song", used: true },
      { part: "gloria", song: null, used: false },
    ],
  });
  writeFileSync(selectionPath, JSON.stringify(selections, null, 2) + "\n");
  console.log("Created temporary audio, archive and draft fixtures.");
} else if (mode === "verify") {
  const song = read("songs/verify-practice-song");
  for (const value of [
    "<audio",
    'preload="none"',
    'src="/audio/verify-practice.wav"',
    "Playback speed",
    "Repeat recording",
    "Verification recording",
  ])
    assert(song.includes(value), value);
  assert(!/<audio[^>]*\bautoplay/.test(song));
  assert(existsSync("dist/audio/verify-practice.wav"));
  assert(!existsSync("dist/songs/verify-draft-song/index.html"));
  assert(!read("songs/mass").includes("verify-draft-song"));
  assert(read("songs/mass").includes("All Saints"));
  assert(read("songs/selections").includes("verify-archived"));
  const selection = read("songs/selections/verify-archived");
  assert(
    selection.includes("Not used for this celebration") &&
      selection.includes("Song to be chosen"),
  );
  console.log(
    "PASS: real audio markup, speed/repeat controls, audio asset, archive, metadata filters, unused/unselected slots and hidden drafts.",
  );
} else if (mode === "clean") {
  for (const path of [published, draft, audioPath])
    rmSync(path, { force: true });
  const selections = JSON.parse(readFileSync(selectionPath)).filter(
    (item) => item.id !== "verify-archived",
  );
  writeFileSync(selectionPath, JSON.stringify(selections, null, 2) + "\n");
  console.log("Removed temporary song fixtures.");
} else throw new Error("Use create, verify or clean");
