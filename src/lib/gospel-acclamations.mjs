// Build/script only. Never import Romcal or the full lectionary into the browser.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dayChoices, lectionaryKey, underlyingWeekday, romcalYear } from "./lectionary-keys.mjs";
import { addDays, validDate } from "./readings.mjs";
import { manilaToday } from "./calendar.mjs";
import settings from "../config/gospel-acclamations.json" with { type: "json" };
import { eveningContext, isSimbang } from "./reading-selection.mjs";

const files = new Map();
function localEntry({ collection, key }) {
  if (!files.has(collection)) {
    const data = JSON.parse(readFileSync(resolve(`src/data/readings/lectionary/${collection}.json`), "utf8"));
    if (data.schema_version !== 1 || data.collection !== collection || data.language !== "fil" || !data.entries)
      throw new Error(`Invalid lectionary collection: ${collection}`);
    files.set(collection, data.entries);
  }
  const entries = files.get(collection);
  if (collection === "seasonal" && key === "advent_december_16") {
    // The imported source filed this fixed-date proper under an Advent weekday.
    // Prefer its explicitly labelled Aguinaldo copy and retain its actual key.
    return Object.values(entries).find(entry => entry.masses?.some(mass =>
      mass.source_date?.endsWith("12-16") && /Aguinaldo/i.test(mass.label))) ||
      Object.values(entries).find(entry => entry.masses?.some(mass => mass.source_date?.endsWith("12-16")));
  }
  return entries[key];
}
export { localEntry as localLectionaryEntry };

/** Strip only standalone Alleluia refrain lines at the boundaries of a verse. */
export function acclamationVerse(blocks) {
  if (!Array.isArray(blocks) || !blocks.length || blocks.some(b => typeof b?.text !== "string"))
    throw new Error("Missing Gospel Acclamation text");
  const lines = blocks.map(b => b.text).join("\n\n").replace(/\r\n?/g, "\n").trim().split("\n");
  const refrain = line => /^(?:(?:aleluya|alleluia)[\s!.,;:…]*)+$/iu.test(line.trim());
  while (lines.length && (!lines[0].trim() || refrain(lines[0]))) lines.shift();
  while (lines.length && (!lines.at(-1).trim() || refrain(lines.at(-1)))) lines.pop();
  const verse = lines.join("\n").trim();
  if (!verse || /\[[^\]]*(?:to be added|scan ends|missing verses)/i.test(verse))
    throw new Error("Incomplete Gospel Acclamation verse");
  return verse;
}

