// Server/build-only: never import this module into calendar-client.ts.
import { Romcal } from "romcal";
import { Philippines_En } from "@romcal/calendar.philippines";
import settings from "../config/liturgical-calendar.json" with { type: "json" };
import { isoDay } from "./calendar.mjs";

export const MIN_CALENDAR_YEAR = 1900;
export const MAX_CALENDAR_YEAR = 2100;
const ranks = { SOLEMNITY: "solemnity", FEAST: "feast", MEMORIAL: "memorial" };
const cache = new Map();

/** @param {number} year */
export async function getLiturgicalYear(year) {
  if (
    !Number.isInteger(year) ||
    year < MIN_CALENDAR_YEAR ||
    year > MAX_CALENDAR_YEAR
  )
    throw new RangeError(
      "Calendar year must be an integer between 1900 and 2100",
    );
  if (!cache.has(year)) {
    const pending = generate(year).catch((error) => {
      cache.delete(year);
      throw error;
    });
    cache.set(year, pending);
  }
  return cache.get(year);
}

/** @param {number} year */
async function generate(year) {
  const romcal = new Romcal({
    localizedCalendar: Philippines_En,
    scope: "gregorian",
    epiphanyOnSunday: true,
    ascensionOnSunday: true,
    corpusChristiOnSunday: true,
    outputOptions: { calculateProperties: true },
  });
  const calendar = await romcal.generateCalendar(year);
  const events = [];
  for (const choices of Object.values(calendar)) {
    // The first entry is the primary day; alternatives are not additional obligatory observances.
    const day = choices[0];
    if (!day || day.isOptional || settings.excluded_ids.includes(day.id))
      continue;
    const presentation = settings.presentation[day.id] || {};
    const rank = ranks[day.rank];
    if (!rank && !presentation.include) continue;
    events.push(
      record(
        day.id,
        day.date,
        presentation.title || day.name,
        presentation.category || rank,
        presentation.description ||
          `A ${rank} in the liturgical calendar of the Philippines.`,
      ),
    );
  }
  // Small, source-backed Philippine rules missing from the pinned plugin.
  for (const supplement of settings.supplements) {
    if (events.some((event) => event.liturgical_id === supplement.id)) continue;
    const { month, weekday, occurrence } = supplement.rule;
    const first = new Date(Date.UTC(year, month - 1, 1));
    first.setUTCDate(
      1 + ((weekday - first.getUTCDay() + 7) % 7) + (occurrence - 1) * 7,
    );
    const date = isoDay(first);
    // The local Sunday feast replaces that day's lower-ranking primary observance.
    const index = events.findIndex((event) => event.date === date);
    if (index >= 0) events.splice(index, 1);
    events.push(
      record(
        supplement.id,
        date,
        supplement.title,
        supplement.category,
        supplement.description,
      ),
    );
  }
  events.sort(
    (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
  );
  return {
    year,
    calendar: "philippines",
    generator: "romcal",
    version: Romcal.getVersion(),
    events,
  };
}

/** @param {string} id @param {string} date @param {string} title @param {string} category @param {string} description
 * @returns {import('./calendar.mjs').CalendarEvent}
 */
function record(id, date, title, category, description) {
  return {
    id: `romcal-${id}`,
    liturgical_id: id,
    title,
    description,
    category,
    date,
    end_date: "",
    repeat: "none",
    excluded_dates: [],
    all_day: true,
    time: "",
    location: "",
  };
}
