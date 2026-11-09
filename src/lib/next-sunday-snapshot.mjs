// Offline, next-Sunday-only resolver. Calendar precedence comes from Romcal's
// Philippine primary celebration, not the Calendar page's filtered markers.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dayChoices, lectionaryKey } from "./lectionary-keys.mjs";
import {
  sundayDate,
  validDate,
  validRecord,
  validateSnapshot,
} from "./readings.mjs";

function localEntry(collection, key) {
  const path = resolve(`src/data/readings/lectionary/${collection}.json`);
  const data = JSON.parse(readFileSync(path, "utf8"));
  if (
    data.schema_version !== 1 ||
    data.collection !== collection ||
    !data.entries ||
    typeof data.entries !== "object"
  )
    throw new Error(`Invalid lectionary collection: ${collection}`);
  return data.entries[key];
}

/** Select the main (normally long) readings, preserving supplied liturgical
 * elements. Never turn an unrepresentable liturgy into an incomplete snapshot.
 */
export function sundaySections(sections) {
  if (!Array.isArray(sections)) throw new Error("Missing reading sections");
  const main = sections.filter((section) => !section.alternative);
  const supported = new Set([
    "first",
    "psalm",
    "second",
    "acclamation",
    "gospel",
  ]);
  if (main.some((section) => !supported.has(section.type)))
    throw new Error(
      "This liturgy needs a fuller reader; extra readings cannot be discarded",
    );
  const all = (type) => main.filter((s) => s.type === type);
  for (const type of ["first", "psalm", "second"])
    if (all(type).length !== 1)
      throw new Error(`Sunday needs exactly one main ${type} section`);
  const gospels = all("gospel");
  const acclamations = all("acclamation");
  if (gospels.length < 1 || gospels.length > 2 || !acclamations.length)
    throw new Error("Incomplete or ambiguous Sunday Gospel/acclamation");
  const firstIndex = main.findIndex((s) => s.type === "first");
  if (gospels.length === 2 && main.indexOf(gospels[0]) > firstIndex)
    throw new Error("Multiple main Gospels need editorial selection");
  const copy = (section, type = section.type) => ({
    type,
    heading: section.heading,
    reference: section.reference,
    blocks: structuredClone(section.blocks),
  });
  const result = [
    ...(gospels.length === 2 ? [copy(gospels[0], "procession")] : []),
    copy(all("first")[0]),
    copy(all("psalm")[0]),
    copy(all("second")[0]),
    ...(acclamations.length > 1
      ? [
          {
            type: "sequence",
            heading: "SEKWENSIYA",
            reference: "",
            blocks: acclamations
              .slice(0, -1)
              .flatMap((s) => structuredClone(s.blocks)),
          },
        ]
      : []),
    copy(acclamations.at(-1)),
    copy(gospels.at(-1)),
  ];
  for (const section of result) {
    if (
      !Array.isArray(section.blocks) ||
      !section.blocks.length ||
      section.blocks.some(
        (b) =>
          typeof b.text !== "string" ||
          !b.text.trim() ||
          /\[(?:[^\]]*)(?:to be added|scan ends|missing verses)/i.test(b.text),
      )
    )
      throw new Error(`Incomplete ${section.type} text`);
    if (["first", "second", "gospel", "procession"].includes(section.type)) {
      const closing = ["gospel", "procession"].includes(section.type)
        ? "Ang Mabuting Balita ng Panginoon."
        : "Ang Salita ng Diyos.";
      if (!section.blocks.some((b) => b.text.includes(closing)))
        throw new Error(`Incomplete ${section.type}: closing formula missing`);
    }
  }
  return result;
}

function chooseMass(entry, key) {
  if (!Array.isArray(entry.masses) || !entry.masses.length)
    throw new Error("Reading entry has no Masses");
  const masses = entry.masses.filter(
    (mass) => !mass.vigil && !/\bvigil\b|bisperas/i.test(mass.label || ""),
  );
  if (!masses.length)
    throw new Error(
      "Only vigil readings are saved; a daytime Sunday Mass is required",
    );
  if (key === "nativity_of_the_lord") {
    const day = masses.find((mass) =>
      /(?:during the day|misa sa araw)/i.test(mass.label || ""),
    );
    if (!day) throw new Error("Christmas Mass During the Day is missing");
    return day;
  }
  // First saved daytime set is a permitted default (e.g. All Souls).
  return masses[0];
}

/** @param {{now?: Date, readEntry?: (collection: string, key: string) => any}} options */
export async function buildSundaySnapshot({
  now = new Date(),
  readEntry = localEntry,
} = {}) {
  const date = sundayDate(now);
  const primary = (await dayChoices(date)).find((day) => !day.isOptional);
  if (!primary)
    throw new Error(`No Philippine liturgical celebration for ${date}`);
  const { collection, key } = lectionaryKey(primary);
  const entry = readEntry(collection, key);
  if (!entry || entry.key !== key)
    throw new Error(
      `Missing lectionary readings: ${collection}/${key} for ${date}`,
    );
  const mass = chooseMass(entry, key);
  if (!validDate(mass.source_date))
    throw new Error(`Invalid source date: ${collection}/${key}`);
  const record = {
    date,
    celebration: primary.name,
    language: "fil",
    source_url: mass.source_url,
    source_date: mass.source_date,
    retrieved_at: now.toISOString(),
    origin: "lectionary",
    lectionary_key: `${collection}/${key}`,
    liturgical_id: primary.id,
    mass_label: mass.label || "",
    selection_rule:
      key === "nativity_of_the_lord"
        ? "christmas-day"
        : "first-daytime-mass-main-readings",
    sections: sundaySections(mass.sections),
  };
  if (
    ["easter_sunday", "pentecost_sunday"].includes(key) &&
    !record.sections.some((section) => section.type === "sequence")
  )
    throw new Error(`Required Sequence is missing: ${collection}/${key}`);
  if (!validRecord(record))
    throw new Error(
      `Invalid or incomplete Sunday readings: ${collection}/${key}`,
    );
  const snapshot = {
    schema_version: 1,
    source: "awit-at-papuri",
    mode: "next-sunday",
    dates: [date],
    records: [record],
    errors: [],
    last_attempt: now.toISOString(),
  };
  if (!validateSnapshot(snapshot))
    throw new Error("Refusing to create an invalid Sunday snapshot");
  return snapshot;
}
