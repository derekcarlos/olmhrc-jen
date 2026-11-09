import { readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import {
  reconcileSnapshot,
  validateSnapshot,
  sameReadingContent,
} from "./readings.mjs";

export const readingsConfig = JSON.parse(
  readFileSync(resolve("src/config/readings.json"), "utf8"),
);
export const snapshotPath = resolve("src/data/readings/snapshot.json");
export function readSnapshot() {
  let raw;
  try {
    raw = readFileSync(snapshotPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  const value = JSON.parse(raw);
  if (!validateSnapshot(value))
    throw new Error(
      "Saved readings snapshot is invalid; run pnpm readings:sync to recover it.",
    );
  return value;
}
export function writeSnapshot(snapshot) {
  if (!validateSnapshot(snapshot))
    throw new Error("Refusing to save invalid readings snapshot");
  if (sameReadingContent(readSnapshot(), snapshot)) return false;
  mkdirSync(dirname(snapshotPath), { recursive: true });
  writeFileSync(
    `${snapshotPath}.tmp`,
    `${JSON.stringify(snapshot, null, 2)}\n`,
  );
  renameSync(`${snapshotPath}.tmp`, snapshotPath);
  return true;
}
export function getReadingSnapshot() {
  const saved = readSnapshot();
  if (saved?.mode === "next-celebration") return saved;
  const current = reconcileSnapshot(
    saved,
    [],
    readingsConfig.mode,
    new Date(),
    saved?.errors || [],
  );
  // Building a page is not a source retrieval attempt.
  if (saved) current.last_attempt = saved.last_attempt;
  return current;
}
