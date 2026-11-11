import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { romcalYear, dayChoices, lectionaryKey, underlyingWeekday } from "./lectionary-keys.mjs";
import { manilaToday } from "./calendar.mjs";
import {
  validRecord,
  validLiturgicalSections,
  validateSnapshot,
  targetDates,
} from "./readings.mjs";

const holyWeek = new Set([
  "holy_monday",
  "holy_tuesday",
  "holy_wednesday",
  "holy_thursday",
  "friday_of_the_passion_of_the_lord",
  "holy_saturday",
]);
const cache = new Map();
const easterOctave =
  /^easter_(monday|tuesday|wednesday|thursday|friday|saturday)$/;
export class ReadingUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.code = "READINGS_UNAVAILABLE";
  }
}
function entryAt(collection, key) {
  const path = resolve(`src/data/readings/lectionary/${collection}.json`);
  const stamp = statSync(path).mtimeMs;
  if (cache.get(path)?.stamp !== stamp) {
    const file = JSON.parse(readFileSync(path, "utf8"));
    if (
      file.schema_version !== 1 ||
      file.collection !== collection ||
      file.language !== "fil" ||
      !file.entries
    )
      throw new Error(`Invalid lectionary: ${collection}`);
    cache.set(path, { stamp, data: file.entries });
  }
  return cache.get(path).data[key];
}
const included = (date, day) =>
  new Date(`${date}T12:00:00Z`).getUTCDay() === 0 ||
  day.rank === "SOLEMNITY" ||
  day.id === "ash_wednesday" ||
  holyWeek.has(day.id);
const category = (day) =>
  holyWeek.has(day.id) || day.id.includes("palm_sunday")
    ? "Mahal na Araw"
    : day.id === "ash_wednesday"
      ? "Miyerkules ng Abo"
      : day.rank === "SOLEMNITY"
        ? "Dakilang Kapistahan"
        : "Linggo";
