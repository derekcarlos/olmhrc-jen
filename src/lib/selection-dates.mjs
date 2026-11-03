import { manilaToday, isoDay } from "./calendar.mjs";

/** @template {{id:string,date:string,status:string}} T
 * @param {T[]} selections @param {Date} [now]
 */
export function groupSelections(selections, now = new Date()) {
  const today = manilaToday(now);
  const day = new Date(`${today}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + ((7 - day.getUTCDay()) % 7));
  const sunday = isoDay(day);
  const published = selections
    .filter((s) => s.status === "published" && s.date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const featured = published.find((s) => s.date === sunday) || null;
  return {
    sunday,
    featured,
    future: published.filter((s) => s.date >= today && s.id !== featured?.id),
    past: published.filter((s) => s.date < today).reverse(),
  };
}

/** @param {string|null|undefined} selectionId @param {string} songId @param {string} [base] */
export function selectionSongPath(selectionId, songId, base = "") {
  const prefix = base.replace(/\/+$/, "");
  return selectionId
    ? `${prefix}/songs/selections/${encodeURIComponent(selectionId)}/${encodeURIComponent(songId)}`
    : `${prefix}/songs/${encodeURIComponent(songId)}`;
}
