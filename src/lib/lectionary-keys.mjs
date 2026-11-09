// Server/build-only: romcal is heavy; never import this into client code.
import { Romcal } from "romcal";
import { Philippines_En } from "@romcal/calendar.philippines";
import settings from "../config/liturgical-calendar.json" with { type: "json" };

/**
 * Lectionary collections:
 * - year-a/b/c: Sundays and Lord's celebrations, by Sunday cycle
 * - weekday-1/2: Ordinary Time weekdays, by weekday cycle (I odd years, II even)
 * - seasonal: Advent, Christmas, Lent and Easter weekdays (same every year)
 * - saints: proper of saints and other memorials, feasts and solemnities
 * - votive: votive masses the source offered as options (keyed by a slug)
 */
export const COLLECTIONS = [
  "year-a",
  "year-b",
  "year-c",
  "weekday-1",
  "weekday-2",
  "seasonal",
  "saints",
  "votive",
];
const sundayCycles = { YEAR_A: "a", YEAR_B: "b", YEAR_C: "c" };
const weekdayCycles = { YEAR_1: "1", YEAR_2: "2" };
// Proper-of-time solemnities whose readings do not change with the cycle.
const fixedReadings = new Set([
  "nativity_of_the_lord",
  "mary_mother_of_god",
  "epiphany_of_the_lord",
  "easter_sunday",
]);
const octave = /^easter_(monday|tuesday|wednesday|thursday|friday|saturday)$/;

/**
 * @param {{id: string, rank: string, seasons: string[], cycles: Record<string, string>}} day romcal day
 * @returns {{collection: string, key: string}}
 */
export function lectionaryKey(day) {
  const { id, rank, cycles } = day;
  if (cycles.properCycle === "PROPER_OF_SAINTS" || rank === "MEMORIAL")
    return { collection: "saints", key: id };
  if (
    !fixedReadings.has(id) &&
    (rank === "SUNDAY" ||
      id === "holy_saturday" ||
      (["SOLEMNITY", "FEAST"].includes(rank) && !octave.test(id)))
  )
    return { collection: `year-${sundayCycles[cycles.sundayCycle]}`, key: id };
  if (rank === "WEEKDAY" && day.seasons.includes("ORDINARY_TIME"))
    return {
      collection: `weekday-${weekdayCycles[cycles.weekdayCycle]}`,
      key: id,
    };
  return { collection: "seasonal", key: id };
}

/** The ferial (weekday) day underneath a memorial, as a romcal-like day. */
export function underlyingWeekday(day) {
  if (!day.weekday) return undefined;
  const weekday =
    typeof day.weekday === "string" ? { id: day.weekday } : day.weekday;
  return {
    id: weekday.id,
    name: weekday.name || weekday.id.replaceAll("_", " "),
    rank: weekday.id.endsWith("_sunday") ? "SUNDAY" : "WEEKDAY",
    isOptional: false,
    seasons: weekday.seasons || day.seasons,
    cycles: { ...day.cycles, ...weekday.cycles, properCycle: "PROPER_OF_TIME" },
  };
}

const calendars = new Map();
/**
 * romcal choices (primary first) for every date of a Gregorian year,
 * with the same options as liturgical-calendar.mjs.
 * @param {number} year
 * @returns {Promise<Record<string, any[]>>}
 */
export async function romcalYear(year) {
  if (!calendars.has(year)) {
    const romcal = new Romcal({
      localizedCalendar: Philippines_En,
      scope: "gregorian",
      epiphanyOnSunday: true,
      ascensionOnSunday: true,
      corpusChristiOnSunday: true,
      outputOptions: { calculateProperties: true },
    });
    calendars.set(year, romcal.generateCalendar(year));
  }
  return calendars.get(year);
}

/**
 * romcal choices for a date, led by any local supplement (e.g. Santo Niño on
 * the third Sunday of January) that liturgical-calendar.mjs also applies.
 * @param {string} date
 */
export async function dayChoices(date) {
  const choices = (await romcalYear(Number(date.slice(0, 4))))[date] || [];
  const d = new Date(`${date}T12:00:00Z`);
  const supplement = settings.supplements.find(
    ({ rule }) =>
      d.getUTCMonth() + 1 === rule.month &&
      d.getUTCDay() === rule.weekday &&
      Math.ceil(d.getUTCDate() / 7) === rule.occurrence,
  );
  if (!supplement || !choices[0]) return choices;
  return [
    {
      id: supplement.id,
      name: supplement.title,
      rank: supplement.category.toUpperCase(),
      isOptional: false,
      seasons: choices[0].seasons,
      cycles: { ...choices[0].cycles, properCycle: "PROPER_OF_TIME" },
    },
    ...choices,
  ];
}

/** Lectionary location of the readings for a date's primary celebration. */
export async function lectionaryKeyForDate(date) {
  const day = (await dayChoices(date)).find((choice) => !choice.isOptional);
  if (!day) throw new Error(`No liturgical day for ${date}`);
  const memorial = day.rank === "MEMORIAL" && underlyingWeekday(day);
  return {
    ...lectionaryKey(day),
    name: day.name,
    // Memorials usually take the weekday readings; offer them as a fallback.
    fallback: memorial ? lectionaryKey(memorial) : undefined,
  };
}
