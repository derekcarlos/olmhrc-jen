/** @typedef {{ id: string, title: string, time: string, all_day?: boolean, date: string, end_date: string, repeat: string, weekday?: number, excluded_dates: string[], excluded_annual_ranges?: {start: string, end: string}[], location?: string, description?: string, category?: string, liturgical_id?: string, replaces_liturgical_id?: string }} CalendarEvent */

/** Validate the month picker even in browsers that display it as a text input.
 * @param {string} value
 */
export function parseCalendarMonth(value) {
  if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  return year >= 1900 && year <= 2100 ? { year, month: month - 1 } : null;
}

/** Sunday lectionary cycle for a displayed month (zero-based).
 * Advent starts on the Sunday falling between November 27 and December 3.
 * @param {number} year @param {number} month
 */
export function liturgicalCycleForMonth(year, month) {
  const advent = new Date(Date.UTC(year, 10, 27));
  advent.setUTCDate(27 + ((7 - advent.getUTCDay()) % 7));
  const cycle = (/** @type {Date} */ day) =>
    ["C", "A", "B"][(year + (day >= advent ? 1 : 0)) % 3];
  const first = cycle(new Date(Date.UTC(year, month, 1)));
  const last = cycle(new Date(Date.UTC(year, month + 1, 0)));
  return {
    label: first === last ? `Year ${first}` : `Year ${first} → ${last}`,
    description:
      first === last
        ? `Sunday readings: Year ${first}`
        : `Sunday readings: Year ${first}; Year ${last} begins on ${formatEventDay(isoDay(advent))}, the First Sunday of Advent.`,
  };
}

/** @param {Date} date */
export function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

/** @param {Date} [now] */
export function manilaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (/** @type {string} */ key) =>
    parts.find((item) => item.type === key)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Full Sunday-first weeks containing the month. Month is zero-based.
 * @param {number} year
 * @param {number} month
 */
export function monthDays(year, month) {
  const start = new Date(Date.UTC(year, month, 1));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 41);
  const days = [];
  for (
    const day = new Date(start);
    day <= end;
    day.setUTCDate(day.getUTCDate() + 1)
  )
    days.push(isoDay(day));
  return days;
}

/** @param {CalendarEvent} event @param {string} day */
function occursOn(event, day) {
  if (event.excluded_dates.includes(day)) return false;
  const monthDay = day.slice(5);
  if (
    event.excluded_annual_ranges?.some(({ start, end }) =>
      start <= end
        ? monthDay >= start && monthDay <= end
        : monthDay >= start || monthDay <= end,
    )
  )
    return false;
  if (event.repeat === "weekly")
    return new Date(`${day}T12:00:00Z`).getUTCDay() === event.weekday;
  if (event.repeat === "yearly") {
    const from = event.date.slice(5),
      to = (event.end_date || event.date).slice(5),
      current = day.slice(5);
    return from <= to
      ? current >= from && current <= to
      : current >= from || current <= to;
  }
  return day >= event.date && day <= (event.end_date || event.date);
}

/** Occurrences only within the requested month, sorted by day/time/title.
 * @param {CalendarEvent[]} events @param {number} year @param {number} month
 */
export function occurrencesForMonth(events, year, month) {
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return monthDays(year, month)
    .filter((day) => day.startsWith(monthPrefix))
    .flatMap((day) =>
      events
        .filter((event) => occursOn(event, day))
        .map((event) => ({ ...event, day })),
    )
    .filter(
      (event, _index, occurrences) =>
        !event.liturgical_id ||
        !occurrences.some(
          (local) =>
            local.day === event.day &&
            local.replaces_liturgical_id === event.liturgical_id,
        ),
    )
    .sort(
      (a, b) =>
        a.day.localeCompare(b.day) ||
        a.time.localeCompare(b.time) ||
        a.title.localeCompare(b.title),
    );
}

/** Keep upcoming events, excluding calendar-only observances and past starts.
 * @template {{day: string, time: string, all_day?: boolean}} T
 * @param {T[]} occurrences
 * @param {Date} [now]
 * @returns {T[]}
 */
export function upcomingOccurrences(occurrences, now = new Date()) {
  const today = manilaToday(now);
  return occurrences.filter(
    (event) =>
      !event.all_day &&
      (event.day > today ||
        (event.day === today &&
          (!event.time ||
            new Date(`${event.day}T${event.time}:00+08:00`).getTime() >=
              now.getTime()))),
  );
}

/** Today and the following six Philippine calendar dates, independent of the grid.
 * @param {CalendarEvent[]} events
 * @param {Date} [now]
 */
export function nextSevenDays(events, now = new Date()) {
  const today = manilaToday(now);
  const start = new Date(`${today}T12:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
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
  const occurrences = [...months.values()].flatMap(([year, month]) =>
    occurrencesForMonth(events, year, month),
  );
  return upcomingOccurrences(occurrences, now).filter(
    (event) => event.day <= isoDay(end),
  );
}

/** @param {string} time @param {boolean} [allDay] */
export function formatEventTime(time, allDay = false) {
  if (allDay) return "All-day observance";
  if (!time) return "Time to be confirmed";
  const [hour, minute] = time.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

/** @param {string} day */
export function formatEventDay(day) {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}
