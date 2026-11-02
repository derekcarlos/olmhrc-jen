import { manilaToday } from "./calendar.mjs";

/** @typedef {{type: string, text: string}} ReadingBlock */
/** @typedef {{type: string, heading: string, reference: string, blocks: ReadingBlock[]}} ReadingSection */
/** @typedef {{date: string, celebration: string, language: string, source_url: string, retrieved_at: string, sections: ReadingSection[]}} ReadingRecord */
/** @typedef {{schema_version: number, source: string, mode: string, dates: string[], last_attempt: string, records: ReadingRecord[], errors: {date: string, message: string}[]}} ReadingSnapshot */

export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function addDays(day, amount) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function sundayDate(now = new Date()) {
  const today = manilaToday(now);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  return addDays(today, (7 - weekday) % 7);
}
export function targetDates(mode, now = new Date()) {
  if (mode === "next-sunday") return [sundayDate(now)];
  if (mode === "next-seven-days")
    return Array.from({ length: 7 }, (_, i) => addDays(manilaToday(now), i));
  throw new Error(`Invalid readings mode: ${mode}`);
}
export function formatReadingDate(day) {
  return new Intl.DateTimeFormat("fil-PH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}
const text = (value) => typeof value === "string" && value.trim().length > 0;
export function validRecord(record) {
  if (
    !record ||
    !validDate(record.date) ||
    record.language !== "fil" ||
    !text(record.celebration) ||
    typeof record.retrieved_at !== "string" ||
    Number.isNaN(Date.parse(record.retrieved_at)) ||
    typeof record.source_url !== "string" ||
    !record.source_url.startsWith(
      `https://www.awitatpapuri.com/${record.date.replaceAll("-", "/")}/`,
    ) ||
    !Array.isArray(record.sections)
  )
    return false;
  const types = record.sections.map((s) => s?.type);
  const expected = [
    "first",
    "psalm",
    ...(types.includes("second") ? ["second"] : []),
    "acclamation",
    "gospel",
  ];
  if (JSON.stringify(types) !== JSON.stringify(expected)) return false;
  if (
    new Date(`${record.date}T12:00:00Z`).getUTCDay() === 0 &&
    !types.includes("second")
  )
    return false;
  return record.sections.every(
    (s) =>
      text(s.heading) &&
      text(s.reference) &&
      Array.isArray(s.blocks) &&
      s.blocks.length > 0 &&
      s.blocks.every(
        (b) =>
          b &&
          ["paragraph", "stanza", "response"].includes(b.type) &&
          text(b.text),
      ),
  );
}
/** @param {unknown} value @returns {value is ReadingSnapshot} */
export function validateSnapshot(value) {
  const s = /** @type {ReadingSnapshot} */ (value);
  if (
    !s ||
    s.schema_version !== 1 ||
    s.source !== "awit-at-papuri" ||
    !["next-sunday", "next-seven-days"].includes(s.mode) ||
    !Array.isArray(s.dates) ||
    !s.dates.length ||
    s.dates.length > 7 ||
    !s.dates.every(validDate) ||
    new Set(s.dates).size !== s.dates.length ||
    !Array.isArray(s.records) ||
    !s.records.every(validRecord) ||
    new Set(s.records.map((r) => r.date)).size !== s.records.length ||
    !s.records.every((r) => s.dates.includes(r.date)) ||
    !Array.isArray(s.errors) ||
    !s.errors.every((e) => validDate(e.date) && text(e.message)) ||
    typeof s.last_attempt !== "string" ||
    Number.isNaN(Date.parse(s.last_attempt))
  )
    return false;
  if (s.mode === "next-sunday")
    return (
      s.dates.length === 1 &&
      new Date(`${s.dates[0]}T12:00:00Z`).getUTCDay() === 0
    );
  return (
    s.dates.length === 7 &&
    s.dates.every((day, i) => day === addDays(s.dates[0], i))
  );
}
/** @param {ReadingSnapshot|null} previous @param {ReadingRecord[]} incoming */
export function reconcileSnapshot(
  previous,
  incoming,
  mode,
  now = new Date(),
  errors = [],
) {
  if (previous && !validateSnapshot(previous))
    throw new Error("Invalid previous readings snapshot");
  if (!incoming.every(validRecord))
    throw new Error("Invalid imported reading record");
  const dates = targetDates(mode, now);
  const records = new Map((previous?.records || []).map((r) => [r.date, r]));
  for (const record of incoming) records.set(record.date, record);
  return {
    schema_version: 1,
    source: "awit-at-papuri",
    mode,
    dates,
    last_attempt: now.toISOString(),
    records: dates.flatMap((date) => {
      const record = records.get(date);
      return record ? [record] : [];
    }),
    errors,
  };
}
