import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  rmSync,
  existsSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCelebrationSnapshot } from "../src/lib/readings-celebrations.mjs";
import {
  sameReadingContent,
  validDate,
  validateSnapshot,
} from "../src/lib/readings.mjs";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(
    "Offline Sundays, solemnities, Ash Wednesday and Holy Week: bash scripts/update-liturgical-readings.sh [--dry-run] [--as-of=YYYY-MM-DD] [--output=path]\nUpdates the local snapshot only. No downloads, commits, pushes, or scheduler installation.",
  );
  process.exit(0);
}
const unknown = args.find(
  (arg) => arg !== "--dry-run" && !/^--(?:as-of|output)=.+$/.test(arg),
);
if (unknown) throw new Error(`Unknown option: ${unknown}`);
const asOf = args.find((arg) => arg.startsWith("--as-of="))?.slice(8);
if (asOf && !validDate(asOf))
  throw new Error("--as-of must be a valid YYYY-MM-DD Manila calendar date");
const now = asOf ? new Date(`${asOf}T04:00:00Z`) : new Date();
const output = resolve(
  args.find((arg) => arg.startsWith("--output="))?.slice(9) ||
    "src/data/readings/snapshot.json",
);
const lock =
  output === resolve("src/data/readings/snapshot.json")
    ? resolve(".astro/readings-publish.lock")
    : `${output}.lock`;
let locked = false;
try {
  mkdirSync(dirname(lock), { recursive: true });
  try {
    mkdirSync(lock);
    locked = true;
  } catch (error) {
    if (error.code === "EEXIST")
      throw new Error(
        "Another readings job is running; the snapshot was not changed.",
      );
    throw error;
  }
  writeFileSync(
    resolve(lock, "owner.json"),
    JSON.stringify({
      pid: process.pid,
      job: "offline-next-celebration",
      started: new Date().toISOString(),
    }),
  );
  const previous = existsSync(output)
    ? JSON.parse(readFileSync(output, "utf8"))
    : null;
  const config = JSON.parse(
    readFileSync(resolve("src/config/readings.json"), "utf8"),
  );
  if (
    config.mode !== "next-celebration" &&
    output === resolve("src/data/readings/snapshot.json")
  )
    throw new Error(
      "Set src/config/readings.json mode to next-celebration for this job",
    );
  if (previous && !validateSnapshot(previous))
    throw new Error(
      "Existing snapshot is invalid; repair or restore it before running this job",
    );
  const next = await buildCelebrationSnapshot({ now });
  const changed = !sameReadingContent(previous, next);
  const record = next.records[0];
  console.log(
    `${record.date} · ${record.celebration}\n${record.lectionary_key}\nSource: ${record.source_url} (${record.source_date})\nSections: ${record.sections.map((s) => s.type).join(", ")}`,
  );
  if (args.includes("--dry-run"))
    console.log(
      changed
        ? "Dry run: snapshot would change."
        : "Dry run: snapshot content is unchanged.",
    );
  else if (!changed)
    console.log("Unchanged; preserving the saved snapshot and timestamps.");
  else {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(`${output}.tmp`, `${JSON.stringify(next, null, 2)}\n`);
    renameSync(`${output}.tmp`, output);
    console.log(`Updated ${output}.`);
  }
} catch (error) {
  console.error(`Liturgical readings update failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (locked) rmSync(lock, { recursive: true, force: true });
}
