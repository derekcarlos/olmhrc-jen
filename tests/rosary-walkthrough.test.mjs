import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  rosaryWalkthrough,
  suggestedMysteries,
} from "../src/lib/rosary-walkthrough.mjs";
const data = JSON.parse(readFileSync("src/data/rosary.json", "utf8"));

test("each set has a complete opening, five ten-bead decades, and closing prayers", () => {
  for (const set of data.mysteries) {
    const steps = rosaryWalkthrough(set);
    assert.equal(steps.length, 81);
    const count = (id) => steps.filter((step) => step.prayer === id).length;
    assert.equal(count("hail-mary"), 53);
    assert.equal(count("our-father"), 6);
    assert.equal(count("glory-be"), 6);
    assert.equal(count("fatima"), 5);
    assert.equal(count("sign-of-cross"), 2);
    assert.deepEqual(
      steps.slice(0, 7).map((step) => step.prayer),
      [
        "sign-of-cross",
        "apostles-creed",
        "our-father",
        "hail-mary",
        "hail-mary",
        "hail-mary",
        "glory-be",
      ],
    );
    assert.deepEqual(
      steps.slice(-4).map((step) => step.prayer),
      ["hail-holy-queen", "pray-for-us", "rosary-prayer", "sign-of-cross"],
    );
    for (let decade = 0; decade < 5; decade++) {
      const group = steps.filter((step) => step.decade === decade);
      assert.equal(group[0].mystery, set.items[decade].title);
      assert.equal(group[0].kind, "mystery");
      assert.deepEqual(
        group
          .filter((step) => step.prayer === "hail-mary")
          .map((step) => step.bead),
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      );
      assert.equal(group.at(-1).optional, true);
    }
    for (const step of steps.filter((step) => step.prayer))
      assert.ok(
        data.prayers.some((prayer) => prayer.id === step.prayer),
        step.prayer,
      );
  }
});

test("the customary mystery suggestion uses the Philippine weekday at midnight", () => {
  assert.equal(
    suggestedMysteries(new Date("2026-11-04T15:59:00Z")).id,
    "glorious",
  );
  assert.equal(
    suggestedMysteries(new Date("2026-11-04T16:00:00Z")).id,
    "luminous",
  );
});
