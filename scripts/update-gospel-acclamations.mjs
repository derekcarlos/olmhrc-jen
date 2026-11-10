import { mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAcclamationCalendar } from "../src/lib/gospel-acclamations.mjs";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log("bash scripts/update-gospel-acclamations.sh [--from=YYYY-MM-DD] [--days=30] [--dry-run] [--output=path]\nPrepares dated local Gospel Acclamation verses. No downloads, song rewrites, readings snapshot changes, scheduling, commits, or pushes.");
  process.exit(0);
}
const unknown = args.find(arg => arg !== "--dry-run" && !/^--(?:from|days|output)=.+$/.test(arg));
if (unknown) throw new Error(`Unknown option: ${unknown}`);
const option = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const output = resolve(option("output") || "src/data/gospel-acclamations.json");
const lock = `${output}.lock`;
let locked = false;
try {
  mkdirSync(dirname(output), { recursive: true });
  mkdirSync(lock); locked = true;
  const data = await buildAcclamationCalendar({ from: option("from"), days: option("days") === undefined ? 30 : Number(option("days")) });
  const available = data.records.filter(r => r.status === "available").length;
  if (!available) throw new Error("No verses available; the previous file was not changed");
  const content = `${JSON.stringify(data, null, 2)}\n`;
  const unchanged = existsSync(output) && readFileSync(output, "utf8") === content;
  console.log(`${data.from} through ${data.through}: ${available}/${data.records.length} verses available.`);
  for (const record of data.records.filter(r => r.status !== "available"))
    console.warn(`${record.date}: ${record.message} (${record.lectionary_key})`);
  if (args.includes("--dry-run")) console.log(unchanged ? "Dry run: unchanged." : "Dry run: dated verses would change.");
  else if (unchanged) console.log("Unchanged; keeping the saved dated verses.");
  else {
    writeFileSync(`${output}.tmp`, content);
    renameSync(`${output}.tmp`, output);
    console.log(`Updated ${output}. Review and publish through your usual Git process.`);
  }
} catch (error) {
  console.error(`Gospel Acclamation update failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (locked) { rmSync(`${output}.tmp`, { force: true }); rmSync(lock, { recursive: true, force: true }); }
}
