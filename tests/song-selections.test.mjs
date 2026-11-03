import test from "node:test";
import assert from "node:assert/strict";
import { parseSelections } from "../src/lib/selection-catalog.mjs";
import {
  groupSelections,
  selectionSongPath,
} from "../src/lib/selection-dates.mjs";

const lineup = (id, date, extra = {}) => ({
  id,
  date,
  title: id,
  celebration: "Sunday Mass",
  status: "published",
  readiness: "confirmed",
  items: [{ part: "processional", song: "shared-song", used: true }],
  ...extra,
});
const parse = (data) =>
  parseSelections(data, ["processional", "gloria"], new Set(["shared-song"]));

test("multiple published lineups are allowed while drafts and their unfinished song references stay private", () => {
  const result = parse([
    lineup("nov-8", "2026-11-08"),
    lineup("nov-22", "2026-11-22"),
    lineup("hidden", "", {
      status: "draft",
      items: [{ part: "processional", song: "unpublished-song" }],
    }),
  ]);
  assert.deepEqual(
    result.map((s) => s.id),
    ["nov-8", "nov-22"],
  );
  assert.equal(result[0].readiness, "confirmed");
});
test("published dates, unique IDs/parts, and referenced public songs remain validated", () => {
  assert.throws(() => parse([lineup("blank", "")]), /date/i);
  assert.throws(() => parse([lineup("bad-date", "2026-02-30")]), /date/i);
  assert.throws(
    () => parse([lineup("same", "2026-11-08"), lineup("same", "2026-11-22")]),
    /Duplicate selection/,
  );
  assert.throws(
    () =>
      parse([
        lineup("bad-song", "2026-11-08", {
          items: [{ part: "processional", song: "missing" }],
        }),
      ]),
    /missing or draft song/,
  );
  assert.throws(
    () =>
      parse([
        lineup("bad-parts", "2026-11-08", {
          items: [
            { part: "processional", song: null },
            { part: "processional", song: null },
          ],
        }),
      ]),
    /Duplicate Mass part/,
  );
  assert.equal(
    parse([
      lineup("partial", "2026-11-08", {
        readiness: "preliminary",
        items: [
          { part: "processional", song: null },
          { part: "gloria", song: null, used: false },
        ],
      }),
    ])[0].items.length,
    2,
  );
});
test("Sunday grouping uses Philippine dates, avoids skipping unpublished Sundays and moves past selections automatically", () => {
  const selections = [
    lineup("advent", "2026-11-29"),
    lineup("saints", "2026-11-01"),
    lineup("king", "2026-11-22"),
    lineup("sunday", "2026-11-08"),
  ];
  const initial = groupSelections(selections, new Date("2026-11-03T01:00:00Z"));
  assert.equal(initial.sunday, "2026-11-08");
  assert.equal(initial.featured.id, "sunday");
  assert.deepEqual(
    initial.future.map((s) => s.id),
    ["king", "advent"],
  );
  const after = groupSelections(selections, new Date("2026-11-08T16:00:00Z"));
  assert.equal(after.sunday, "2026-11-15");
  assert.equal(after.featured, null);
  assert.deepEqual(
    after.past.map((s) => s.id),
    ["sunday", "saints"],
  );
  assert.equal(
    groupSelections(selections, new Date("2026-11-08T15:59:59Z")).featured.id,
    "sunday",
  );
  assert.equal(
    groupSelections(selections, new Date("2026-12-31T16:00:00Z")).sunday,
    "2027-01-03",
  );
});
test("publication grouping hides undated drafts and contextual lyric links retain the chosen selection", () => {
  const data = [
    lineup("private", "2026-11-08", { status: "draft" }),
    lineup("future", "2026-11-22"),
  ];
  const group = groupSelections(data, new Date("2026-11-03T01:00:00Z"));
  assert.equal(group.featured, null);
  assert.deepEqual(
    group.future.map((s) => s.id),
    ["future"],
  );
  assert.equal(
    selectionSongPath("christ-the-king-2026", "shared-song"),
    "/songs/selections/christ-the-king-2026/shared-song",
  );
  assert.equal(
    selectionSongPath(null, "shared-song", "/chapel/"),
    "/chapel/songs/shared-song",
  );
});
