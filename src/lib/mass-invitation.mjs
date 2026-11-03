import { formatEventDay } from "./calendar.mjs";

/** @typedef {import('./calendar.mjs').CalendarEvent & {day: string}} MassOccurrence */

/** @param {MassOccurrence | null} mass */
export function massInvitation(mass) {
  if (!mass)
    return {
      number: "—",
      month: "Next",
      weekday: "Celebration",
      year: "",
      dateLabel: "Mass schedule",
      dateTime: "",
    };
  const date = new Date(`${mass.day}T12:00:00Z`);
  const part = (options) =>
    new Intl.DateTimeFormat("en-PH", { ...options, timeZone: "UTC" }).format(
      date,
    );
  return {
    number: part({ day: "2-digit" }),
    month: part({ month: "short" }),
    weekday: part({ weekday: "long" }),
    year: part({ year: "numeric" }),
    dateLabel: formatEventDay(mass.day),
    dateTime: mass.time ? `${mass.day}T${mass.time}:00+08:00` : mass.day,
  };
}

const calendarText = (value) =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
const utcStamp = (date) =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

// RFC 5545: fold at 75 UTF-8 octets without splitting a code point.
// https://www.rfc-editor.org/rfc/rfc5545.html#section-3.1
function foldLine(value) {
  const encoder = new TextEncoder();
  const lines = [];
  let line = "",
    bytes = 0;
  for (const char of value) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) {
      lines.push(line);
      line = " ";
      bytes = 1;
    }
    line += char;
    bytes += size;
  }
  lines.push(line);
  return lines.join("\r\n");
}

/** Export only this occurrence, with its real start and no invented duration.
 * @param {MassOccurrence | null} mass @param {Date} [now]
 */
export function massCalendarFile(mass, now = new Date()) {
  if (!mass || !mass.time || mass.all_day) return null;
  const start = new Date(`${mass.day}T${mass.time}:00+08:00`);
  if (Number.isNaN(start.getTime())) return null;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rosarium//Chapel Mass//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${encodeURIComponent(mass.id)}-${mass.day}@holyrosarychapel.com`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(start)}`,
    `SUMMARY:${calendarText(mass.title)}`,
    ...(mass.location ? [`LOCATION:${calendarText(mass.location)}`] : []),
    `DESCRIPTION:${calendarText([mass.description, "Saved from Rosarium. Check the chapel calendar for schedule changes."].filter(Boolean).join("\n\n"))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return {
    filename: `chapel-mass-${mass.day}.ics`,
    content: lines.map(foldLine).join("\r\n") + "\r\n",
  };
}
