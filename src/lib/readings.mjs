import { manilaToday } from "./calendar.mjs";

/** @typedef {{type: string, text: string}} ReadingBlock */
/** @typedef {{label?: string, heading?: string, reference: string, blocks: ReadingBlock[]}} ReadingOption */
/** @typedef {{type: string, heading: string, reference: string, blocks: ReadingBlock[], id?: string, label?: string, alternatives?: ReadingOption[]}} ReadingSection */
/** @typedef {{id: string, label: string, display_label?: string, vigil?: boolean, source_url: string, source_date: string, lectionary_key?: string, sections: ReadingSection[]}} ReadingMass */
/** @typedef {{date: string, celebration: string, language: string, source_url: string, retrieved_at: string, sections: ReadingSection[], origin?: "lectionary", lectionary_key?: string, source_date?: string, masses?: ReadingMass[], selected_mass?: string}} ReadingRecord */
/** @typedef {{schema_version: number, source: string, mode: string, dates: string[], calendar_dates?: string[], last_attempt: string, records: ReadingRecord[], errors: {date: string, message: string}[]}} ReadingSnapshot */

export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function sameReadingContent(previous, next) {
  if (!previous || !next) return false;
  const content = (snapshot) => ({
    schema_version: snapshot.schema_version,
    source: snapshot.source,
    mode: snapshot.mode,
    dates: snapshot.dates,
    calendar_dates: snapshot.calendar_dates,
    errors: snapshot.errors,
    records: snapshot.records.map(({ retrieved_at, ...record }) => record),
  });
  return JSON.stringify(content(previous)) === JSON.stringify(content(next));
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
export function targetDates(mode, now = new Date(), calendarDates = []) {
  if (mode === "next-celebration") {
    const next = calendarDates.find((day) => day >= manilaToday(now));
    return next ? [next] : [];
  }
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
export function validLiturgicalSections(sections) {
  const allowed = new Set([
    "procession",
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "epistle",
    "psalm",
    "sequence",
    "acclamation",
    "gospel",
  ]);
  const blocks = (value) =>
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (b) =>
        b &&
        ["paragraph", "stanza", "response"].includes(b.type) &&
        text(b.text),
    );
  if (
    !Array.isArray(sections) ||
    !sections.length ||
    !["procession", "first"].includes(sections[0]?.type) ||
    sections.at(-1)?.type !== "gospel"
  )
    return false;
  for (const type of ["first", "gospel"])
    if (sections.filter((s) => s.type === type).length !== 1) return false;
  if (!sections.some((s) => s.type === "psalm")) return false;
  if (
    sections.some((s) => s.id) &&
    new Set(sections.map((s) => s.id)).size !== sections.length
  )
    return false;
  return sections.every(
    (s) =>
      s &&
      allowed.has(s.type) &&
      text(s.heading) &&
      (["acclamation", "sequence"].includes(s.type) || text(s.reference)) &&
      blocks(s.blocks) &&
      (s.alternatives === undefined ||
        (Array.isArray(s.alternatives) &&
          s.alternatives.every(
            (a) => a && typeof a.reference === "string" && blocks(a.blocks),
          ))),
  );
}
export function validRecord(record) {
  if (
    !record ||
    !validDate(record.date) ||
    record.language !== "fil" ||
    !text(record.celebration) ||
    typeof record.retrieved_at !== "string" ||
    Number.isNaN(Date.parse(record.retrieved_at)) ||
    typeof record.source_url !== "string" ||
    // Lectionary records cite an earlier year's post (older posts were re-dated).
    !record.source_url.startsWith(
      record.origin === "lectionary" && validDate(record.source_date)
        ? "https://www.awitatpapuri.com/"
        : `https://www.awitatpapuri.com/${record.date.replaceAll("-", "/")}/`,
    ) ||
    !Array.isArray(record.sections)
  )
    return false;
  if (record.origin === "lectionary") {
    if (!validLiturgicalSections(record.sections)) return false;
    if (record.masses !== undefined) {
      if (
        !Array.isArray(record.masses) ||
        !record.masses.length ||
        new Set(record.masses.map((m) => m.id)).size !== record.masses.length
      )
        return false;
      if (
        !record.masses.every(
          (m) =>
            m &&
            text(m.id) &&
            typeof m.label === "string" &&
            validDate(m.source_date) &&
            typeof m.source_url === "string" &&
            m.source_url.startsWith("https://www.awitatpapuri.com/") &&
            validLiturgicalSections(m.sections),
        )
      )
        return false;
      const selected = record.masses.find((m) => m.id === record.selected_mass);
      if (
        !selected ||
        JSON.stringify(selected.sections) !== JSON.stringify(record.sections) ||
        selected.source_url !== record.source_url ||
        selected.source_date !== record.source_date
      )
        return false;
    }
    return true;
  }
  const types = record.sections.map((s) => s?.type);
  const expected = [
    ...(record.origin === "lectionary" && types.includes("procession")
      ? ["procession"]
      : []),
    "first",
    "psalm",
    ...(types.includes("second") ? ["second"] : []),
    ...(record.origin === "lectionary" && types.includes("sequence")
      ? ["sequence"]
      : []),
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
      (["acclamation", "sequence"].includes(s.type) || text(s.reference)) &&
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
    !["next-sunday", "next-seven-days", "next-celebration"].includes(s.mode) ||
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
  if (s.mode === "next-celebration")
    return (
      s.dates.length === 1 &&
      Array.isArray(s.calendar_dates) &&
      s.calendar_dates.length > 0 &&
      s.calendar_dates.every(validDate) &&
      s.calendar_dates.every(
        (d, i) => i === 0 || d > s.calendar_dates[i - 1],
      ) &&
      s.calendar_dates.includes(s.dates[0])
    );
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
  const dates = targetDates(mode, now, previous?.calendar_dates);
  const records = new Map((previous?.records || []).map((r) => [r.date, r]));
  for (const record of incoming) records.set(record.date, record);
  return {
    schema_version: 1,
    source: "awit-at-papuri",
    mode,
    dates,
    ...(mode === "next-celebration"
      ? { calendar_dates: previous?.calendar_dates || [] }
      : {}),
    last_attempt: now.toISOString(),
    records: dates.flatMap((date) => {
      const record = records.get(date);
      return record ? [record] : [];
    }),
    errors,
  };
}
