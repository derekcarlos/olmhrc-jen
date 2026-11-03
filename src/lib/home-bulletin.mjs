import {
  manilaToday,
  isoDay,
  occurrencesForMonth,
  upcomingOccurrences,
} from "./calendar.mjs";

/** Use published chapel schedules, including their exclusions; never invent a time.
 * @param {import('./calendar.mjs').CalendarEvent[]} schedules
 * @param {Date} [now]
 */
export function nextHomeMass(schedules, now = new Date()) {
  const start = new Date(`${manilaToday(now)}T12:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 13);
  const months = new Map();
  for (
    const day = new Date(start);
    day <= end;
    day.setUTCDate(day.getUTCDate() + 1)
  )
    months.set(isoDay(day).slice(0, 7), [
      day.getUTCFullYear(),
      day.getUTCMonth(),
    ]);
  const events = schedules.filter(
    (event) =>
      (event.is_mass === true || event.category === "mass") && !event.all_day,
  );
  const upcoming = upcomingOccurrences(
    [...months.values()].flatMap(([year, month]) =>
      occurrencesForMonth(events, year, month),
    ),
    now,
  );
  return upcoming.find((event) => event.day <= isoDay(end)) || null;
}
export function homeMassDate(day) {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}
