import test from "node:test";
import assert from "node:assert/strict";
import {
  massInvitation,
  massCalendarFile,
} from "../src/lib/mass-invitation.mjs";

const mass = {
  id: "sunday-mass",
  title: "Sunday Mass",
  day: "2026-11-08",
  time: "15:30",
  location: "Our Lady of the Most Holy Rosary Chapel",
  description: "Join our community.",
};

test("the date sheet presents the selected Philippine date and handles unconfirmed schedules", () => {
  const info = massInvitation(mass);
  assert.equal(info.number, "08");
  assert.equal(info.month, "Nov");
  assert.equal(info.weekday, "Sunday");
  assert.equal(info.year, "2026");
  assert.equal(info.dateTime, "2026-11-08T15:30:00+08:00");
  assert.equal(massInvitation({ ...mass, time: "" }).dateTime, "2026-11-08");
  assert.equal(massInvitation(null).number, "—");
  assert.equal(massInvitation(null).dateTime, "");
});

test("calendar export saves one occurrence at its correct UTC time without a guessed end time", () => {
  const file = massCalendarFile(mass, new Date("2026-11-03T01:02:03Z"));
  assert.equal(file.filename, "chapel-mass-2026-11-08.ics");
  assert.ok(file.content.includes("DTSTART:20261108T073000Z\r\n"));
  assert.ok(file.content.includes("DTSTAMP:20261103T010203Z\r\n"));
  assert.ok(file.content.includes("SUMMARY:Sunday Mass\r\n"));
  assert.ok(
    file.content.includes(
      "LOCATION:Our Lady of the Most Holy Rosary Chapel\r\n",
    ),
  );
  assert.equal(file.content.includes("DTEND"), false);
  assert.equal(file.content.includes("RRULE"), false);
  assert.ok(file.content.endsWith("END:VCALENDAR\r\n"));
  assert.equal(massCalendarFile(null), null);
  assert.equal(massCalendarFile({ ...mass, time: "" }), null);
  assert.equal(massCalendarFile({ ...mass, all_day: true }), null);
});

test("calendar text escapes separators and folds Unicode safely without property injection", () => {
  const title =
    "Misa, kapayapaan; panalangin \\ " +
    "Biñan 💛 ".repeat(15) +
    "\nBEGIN:VALARM";
  const file = massCalendarFile({ ...mass, title });
  for (const line of file.content.split("\r\n"))
    assert.ok(Buffer.byteLength(line, "utf8") <= 75);
  const unfolded = file.content.replace(/\r\n /g, "");
  assert.ok(
    unfolded.includes("SUMMARY:Misa\\, kapayapaan\\; panalangin \\\\ "),
  );
  assert.ok(unfolded.includes("Biñan 💛"));
  assert.ok(unfolded.includes("\\nBEGIN:VALARM"));
  assert.equal(unfolded.includes("\r\nBEGIN:VALARM"), false);
  const uid = (value) => value.match(/^UID:(.+)$/m)[1];
  assert.equal(
    uid(file.content),
    uid(
      massCalendarFile({ ...mass, title }, new Date("2026-11-04T01:00:00Z"))
        .content,
    ),
  );
});
