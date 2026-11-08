import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  stationsWalkthrough,
  stationsPrayerCatalog,
} from "../src/lib/stations-cross.mjs";

const devotion = JSON.parse(
  readFileSync("src/data/stations-cross-en.json", "utf8"),
);
const rosary = JSON.parse(readFileSync("src/data/rosary.json", "utf8"));

test("the New Version has fourteen stations from the Last Supper through the Resurrection", () => {
  assert.equal(devotion.stations.length, 14);
  assert.match(devotion.stations[0].title, /Last Supper/);
  assert.equal(devotion.stations.at(-1).title, "Jesus Rises from Death");
  assert.equal(
    new Set(devotion.stations.map((station) => station.id)).size,
    14,
  );
  for (const station of devotion.stations) {
    for (const key of ["title", "scripture_text", "meditation"])
      assert.ok(station[key]?.trim(), `${station.id}: ${key}`);
  }
  assert.doesNotMatch(devotion.content_note, /original Rosarium/i);
  assert.ok(
    devotion.stations[0].meditation.includes(
      "Lord Jesus, you loved us to the utmost. * You loved us to the end.",
    ),
  );
  assert.ok(
    devotion.stations[13].meditation.endsWith("Thank you for rising for us."),
  );
  assert.equal(devotion.stations[5].reference, "");
  assert.ok(
    devotion.stations.every((station) => !Object.hasOwn(station, "song")),
  );
  assert.ok(
    devotion.stations.every(
      (station) => !Object.hasOwn(station, "scripture_summary"),
    ),
  );
});

test("each station ends with the Our Father, Hail Mary, and Glory Be without songs or added responses", () => {
  const steps = stationsWalkthrough(devotion);
  assert.equal(steps.length, 64);
  assert.deepEqual(
    steps.slice(0, 2).map((step) => step.prayer),
    ["sign-of-cross", "stations-opening"],
  );
  for (let station = 0; station < 14; station++) {
    const section = steps.filter((step) => step.station === station);
    assert.equal(section.length, 4);
    assert.equal(section[0].kind, "station");
    assert.deepEqual(
      section.slice(1).map((step) => step.prayer),
      ["our-father", "hail-mary", "glory-be"],
    );
  }
  assert.deepEqual(
    steps.slice(-6).map((step) => step.prayer),
    [
      "our-father",
      "hail-mary",
      "glory-be",
      "stations-closing",
      "stations-blessing",
      "sign-of-cross",
    ],
  );
  assert.ok(
    steps.every((step) => step.station === null || step.phase === "stations"),
  );
});

test("supplied opening and final prayers retain leader responses and the blessing", () => {
  const opening = devotion.prayers.find(
    (prayer) => prayer.id === "stations-opening",
  );
  assert.ok(
    opening.text.startsWith(
      "℣. Lord Jesus Christ, as we gather here to meditate on your Paschal Mystery",
    ),
  );
  assert.ok(opening.text.endsWith("\n\n℟. Amen!"));
  assert.ok(
    devotion.prayers
      .find((prayer) => prayer.id === "stations-closing")
      .text.startsWith("℣. All-powerful and ever-living God"),
  );
  assert.ok(
    devotion.prayers
      .find((prayer) => prayer.id === "stations-blessing")
      .text.includes("descend upon us and with us remain always."),
  );
});

test("standard prayers are shared with the English Rosary and do not need a second copy", () => {
  const edited = structuredClone(rosary);
  edited.prayers.find((prayer) => prayer.id === "hail-mary").text =
    "Edited prayer.\n\nEdited response.";
  const catalog = stationsPrayerCatalog(devotion, edited);
  assert.equal(
    catalog.find((prayer) => prayer.id === "hail-mary").text,
    "Edited prayer.\n\nEdited response.",
  );
  assert.equal(
    new Set(catalog.map((prayer) => prayer.id)).size,
    catalog.length,
  );
  for (const step of stationsWalkthrough(devotion).filter(
    (step) => step.prayer,
  ))
    assert.ok(
      catalog.some((prayer) => prayer.id === step.prayer),
      step.prayer,
    );
});
