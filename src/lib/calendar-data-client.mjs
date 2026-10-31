/** @typedef {{year: number, events: import('./calendar.mjs').CalendarEvent[]}} LiturgicalYearData */

/** @param {unknown} value @param {number} year @returns {value is LiturgicalYearData} */
function validYearData(value, year) {
  if (
    !value ||
    typeof value !== "object" ||
    !("year" in value) ||
    value.year !== year ||
    !("events" in value) ||
    !Array.isArray(value.events)
  )
    return false;
  if (!value.events.length) return false;
  return value.events.every((event) => {
    if (
      !event ||
      typeof event !== "object" ||
      typeof event.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(event.date) ||
      !event.date.startsWith(`${year}-`)
    )
      return false;
    const date = new Date(`${event.date}T12:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === event.date &&
      typeof event.id === "string" &&
      !!event.id &&
      typeof event.liturgical_id === "string" &&
      !!event.liturgical_id &&
      typeof event.title === "string" &&
      !!event.title.trim() &&
      typeof event.description === "string" &&
      [
        "solemnity",
        "feast",
        "memorial",
        "christmas",
        "easter",
        "lent",
        "holy-week",
        "advent",
      ].includes(event.category) &&
      event.all_day === true &&
      event.repeat === "none" &&
      event.time === "" &&
      event.location === "" &&
      event.end_date === "" &&
      Array.isArray(event.excluded_dates) &&
      event.excluded_dates.length === 0
    );
  });
}

/** Load only same-site yearly JSON; cache successful and concurrent requests.
 * @param {string} baseUrl @param {LiturgicalYearData} seed @param {typeof fetch} [fetcher]
 */
export function createLiturgicalYearLoader(
  baseUrl,
  seed,
  fetcher = globalThis.fetch,
) {
  const dataUrl = `${baseUrl.replace(/\/?$/, "/")}calendar-data/`;
  if (!validYearData(seed, seed.year))
    throw new Error("Invalid initial liturgical calendar data");
  const cache = new Map([[seed.year, seed]]);
  /** @type {Map<number, Promise<LiturgicalYearData>>} */
  const pending = new Map();
  return {
    /** @param {number} year @returns {Promise<LiturgicalYearData>} */
    async load(year) {
      if (!Number.isInteger(year) || year < 1900 || year > 2100)
        throw new RangeError("Unsupported calendar year");
      const cached = cache.get(year);
      if (cached) return cached;
      const active = pending.get(year);
      if (active) return active;
      const request = Promise.resolve()
        .then(async () => {
          const response = await fetcher(`${dataUrl}${year}.json`);
          if (!response.ok)
            throw new Error(`Calendar request failed (${response.status})`);
          const data = await response.json();
          if (!validYearData(data, year))
            throw new Error("Invalid liturgical calendar response");
          cache.set(year, data);
          return data;
        })
        .finally(() => pending.delete(year));
      pending.set(year, request);
      return request;
    },
  };
}
