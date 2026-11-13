import test from "node:test";
import assert from "node:assert/strict";
import { parseChoirPractice, choirPracticePath } from "../src/lib/choir-practice.mjs";

test("practice list keeps editorial order without dates or Mass parts", () => {
  const data = { title: "Choir practice", items: [{ song: "advent-two", note: "Week 2" }, { song: "advent-one" }, { song: "gloria" }] };
  const result = parseChoirPractice(data, new Set(["advent-one", "advent-two", "gloria"]));
  assert.deepEqual(result.items.map(i => i.song), ["advent-two", "advent-one", "gloria"]);
  assert.equal(result.items[1].note, "");
  assert.equal(result.items[0].note, "Week 2");
});
test("empty practice list is valid but missing, draft and duplicate songs are rejected", () => {
  assert.deepEqual(parseChoirPractice({ title: "Practice", items: [] }, new Set()).items, []);
  assert.throws(() => parseChoirPractice({ title: "Practice", items: [{ song: "missing" }] }, new Set()), /missing or draft song: missing/);
  assert.throws(() => parseChoirPractice({ title: "Practice", items: [{ song: "one" }, { song: "one" }] }, new Set(["one"])), /Duplicate practice song: one/);
});
test("practice song links preserve deployment base and separate lineup routes", () => {
  assert.equal(choirPracticePath(), "/songs/practice");
  assert.equal(choirPracticePath("advent-one", "/chapel/"), "/chapel/songs/practice/advent-one");
});
