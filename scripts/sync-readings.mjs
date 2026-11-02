import { readFileSync, appendFileSync } from "node:fs";
import {
  readSnapshot,
  writeSnapshot,
  readingsConfig,
} from "../src/lib/readings-store.mjs";
import { reconcileSnapshot, validateSnapshot } from "../src/lib/readings.mjs";
import { refreshReadings } from "../src/lib/readings-sync.mjs";

const args = new Set(process.argv.slice(2));
const disabled = args.has("--disabled");
const refresh = args.has("--refresh");
const modeArg = process.argv
  .find((a) => a.startsWith("--mode="))
  ?.split("=")[1];
const mode = modeArg || readingsConfig.mode;
const now = new Date();
let previous = disabled ? null : readSnapshot();

if (!disabled && !previous && args.has("--published")) {
  const config = JSON.parse(
    readFileSync(new URL("../src/config/config.json", import.meta.url), "utf8"),
  );
  const origin = new URL(config.site.base_url);
  if (origin.protocol !== "https:")
    throw new Error(
      "Published readings recovery requires the configured HTTPS production URL",
    );
  const base = `${config.site.base_path.replace(/\/$/, "")}/readings-data/index.json`;
  const response = await fetch(new URL(base, origin), {
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (response.ok) {
    previous = await response.json();
    if (!validateSnapshot(previous))
      throw new Error(
        "Published readings snapshot is invalid; deployment stopped.",
      );
  } else if (response.status !== 404)
    throw new Error(`Published readings recovery failed (${response.status})`);
}

const snapshot =
  !disabled && refresh
    ? await refreshReadings(previous, mode, now)
    : reconcileSnapshot(previous, [], mode, now, previous?.errors || []);
if (!refresh && previous) snapshot.last_attempt = previous.last_attempt;
writeSnapshot(snapshot);
const summary = `Readings: ${snapshot.records.length}/${snapshot.dates.length} available; mode ${mode}; dates ${snapshot.dates.join(", ")}.`;
console.log(summary);
for (const error of snapshot.errors)
  console.warn(`${error.date}: ${error.message}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `## Filipino readings\n\n${summary}\n\n${disabled ? "Production importing is disabled." : refresh ? "Source retrieval attempted; see per-date results in the log." : "Reused the published snapshot without a new provider request."}\n`,
  );
}
