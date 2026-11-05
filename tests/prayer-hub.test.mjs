import test from "node:test";
import assert from "node:assert/strict";
import { prayerHubState } from "../src/lib/prayer-hub.mjs";

test("the invitation follows the Philippine date and opens both guides at the prayer panel", () => {
  const before = prayerHubState(new Date("2026-11-04T15:59:00Z"));
  const after = prayerHubState(new Date("2026-11-04T16:00:00Z"));
  assert.equal(before.mysteryId, "glorious");
  assert.equal(after.mysteryId, "luminous");
  assert.equal(after.date, "2026-11-05");
  assert.equal(after.weekday, "Thursday");
  assert.equal(after.mysteries.length, 5);
  assert.equal(after.tagalogHref, "/prayers/ang-banal-na-rosaryo#prayer-guide");
  assert.equal(
    after.englishHref,
    "/prayers/how-to-pray-the-holy-rosary#prayer-guide",
  );
});

test("every weekday offers the complete mystery set from the existing Rosary catalog", () => {
  for (let day = 1; day <= 7; day++) {
    const invitation = prayerHubState(new Date(`2026-11-0${day}T04:00:00Z`));
    assert.equal(invitation.mysteries.length, 5);
    assert(invitation.mysteries.every((title) => title.trim()));
    assert(invitation.tagalogTitle.startsWith("Mga Misteryo ng "));
    assert(invitation.dateLabel.includes("2026"));
    assert.equal(
      new URL(invitation.tagalogHref, "https://holyrosarychapel.com").hash,
      "#prayer-guide",
    );
    assert.equal(
      new URL(invitation.englishHref, "https://holyrosarychapel.com").hash,
      "#prayer-guide",
    );
  }
});
