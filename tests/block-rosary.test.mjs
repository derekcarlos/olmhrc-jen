import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  blockRosaryCatalog,
  blockRosaryWalkthrough,
} from "../src/lib/block-rosary.mjs";

const english = JSON.parse(readFileSync("src/data/rosary.json", "utf8"));

test("both English guides share Litany text while Block Rosary keeps one Litany after the collect", () => {
  const edited = structuredClone(english);
  const litany = edited.prayers.find((p) => p.id === "litany-opening");
  assert.ok(litany, "the English Rosary catalog contains the shared Litany");
  litany.text = "Edited shared invocation.";
  const catalog = blockRosaryCatalog(edited);
  assert.equal(catalog.prayers.find((p) => p.id === litany.id).text, litany.text);
  for (const set of edited.mysteries) {
    const ids = blockRosaryWalkthrough(set).map((step) => step.prayer);
    for (const prayer of edited.prayers.filter((p) => p.id.startsWith("litany-")))
      assert.equal(ids.filter((id) => id === prayer.id).length, 1, prayer.id);
    assert.ok(ids.indexOf("litany-opening") > ids.indexOf("rosary-prayer"));
  }
});

test("Block Rosary uses editable shared English prayers and all twenty meditations", () => {
  const edited = structuredClone(english);
  edited.prayers.find((p) => p.id === "hail-mary").text =
    "Edited first half.\n\nEdited response.";
  const catalog = blockRosaryCatalog(edited);
  assert.equal(catalog.mysteries, edited.mysteries);
  assert.equal(
    catalog.prayers.find((p) => p.id === "hail-mary").text,
    "℣. Edited first half.\n\n℟. Edited response.",
  );
  assert.equal(
    catalog.prayers.find((p) => p.id === "apostles-creed").text,
    edited.prayers.find((p) => p.id === "apostles-creed").text,
  );
  assert.equal(
    new Set(catalog.prayers.map((p) => p.id)).size,
    catalog.prayers.length,
  );
});

test("shared leader and response prayers preserve a blank line between their two parts", () => {
  const catalog = blockRosaryCatalog(english);
  for (const id of ["hail-mary", "our-father", "glory-be"]) {
    const original = english.prayers.find((prayer) => prayer.id === id).text;
    const [leader, ...response] = original.split(/\n\s*\n/);
    assert.equal(
      catalog.prayers.find((prayer) => prayer.id === id).text,
      `℣. ${leader}\n\n℟. ${response.join("\n\n")}`,
      id,
    );
  }
});

test("all mystery sets preserve the booklet order, full Rosary, litany, and host-only prayers", () => {
  const catalog = blockRosaryCatalog(english);
  for (const set of catalog.mysteries) {
    const steps = blockRosaryWalkthrough(set);
    const ids = steps.map((s) => s.prayer);
    assert.equal(ids[0], "acceptance");
    assert.equal(steps[0].optional, true);
    assert.match(steps[0].instruction, /receiving the image/i);
    for (const [before, after] of [
      ["acceptance", "mary-comes"],
      ["mary-comes", "immaculate-mother"],
      ["immaculate-mother", "welcome-mary"],
      ["welcome-mary", "mary-said"],
      ["mary-said", "opening-verses"],
      ["rosary-prayer", "litany-opening"],
      ["litany-collect", "family-prayer"],
      ["family-prayer", "give-thanks"],
      ["give-thanks", "farewell"],
    ])
      assert.ok(
        ids.indexOf(before) < ids.indexOf(after),
        `${before} before ${after}`,
      );
    assert.equal(ids.filter((id) => id === "hail-mary").length, 53);
    assert.equal(ids.filter((id) => id === "our-father").length, 6);
    assert.equal(steps.filter((s) => s.kind === "mystery").length, 5);
    for (let decade = 0; decade < 5; decade++) {
      const ending = steps.filter((s) => s.decade === decade).slice(-3);
      assert.deepEqual(
        ending.map((s) => s.prayer),
        ["glory-be", "fatima", "miraculous-medal"],
      );
      assert.equal(ending[1].optional, false);
      assert.equal(ending[2].optional, true);
    }
    assert.equal(steps.find((s) => s.prayer === "farewell").optional, true);
    assert.equal(ids.at(-1), "sign-of-cross");
    for (const step of steps.filter((s) => s.prayer))
      assert.ok(
        catalog.prayers.some((p) => p.id === step.prayer),
        step.prayer,
      );
  }
});

test("litany has complete invocations, group response rubrics, and congregational responses", () => {
  const prayers = blockRosaryCatalog(english).prayers;
  const trinity = prayers.find((p) => p.id === "litany-trinity");
  assert.match(trinity.instruction, /Have mercy on us/);
  assert.equal(trinity.text.match(/℣\./g).length, 4);
  const mary = prayers.filter((p) => p.id.startsWith("litany-mary-"));
  assert.equal(mary.flatMap((p) => p.text.match(/℣\./g)).length, 54);
  for (const prayer of mary) {
    assert.match(prayer.instruction, /Pray for us/);
    assert.doesNotMatch(prayer.text, /℟/);
  }
  assert.match(
    prayers.find((p) => p.id === "litany-lamb-of-god").text,
    /℟\. Have mercy on us/,
  );
});
