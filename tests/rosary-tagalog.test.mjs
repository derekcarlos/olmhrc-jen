import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rosaryWalkthrough } from "../src/lib/rosary-walkthrough.mjs";

const catalog = JSON.parse(readFileSync("src/data/rosary-tl.json", "utf8"));
test("the editable Tagalog catalog has complete prayer texts and unique stable identifiers", () => {
  const ids = catalog.prayers.map((prayer) => prayer.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of [
    "sign-of-cross",
    "opening-verses",
    "apostles-creed",
    "our-father",
    "glory-be",
    "hail-mary",
    "fatima",
    "hail-holy-queen",
    "pray-for-us",
    "litany-opening",
    "litany-trinity",
    "litany-mary",
    "litany-lamb-of-god",
    "rosary-prayer",
    "closing-responses",
  ]) {
    const prayer = catalog.prayers.find((prayer) => prayer.id === id);
    assert(prayer, id);
    assert(prayer.title.trim(), id);
    assert(prayer.text.trim(), id);
    assert(prayer.text.includes("\n"), `${id}: preserve prayer line breaks`);
    assert(
      !prayer.text.includes("\\n"),
      `${id}: use real JSON newline escapes`,
    );
  }
});

test("all four Tagalog walkthroughs include the appendix litany and final responses", () => {
  assert.equal(catalog.mysteries.length, 4);
  for (const set of catalog.mysteries) {
    const steps = rosaryWalkthrough(set, "tl");
    assert.equal(
      steps.filter((step) => step.prayer === "hail-mary").length,
      53,
    );
    assert.deepEqual(
      steps.slice(-9).map((step) => step.prayer),
      [
        "hail-holy-queen",
        "pray-for-us",
        "litany-opening",
        "litany-trinity",
        "litany-mary",
        "litany-lamb-of-god",
        "rosary-prayer",
        "closing-responses",
        "sign-of-cross",
      ],
    );
    assert.match(steps[0].instruction, /krus/i);
    assert(
      !steps.some((step) =>
        /Pray|Decade|Announce|Hold|Make|Conclude/.test(step.instruction),
      ),
    );
    for (const step of steps)
      if (step.prayer)
        assert(
          catalog.prayers.some((prayer) => prayer.id === step.prayer),
          step.prayer,
        );
    assert.match(
      steps.find((step) => step.kind === "mystery").announcement,
      /unang misteryo/,
    );
    assert.equal(set.items.length, 5);
  }
});

test("the Marian versicle and response follow Aba po Santa Mariang Hari before the litany", () => {
  const prayer = catalog.prayers.find((prayer) => prayer.id === "pray-for-us");
  assert.equal(
    prayer?.text,
    "℣. Ipanalangin mo kami, O Santang Ina ng Diyos.\n℟. Nang kami'y maging karapatdapat sa mga pangako ni Kristo. Siya Nawa.",
  );
  for (const set of catalog.mysteries) {
    const steps = rosaryWalkthrough(set, "tl");
    const index = steps.findIndex((step) => step.prayer === "pray-for-us");
    assert.equal(steps[index - 1].prayer, "hail-holy-queen");
    assert.equal(steps[index + 1].prayer, "litany-opening");
  }
});

test("the litany separates opening responses, the Trinity, Marian invocations and the Lamb of God", () => {
  const prayer = (id) => catalog.prayers.find((prayer) => prayer.id === id);
  const opening = prayer("litany-opening");
  assert(opening);
  assert.equal((opening.text.match(/℣\./g) || []).length, 4);
  assert.equal((opening.text.match(/℟\./g) || []).length, 4);
  assert.equal(opening.text.split("\n\n").length, 4);
  assert.match(
    opening.text,
    /℣\. Kristo, pakinggan mo kami\.\n℟\. Kristo, pakapakinggan mo kami\.$/,
  );
  const trinity = prayer("litany-trinity");
  assert.equal(
    trinity.instruction,
    "Ang isasagot sa namumuno sa mga sumusunod ay: Maawa ka sa amin.",
  );
  assert.equal((trinity.text.match(/℣\./g) || []).length, 4);
  assert.doesNotMatch(trinity.text, /℟|maawa ka sa amin/i);
  assert.match(trinity.text, /Diyos Ama sa Langit/);
  assert.match(trinity.text, /Banal na Trinidad, iisang Diyos/);
  const mary = prayer("litany-mary");
  assert.equal(
    mary.instruction,
    "Ang isasagot sa namumuno sa mga sumusunod ay: Ipanalangin mo kami.",
  );
  assert.doesNotMatch(mary.text, /℟|Ipanalangin mo kami/);
  assert(mary.text.startsWith("℣. Santa Maria"));
  assert(mary.text.endsWith("℣. Reyna ng kapayapaan"));
  const lamb = prayer("litany-lamb-of-god");
  assert.equal((lamb.text.match(/℣\./g) || []).length, 3);
  assert.equal((lamb.text.match(/℟\./g) || []).length, 3);
});
