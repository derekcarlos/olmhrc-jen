import {
  readSnapshot,
  getReadingSnapshot,
} from "../src/lib/readings-store.mjs";
const saved = readSnapshot();
if (!saved)
  throw new Error(
    "Committed readings snapshot is missing. Run pnpm readings:sync locally, validate, commit and push it.",
  );
const active = getReadingSnapshot();
console.log(
  `Committed readings snapshot is valid; ${active.records.length}/${active.dates.length} active dates available.`,
);
if (!active.records.length)
  console.warn(
    "The committed snapshot has expired; run the local readings publication job.",
  );
