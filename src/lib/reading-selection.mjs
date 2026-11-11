// Shared browser-safe clock rules. Times are always Philippine time.
import settings from "../config/readings.json" with { type: "json" };
import gospel from "../config/gospel-acclamations.json" with { type: "json" };
import { manilaToday } from "./calendar.mjs";
import { addDays } from "./readings.mjs";

export function manilaClock(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Manila", hour: "2-digit", hourCycle: "h23" }).format(now));
  return { date: manilaToday(now), hour };
}
export function isSimbang(date) {
  return date.slice(5) >= gospel.simbang_gabi.start && date.slice(5) <= gospel.simbang_gabi.end;
}
export function weekStart(date) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}
export function eveningContext(now = new Date(), liturgicalId = "") {
  const { date, hour } = manilaClock(now);
  if (hour < (settings.evening_hour ?? 18)) return "day";
  if (liturgicalId === "holy_saturday") return "easter-vigil";
  if (date.endsWith("12-24")) return "christmas-vigil";
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (weekday === 0) return "day";
  return isSimbang(date) || weekday === 6 ? "anticipated" : "day";
}
export function readingChoice(calendar, now = new Date()) {
  const { date, hour } = manilaClock(now);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const today = calendar.find(day => day.date === date);
  const retireSunday = weekday === 0 && !date.endsWith("12-24") && hour >= (isSimbang(date) ? settings.simbang_sunday_hour ?? 24 : settings.sunday_preparation_hour ?? 18);
  const anticipateSaturday = weekday === 6 && eveningContext(now, today?.id) === "anticipated" && !isSimbang(date);
  const day = calendar.find(day => day.date >= date && !((retireSunday || anticipateSaturday) && day.date === date));
  if (!day) return null;
  let mass = null;
  if (day.date === date) {
    const context = eveningContext(now, day.id);
    if (context === "christmas-vigil") mass = "christmas-vigil";
    else if (context === "anticipated" && isSimbang(date)) mass = "anticipated";
  } else if (day.date.endsWith("12-24")) mass = "christmas-vigil";
  else if (isSimbang(day.date) && new Date(`${day.date}T12:00:00Z`).getUTCDay() !== 0) mass = "anticipated";
  return { date: day.date, mass };
}
export function readingGroup(calendar, date) {
  const palm = calendar.find(day => day.id?.includes("palm_sunday") && date >= day.date && date <= addDays(day.date, 7));
  const start = palm?.date || weekStart(date);
  const end = palm ? addDays(start, 7) : addDays(start, 6);
  return calendar.filter(day => day.date >= start && day.date <= end);
}
