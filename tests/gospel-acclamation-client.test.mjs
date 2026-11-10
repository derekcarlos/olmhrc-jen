import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { acclamationView, prepareGospelAcclamation } from "../src/lib/gospel-acclamation-client.mjs";

const records = [
  { date: "2026-11-15", reading_date: "2026-11-15", status: "available", setting: "alleluia", celebration: "Sunday", context: "Pagbasa para sa araw na ito", verse: "First line\nSecond line", reference: "Juan 15", source_url: "https://www.awitatpapuri.com/2026/11/15/sample/" },
  { date: "2026-11-16", reading_date: "2026-11-16", status: "available", setting: "alleluia", celebration: "Monday", context: "Pagbasa para sa araw na ito", verse: "Monday verse", reference: "Lucas 2", source_url: "https://www.awitatpapuri.com/2026/11/16/sample/" },
  { date: "2027-02-10", reading_date: "2027-02-10", status: "available", setting: "lent", celebration: "Ash Wednesday", verse: "Lenten verse", reference: "Salmo 94" },
  { date: "2026-12-15", reading_date: "2026-12-16", status: "available", setting: "alleluia", celebration: "December 16", context: "Simbang Gabi · 7:30 PM", verse: "Simbang Gabi verse" },
];
const calendar = { schema_version: 1, records };

test("Manila date selection changes at midnight and never selects yesterday or tomorrow for gaps", () => {
  assert.equal(acclamationView(calendar, "alleluia", new Date("2026-11-15T15:59:59Z")).verse, "First line\nSecond line");
  assert.equal(acclamationView(calendar, "alleluia", new Date("2026-11-15T16:00:00Z")).verse, "Monday verse");
  assert.equal(acclamationView(calendar, "alleluia", new Date("2026-11-17T00:00:00Z")).verse, "");
  const simbang = acclamationView(calendar, "alleluia", new Date("2026-12-15T00:00:00Z"));
  assert.equal(simbang.date, "2026-12-15");
  assert.equal(simbang.reading_date, "2026-12-16");
});

test("only the appropriate seasonal setting displays today's verse", () => {
  const day = new Date("2027-02-10T00:00:00Z");
  assert.equal(acclamationView(calendar, "lent", day).verse, "Lenten verse");
  const wrong = acclamationView(calendar, "alleluia", day);
  assert.equal(wrong.verse, "");
  assert.equal(wrong.other_song, "/songs/gospel-acclamation-misa-pasyon");
  const ordinary = acclamationView(calendar, "lent", new Date("2026-11-15T00:00:00Z"));
  assert.equal(ordinary.verse, "");
  assert.equal(ordinary.other_song, "/songs/gospel-acclamation-missa-magnificat");
});

test("the song DOM updates on return to the tab, preserves line breaks, and clears expired verses", () => {
  const dom = new JSDOM(`<section data-gospel-acclamation data-setting="alleluia" data-base="">
    <script type="application/json" data-acclamation-data>${JSON.stringify(calendar)}</script>
    <time data-acclamation-date></time><p data-acclamation-celebration></p><p data-acclamation-context></p>
    <p data-acclamation-message></p><div data-acclamation-body><p data-acclamation-verse></p><p data-acclamation-reference></p><a data-acclamation-source>Source</a></div><a data-acclamation-other></a>
  </section>`, { url: "http://localhost:4321/songs/gospel-acclamation-missa-magnificat" });
  const root = dom.window.document.querySelector("section");
  let now = new Date("2026-11-15T15:59:59Z");
  const stop = prepareGospelAcclamation(root, () => now);
  try {
    assert.equal(root.querySelector("[data-acclamation-verse]").textContent, "First line\nSecond line");
    now = new Date("2026-11-15T16:00:00Z");
    dom.window.dispatchEvent(new dom.window.Event("focus"));
    assert.equal(root.querySelector("[data-acclamation-verse]").textContent, "Monday verse");
    assert.match(root.querySelector("[data-acclamation-source]").href, /2026\/11\/16/);
    now = new Date("2026-11-17T00:00:00Z");
    dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange"));
    assert.equal(root.querySelector("[data-acclamation-body]").hidden, true);
    assert.equal(root.querySelector("[data-acclamation-verse]").textContent, "");
    assert.equal(root.querySelector("[data-acclamation-message]").hidden, false);
    stop();
    now = new Date("2026-11-15T00:00:00Z");
    dom.window.dispatchEvent(new dom.window.Event("focus"));
    assert.equal(root.querySelector("[data-acclamation-verse]").textContent, "");
  } finally { stop(); dom.window.close(); }
});
