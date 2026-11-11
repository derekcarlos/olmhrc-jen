import { celebrationCalendar, celebrationReading, calendarYears, ReadingUnavailableError } from "./readings-celebrations.mjs";
import { dayChoices } from "./lectionary-keys.mjs";
import { localLectionaryEntry } from "./gospel-acclamations.mjs";
import { manilaToday } from "./calendar.mjs";
import { addDays, validateSnapshot } from "./readings.mjs";
import { isSimbang, weekStart } from "./reading-selection.mjs";

export async function upcomingCalendar(years = calendarYears()) {
  const days = new Map((await celebrationCalendar(years)).map(day => [day.date, day]));
  for (const year of years) for (let day = 15; day <= 24; day++) {
    const date = `${year}-12-${day}`;
    if (day === 24 && days.has(date)) {
      days.set(date, { ...days.get(date), id: "christmas_eve", name: "Bisperas ng Pasko", category: "Pasko" });
    }
    if (!days.has(date)) {
      const primary = (await dayChoices(date)).find(day => !day.isOptional);
      days.set(date, { date, id: day === 24 ? "christmas_eve" : primary.id, name: day === 24 ? "Bisperas ng Pasko" : "Simbang Gabi", category: day === 24 ? "Pasko" : "Simbang Gabi", rank: primary.rank });
    }
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}
async function daytimeReading(date, now) {
  let locations;
  const day = (await dayChoices(date)).find(day => !day.isOptional);
  if (date.endsWith("12-16") && day.rank === "WEEKDAY") {
    const entry = localLectionaryEntry({ collection: "seasonal", key: "advent_december_16" });
    if (!entry) throw new ReadingUnavailableError("Missing December 16 Aguinaldo readings");
    locations = [{ collection: "seasonal", key: entry.key }];
  }
  return celebrationReading(date, now, { allowWeekday: true, locations });
}
export async function upcomingReading(date, now = new Date()) {
  const record = await daytimeReading(date, now);
  record.liturgical_id = (await dayChoices(date)).find(day => !day.isOptional).id;
  record.masses.forEach(mass => { mass.reading_date = date; });
  if (isSimbang(date) && new Date(`${date}T12:00:00Z`).getUTCDay() !== 0) {
    const nextDate = addDays(date, 1);
    const next = await daytimeReading(nextDate, now);
    const mass = next.masses.find(mass => mass.id === next.selected_mass);
    record.masses.push({ ...mass, id: "anticipated", reading_date: nextDate, display_label: "Simbang Gabi · 7:30 PM", context: `Anticipated Mass · Mga pagbasa para sa ${nextDate}` });
    record.masses[0].display_label = "Mga pagbasa sa araw";
    record.celebration = "Simbang Gabi";
  }
  if (date.endsWith("12-24")) {
    const christmasDate = addDays(date, 1);
    const christmas = await celebrationReading(christmasDate, now);
    for (const [id, pattern] of [["christmas-vigil", /Vigil/i], ["christmas-night", /Midnight|During the Night/i]]) {
      const mass = christmas.masses.find(mass => pattern.test(mass.label));
      if (!mass) throw new Error(`Missing Christmas Mass: ${id}`);
      record.masses.push({ ...mass, id, reading_date: christmasDate, context: `Bisperas ng Pasko · Mga pagbasa para sa ${christmasDate}` });
    }
    record.masses[0].display_label = new Date(`${date}T12:00:00Z`).getUTCDay() === 0 ? record.celebration : "Mga pagbasa sa araw";
    record.celebration = "Bisperas ng Pasko";
  }
  return record;
}
export async function buildUpcomingSnapshot({ now = new Date() } = {}) {
  const calendar = await upcomingCalendar(calendarYears(now));
  const start = weekStart(manilaToday(now));
  const dates = calendar.filter(day => day.date >= start && day.date <= addDays(start, 13)).map(day => day.date);
  const records = [], errors = [];
  for (const date of dates) {
    try { records.push(await upcomingReading(date, now)); }
    catch (error) {
      if (error.code !== "READINGS_UNAVAILABLE") throw error;
      errors.push({ date, message: error.message });
    }
  }
  const snapshot = { schema_version: 1, source: "awit-at-papuri", mode: "upcoming-celebrations", dates, records, errors, last_attempt: now.toISOString() };
  if (!records.length || !validateSnapshot(snapshot)) throw new Error("Invalid upcoming readings snapshot");
  return snapshot;
}
