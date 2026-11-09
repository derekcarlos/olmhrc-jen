import {
  readSnapshot,
  writeSnapshot,
  readingsConfig,
} from "../src/lib/readings-store.mjs";
import { refreshReadings } from "../src/lib/readings-sync.mjs";
import { lectionaryReading } from "../src/lib/readings-lectionary.mjs";

if (process.argv.some((arg) => ["--published", "--disabled"].includes(arg)))
  throw new Error(
    "Readings are now downloaded locally into a tracked snapshot. GitHub deployment must not run the downloader.",
  );
const mode =
  process.argv.find((arg) => arg.startsWith("--mode="))?.split("=")[1] ||
  readingsConfig.mode;
if (mode === "next-celebration" || readingsConfig.mode === "next-celebration")
  throw new Error(
    "Use pnpm readings:update for the celebration reader. The legacy downloader cannot preserve multiple Masses, repeated readings, or alternatives; the snapshot was not changed.",
  );
// --from-lectionary fills the snapshot from src/data/readings/lectionary/
// instead of downloading from Awit at Papuri.
const fromLectionary = process.argv.includes("--from-lectionary");
const previous = readSnapshot();
const snapshot = await refreshReadings(
  previous,
  mode,
  new Date(),
  fromLectionary ? lectionaryReading : undefined,
);
const failures = snapshot.errors.filter((error) => error.kind === "error");
if (failures.length)
  throw new Error(
    `Readings download failed; saved data was not changed: ${failures.map((error) => `${error.date}: ${error.message}`).join("; ")}`,
  );
if (!snapshot.records.length)
  throw new Error(
    "No readings available for the active window; saved data was not changed.",
  );
const changed = writeSnapshot(snapshot);
console.log(
  `Readings${fromLectionary ? " (from lectionary)" : ""}: ${snapshot.records.length}/${snapshot.dates.length} available; mode ${mode}; dates ${snapshot.dates.join(", ")}.`,
);
console.log(
  changed
    ? "Saved src/data/readings/snapshot.json."
    : "Content is unchanged; keeping the published snapshot and its timestamps.",
);
for (const error of snapshot.errors)
  console.warn(`${error.date}: ${error.message}`);