export function calendarYears(now = new Date()) {
  const year = Number(manilaToday(now).slice(0, 4));
  return [year - 1, year, year + 1];
}
export async function celebrationCalendar(years = calendarYears()) {
  const result = [];
  for (const year of years) {
    const days = await romcalYear(year);
    for (const [date, choices] of Object.entries(days)) {
      const raw = choices.find((d) => !d.isOptional);
      if (!raw || !included(date, raw)) continue;
      const day = (await dayChoices(date)).find((d) => !d.isOptional);
      const location = lectionaryKey(day);
      result.push({
        date,
        id: day.id,
        name: day.name,
        category: category(day),
        rank: day.rank,
        collection: location.collection,
        key: location.key,
      });
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

function readingBlocks(source) {
  const blocks = structuredClone(source.blocks);
  if (source.type !== "gospel") return blocks;
  const closing = "Ang Mabuting Balita ng Panginoon.";
  const compact = (text) => text.replace(/\s+/g, " ").trim();
  for (const [index, block] of blocks.entries()) {
    // A malformed source paragraph can swallow the remaining Passion and its
    // short form into the kneeling rubric. Remove that nested copy only when
    // the following blocks contain the exact same complete Gospel ending.
    if (!/o kaya:\s*Maikling Pagbasa/i.test(block.text)) continue;
    const lineEnd = block.text.indexOf("\n");
    const end = block.text.indexOf(closing);
    if (lineEnd < 0 || end < lineEnd) continue;
    const embeddedEnding = block.text.slice(lineEnd + 1, end + closing.length);
    const remaining = blocks.slice(index + 1).map((b) => b.text).join(" ");
    if (compact(embeddedEnding) === compact(remaining)) {
      block.text = block.text.slice(0, lineEnd).trim();
    }
  }
  return blocks;
}

export function normalizeMassSections(raw) {
  const main = [];
  const firstAt = raw.findIndex((s) => s.type === "first" && !s.alternative);
  const lastAcclamation = raw.findLastIndex(
    (s) => s.type === "acclamation" && !s.alternative,
  );
  for (const [index, source] of raw.entries()) {
    if (source.alternative) {
      const parent = main.findLast((s) => s.sourceType === source.type);
      if (!parent)
        throw new Error(`Alternative ${source.type} has no main reading`);
      (parent.alternatives ||= []).push({
        label: source.label || "Maikling Pagbasa",
        heading: source.heading,
        reference: source.reference || "",
        blocks: readingBlocks(source),
      });
      continue;
    }
    const type =
      source.type === "gospel" && index < firstAt
        ? "procession"
        : source.type === "acclamation" && index !== lastAcclamation
          ? "sequence"
          : source.type;
    main.push({
      sourceType: source.type,
      type,
      heading: type === "sequence" ? "SEKWENSIYA" : source.heading,
      reference: source.reference || "",
      blocks: readingBlocks(source),
    });
  }
  const counts = new Map();
  const sections = main.map(({ sourceType, ...section }) => {
    const n = (counts.get(section.type) || 0) + 1;
    counts.set(section.type, n);
    return { ...section, id: n === 1 ? section.type : `${section.type}-${n}` };
  });
  if (!validLiturgicalSections(sections))
    throw new Error("Incomplete or unsupported Mass readings");
  return sections;
}
function displayLabel(label) {
  if (/Chrism/i.test(label)) return "Misa ng Krisma";
  if (/Lord.*Supper/i.test(label)) return "Misa sa Paghahapunan ng Panginoon";
  if (/Easter Vigil/i.test(label))
    return "Magdamagang Pagtatanod sa Pasko ng Muling Pagkabuhay";
  if (/Vigil/i.test(label)) return "Misa sa Bisperas";
  if (/During the Day/i.test(label)) return "Misa sa Araw";
  if (/Dawn/i.test(label)) return "Misa sa Bukang-liwayway";
  if (/Midnight|During the Night/i.test(label)) return "Misa sa Hatinggabi";
  return label.replace(/\s*\([^)]*\)\s*$/, "");
}
/** @returns {Promise<import('./readings.mjs').ReadingRecord>} */
export async function celebrationReading(date, now = new Date(), { allowWeekday = false, locations: customLocations = undefined } = {}) {
  const day = (await dayChoices(date)).find((d) => !d.isOptional);
  if (!day || (!allowWeekday && !included(date, day)))
    throw new Error(`No selected celebration for ${date}`);
  const location = lectionaryKey(day);
  const locations = customLocations || (
    day.id === "holy_thursday"
      ? [
          { collection: "seasonal", key: "holy_thursday" },
          { collection: "seasonal", key: "thursday_of_the_lords_supper" },
        ]
      : [location]);
  const masses = [];
  for (const loc of locations) {
    let entry = entryAt(loc.collection, loc.key);
    if (!entry && allowWeekday && day.rank === "MEMORIAL") {
      const weekday = underlyingWeekday(day);
      if (weekday) {
        const fallback = lectionaryKey(weekday);
        entry = entryAt(fallback.collection, fallback.key);
        if (entry) Object.assign(loc, fallback);
      }
    }
    if (!entry?.masses?.length)
      throw new ReadingUnavailableError(
        `Missing readings: ${loc.collection}/${loc.key}`,
      );
    for (const source of entry.masses) {
      let sourceSections = source.sections;
      // On a Sunday the Exaltation uses BOTH readings, rather than the weekday
      // either/or in the stored source. Both texts already exist in that source.
      // Reference: https://bible.usccb.org/bible/readings/091425.cfm
      if (
        day.id === "exaltation_of_the_holy_cross" &&
        new Date(`${date}T12:00:00Z`).getUTCDay() === 0 &&
        !sourceSections.some((s) => s.type === "second" && !s.alternative)
      ) {
        const option = sourceSections.find(
          (s) =>
            s.type === "first" &&
            s.alternative &&
            /^Filipos\s+2\b/i.test(s.reference),
        );
        if (!option)
          throw new Error(
            "Sunday Exaltation requires the saved Philippians reading",
          );
        sourceSections = sourceSections.filter((s) => s !== option);
        const second = {
          ...option,
          type: "second",
          heading: "IKALAWANG PAGBASA",
          alternative: false,
        };
        sourceSections = [...sourceSections];
        sourceSections.splice(
          sourceSections.findIndex((s) => s.type === "acclamation"),
          0,
          second,
        );
      }
      masses.push({
        id: `mass-${masses.length + 1}`,
        label: source.label || entry.name,
        display_label: displayLabel(source.label || entry.name),
        vigil: Boolean(source.vigil),
        source_url: source.source_url,
        source_date: source.source_date,
        lectionary_key: `${loc.collection}/${loc.key}`,
        sections: normalizeMassSections(sourceSections),
      });
    }
  }
  const selected =
    day.id === "holy_thursday"
      ? masses.find((m) => /Supper/i.test(m.label))
      : day.id === "nativity_of_the_lord"
        ? masses.find((m) => /During the Day/i.test(m.label))
        : day.id === "holy_saturday"
          ? masses[0]
          : masses.find(
              (m) => !m.vigil && !/\bvigil\b|bisperas/i.test(m.label),
            );
  if (!selected) throw new Error(`No default Mass for ${date}`);
  if (
    ((day.rank === "SOLEMNITY" && !easterOctave.test(day.id)) ||
      new Date(`${date}T12:00:00Z`).getUTCDay() === 0 ||
      [
        "ash_wednesday",
        "holy_thursday",
        "friday_of_the_passion_of_the_lord",
      ].includes(day.id)) &&
    masses.some(
      (mass) => !mass.sections.some((section) => section.type === "second"),
    )
  )
    throw new Error(`A required second reading is missing for ${date}`);
  if (
    ["easter_sunday", "pentecost_sunday"].includes(day.id) &&
    !selected.sections.some((section) => section.type === "sequence")
  )
    throw new Error(`A required Sequence is missing for ${date}`);
  if (
    day.id === "holy_saturday" &&
    !selected.sections.some((section) => section.type === "epistle")
  )
    throw new Error(`The Easter Vigil Epistle is missing for ${date}`);
  const record = {
    date,
    celebration: day.name,
    language: "fil",
    origin: "lectionary",
    retrieved_at: now.toISOString(),
    source_url: selected.source_url,
    source_date: selected.source_date,
    lectionary_key: selected.lectionary_key,
    selected_mass: selected.id,
    sections: selected.sections,
    masses,
  };
  if (!validRecord(record))
    throw new Error(`Invalid lectionary readings for ${date}`);
  return record;
}
export async function buildCelebrationSnapshot({ now = new Date() } = {}) {
  const calendar = await celebrationCalendar(calendarYears(now));
  const calendar_dates = calendar.map((day) => day.date);
  const dates = targetDates("next-celebration", now, calendar_dates);
  if (!dates.length)
    throw new Error("No upcoming celebration in the generated calendar");
  const record = await celebrationReading(dates[0], now);
  const snapshot = {
    schema_version: 1,
    source: "awit-at-papuri",
    mode: "next-celebration",
    dates,
    calendar_dates,
    records: [record],
    errors: [],
    last_attempt: now.toISOString(),
  };
  if (!validateSnapshot(snapshot))
    throw new Error("Invalid celebration snapshot");
  return snapshot;
}