/** A record is keyed by the actual chapel/civil date, not its source post date. */
export async function acclamationForDate(date, {
  readEntry = localEntry,
  overrides = settings.overrides,
  simbang = settings.simbang_gabi,
} = {}) {
  if (!validDate(date)) throw new Error(`Invalid date: ${date}`);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const monthDay = date.slice(5);
  const isSimbang = simbang && monthDay >= simbang.start && monthDay <= simbang.end;
  const override = overrides[date];
  const readingDate = override?.reading_date ||
    (isSimbang && simbang.anticipate_next_day && !(weekday === 0 && simbang.keep_sunday_readings)
      ? addDays(date, 1) : date);
  if (!validDate(readingDate)) throw new Error(`Invalid reading_date override for ${date}`);
  const day = (await dayChoices(readingDate)).find(d => !d.isOptional);
  if (!day) throw new Error(`No Philippine calendar day for ${readingDate}`);
  let location = lectionaryKey(day);
  if (readingDate.endsWith("12-16") && day.rank === "WEEKDAY")
    location = { collection: "seasonal", key: "advent_december_16" };
  // The chapel's Holy Thursday celebration is the evening Mass, not the Chrism Mass.
  if (day.id === "holy_thursday" && !override?.mass_label)
    location = { collection: "seasonal", key: "thursday_of_the_lords_supper" };
  let entry = readEntry(location);
  if (entry && location.key === "advent_december_16")
    location = { ...location, key: entry.key };
  if (!entry && day.rank === "MEMORIAL") {
    const weekdayDay = underlyingWeekday(day);
    if (weekdayDay) { location = lectionaryKey(weekdayDay); entry = readEntry(location); }
  }
  const base = {
    date,
    reading_date: readingDate,
    context: isSimbang ? `Simbang Gabi · ${simbang.time}` : "Pagbasa para sa araw na ito",
    celebration: day.name,
    lectionary_key: `${location.collection}/${location.key}`,
    setting: day.seasons.includes("LENT") || day.id === "friday_of_the_passion_of_the_lord" ? "lent" : "alleluia",
    liturgical_id: day.id,
  };
  if (!entry) return { ...base, status: "unavailable", message: "Wala pang nakahandang taludtod sa lokal na lectionary para sa araw na ito." };
  if (!Array.isArray(entry.masses) || !entry.masses.length)
    throw new Error(`Missing Masses: ${base.lectionary_key}`);
  const mass = override?.mass_label
    ? entry.masses.find(m => m.label === override.mass_label)
    : entry.masses.find(m => !m.vigil) || entry.masses[0];
  if (!mass) throw new Error(`Mass override not found for ${date}: ${override?.mass_label}`);
  const acclamation = mass.sections.filter(s => s.type === "acclamation" && !s.alternative).at(-1);
  if (!acclamation) return { ...base, status: "unavailable", message: "Walang taludtod bago ang Mabuting Balita sa nakahandang kopya." };
  if (!validDate(mass.source_date) || !/^https:\/\/www\.awitatpapuri\.com\//.test(mass.source_url))
    throw new Error(`Invalid source: ${base.lectionary_key}`);
  return {
    ...base,
    status: "available",
    mass_label: mass.label,
    reference: acclamation.reference || "",
    verse: acclamationVerse(acclamation.blocks),
    source_url: mass.source_url,
    source_date: mass.source_date,
  };
}

export async function buildAcclamationCalendar({ from = manilaToday(), days = 30, ...options } = {}) {
  if (!validDate(from)) throw new Error("--from must be a valid YYYY-MM-DD Manila date");
  if (!Number.isInteger(days) || days < 1 || days > 366)
    throw new Error("--days must be an integer between 1 and 366");
  const records = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const day = await acclamationForDate(date, { ...options, simbang: null });
    const context = eveningContext(new Date(`${date}T15:59:00Z`), day.liturgical_id);
    let evening;
    if (context === "anticipated") {
      evening = isSimbang(date)
        ? await acclamationForDate(date, options)
        : { ...await acclamationForDate(addDays(date, 1), { ...options, simbang: null }), date, context: "Anticipated Sunday Mass" };
    } else if (context === "christmas-vigil") {
      const mass = localEntry({ collection: "seasonal", key: "nativity_of_the_lord" })?.masses.find(mass => /Vigil/i.test(mass.label));
      if (!mass) throw new Error("Missing Christmas Vigil acclamation");
      evening = await acclamationForDate(date, { ...options, simbang: null, overrides: { [date]: { reading_date: addDays(date, 1), mass_label: mass.label } } });
      evening.context = "Misa sa Bisperas ng Pasko";
    }
    if (evening) day.evening = evening;
    records.push(day);
  }
  return {
    schema_version: 1, timezone: "Asia/Manila", from, through: addDays(from, days - 1), records,
    lenten_practice: await buildLentenPractice({ year: Number(from.slice(0, 4)), readEntry: options.readEntry }),
  };
}

/** Reusable practice texts, independent of the daily calendar's prepared range. */
export async function buildLentenPractice({ year = Number(manilaToday().slice(0, 4)), readEntry = localEntry } = {}) {
  const celebrations = [
    ["ash_wednesday", "Ash Wednesday"],
    ["lent_1_sunday", "First Sunday of Lent"],
    ["lent_2_sunday", "Second Sunday of Lent"],
    ["lent_3_sunday", "Third Sunday of Lent"],
    ["lent_4_sunday", "Fourth Sunday of Lent"],
    ["lent_5_sunday", "Fifth Sunday of Lent"],
    ["palm_sunday_of_the_passion_of_the_lord", "Palm Sunday of the Lord’s Passion"],
  ];
  const cycles = {};
  for (const cycle of ["a", "b", "c"]) {
    cycles[cycle] = celebrations.map(([key, title]) => {
      const collection = key === "ash_wednesday" ? "seasonal" : `year-${cycle}`;
      const entry = readEntry({ collection, key });
      const mass = entry?.masses?.find(m => !m.vigil) || entry?.masses?.[0];
      const acclamation = mass?.sections?.filter(s => s.type === "acclamation" && !s.alternative).at(-1);
      if (!acclamation || !validDate(mass.source_date) || !/^https:\/\/www\.awitatpapuri\.com\//.test(mass.source_url))
        throw new Error(`Lenten practice verse missing or invalid: ${collection}/${key}`);
      return {
        key, title, reference: acclamation.reference || "", verse: acclamationVerse(acclamation.blocks),
        source_url: mass.source_url, source_date: mass.source_date, lectionary_key: `${collection}/${key}`,
      };
    });
  }
  const seasons = [];
  for (let y = year - 1; y <= year + 2; y++) {
    const days = Object.values(await romcalYear(y)).flat();
    const ash = days.find(day => day.id === "ash_wednesday");
    const easter = days.find(day => day.id === "easter_sunday");
    if (!ash || !easter) throw new Error(`Missing Lenten dates for ${y}`);
    seasons.push({ year: y, cycle: ash.cycles.sundayCycle.slice(-1).toLowerCase(), start: ash.date, end: easter.date });
  }
  return { cycles, seasons };
}
