import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  stationsWalkthrough,
  stationsPrayerCatalog,
} from "../src/lib/stations-cross.mjs";

const tl = JSON.parse(readFileSync("src/data/stations-cross-tl.json", "utf8"));
const en = JSON.parse(readFileSync("src/data/stations-cross-en.json", "utf8"));
const rosary = JSON.parse(readFileSync("src/data/rosary-tl.json", "utf8"));

test("Tagalog stations preserve the PDF's fourteen-station order and full prayers", () => {
  assert.deepEqual(
    tl.stations.map((station) => station.id),
    en.stations.map((station) => station.id),
  );
  assert.equal(tl.stations[0].title, "Ang Huling Hapunan");
  assert.equal(tl.stations[13].title, "Ang Muling Pagkabuhay ni Hesus");
  assert.ok(
    tl.stations[0].meditation.startsWith(
      "Panginoong Hesus, minahal mo kami nang lubus-lubusan.",
    ),
  );
  assert.ok(
    tl.stations[13].meditation.includes(
      "Isang hamon ito para sa aming lahat na bumangon",
    ),
  );
  assert.equal(tl.stations[5].reference, "");
  for (const station of tl.stations) {
    assert.ok(station.scripture_text.trim());
    assert.ok(station.meditation.trim());
    assert.doesNotMatch(
      station.scripture_text + station.meditation,
      /A N G B A G O N G|PAGE \d/,
    );
    assert.equal(station.scripture_summary, undefined);
    assert.equal(station.song, undefined);
  }
});

test("Tagalog reading responses are present exactly where they occur in the PDF", () => {
  assert.equal(
    tl.stations.filter((station) => station.reading_response).length,
    13,
  );
  assert.equal(tl.stations[5].reading_response, undefined);
  const response = tl.prayers.find(
    (prayer) => prayer.id === "stations-reading-response",
  );
  assert.equal(
    response.text,
    "℣. Ang Salita ng Diyos.\n\n℟. Salamat sa Diyos.",
  );
  assert.ok(
    tl.prayers
      .find((prayer) => prayer.id === "stations-adoration")
      .text.includes("Muling Pagkabuhay, iniligtas mo ang sandaigdigan."),
  );
});

test("Tagalog uses the same sequence and shared editable Rosary prayers", () => {
  const steps = stationsWalkthrough(tl);
  assert.deepEqual(steps, stationsWalkthrough(en));
  const edited = structuredClone(rosary);
  edited.prayers.find((prayer) => prayer.id === "hail-mary").text =
    "Binagong panalangin.\n\nTugon.";
  const catalog = stationsPrayerCatalog(tl, edited);
  assert.equal(
    catalog.find((prayer) => prayer.id === "hail-mary").text,
    "Binagong panalangin.\n\nTugon.",
  );
  for (const step of steps.filter((step) => step.prayer))
    assert.ok(catalog.some((prayer) => prayer.id === step.prayer));
  for (let index = 0; index < 14; index++)
    assert.deepEqual(
      steps
        .filter((step) => step.station === index)
        .slice(-3)
        .map((step) => step.prayer),
      ["our-father", "hail-mary", "glory-be"],
    );
});
