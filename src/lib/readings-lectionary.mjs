// Server/build-only: builds snapshot records from src/data/readings/lectionary/
// instead of downloading them. Same result shape as fetchReading().
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { lectionaryKeyForDate } from "./lectionary-keys.mjs";
import { validRecord } from "./readings.mjs";

const collections = new Map();
function lectionaryEntry({ collection, key }) {
  if (!collections.has(collection))
    collections.set(
      collection,
      JSON.parse(
        readFileSync(
          resolve(`src/data/readings/lectionary/${collection}.json`),
          "utf8",
        ),
      ).entries,
    );
  return collections.get(collection)[key];
}

// The snapshot holds one reading per type; keep the main options only.
// The last acclamation and gospel are used: a Sequence precedes the Alleluia,
// and Palm Sunday's procession gospel precedes the Passion.
function snapshotSections(sections) {
  const main = sections.filter((s) => !s.alternative);
  const pick = (type, last) =>
    (last ? main.findLast : main.find).call(main, (s) => s.type === type);
  return [
    pick("first"),
    pick("psalm"),
    pick("second"),
    pick("acclamation", true),
    pick("gospel", true),
  ]
    .filter(Boolean)
    .map(({ type, heading, reference, blocks }) => ({
      type,
      heading,
      reference,
      blocks,
    }));
}

// Gaps in the lectionary behave like a 404 from the source: the date is
// reported unavailable without failing the rest of the window.
const gap = (date, message) => ({
  date,
  record: null,
  unavailable: true,
  message,
});

export async function lectionaryReading(day, now = new Date()) {
  try {
    const location = await lectionaryKeyForDate(day);
    const found = [location, location.fallback]
      .filter(Boolean)
      .map((l) => ({ ...l, entry: lectionaryEntry(l) }))
      .find((l) => l.entry);
    if (!found)
      return gap(
        day,
        `Wala pa sa lectionary: ${location.collection}/${location.key}.`,
      );
    const mass =
      found.entry.masses.find((m) => !m.vigil) || found.entry.masses[0];
    if (found.entry.masses[0].sections.some((s) => s.type === "seventh"))
      return gap(day, "Easter Vigil readings do not fit the snapshot format.");
    const label = mass.label.replace(/\s*\([^)]*\)\s*$/, "").trim();
    const record = {
      date: day,
      // Days with several masses label only the mass ("Mass During the Day").
      celebration:
        (found.entry.masses.length > 1 && label
          ? `${found.entry.name} — ${label}`
          : label) ||
        mass.celebration ||
        found.entry.name,
      language: "fil",
      source_url: mass.source_url,
      retrieved_at: now.toISOString(),
      origin: "lectionary",
      lectionary_key: `${found.collection}/${found.key}`,
      source_date: mass.source_date,
      sections: snapshotSections(mass.sections),
    };
    if (!validRecord(record))
      return gap(
        day,
        `Incomplete lectionary entry ${record.lectionary_key} (${record.sections.map((s) => s.type).join(", ")}).`,
      );
    return { date: day, record, message: "" };
  } catch (error) {
    return {
      date: day,
      record: null,
      message:
        error instanceof Error ? error.message : "Lectionary lookup failed",
    };
  }
}
