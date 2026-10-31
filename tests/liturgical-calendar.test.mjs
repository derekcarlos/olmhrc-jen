import test from "node:test";
import assert from "node:assert/strict";
import { getLiturgicalYear } from "../src/lib/liturgical-calendar.mjs";

const find = (data, id) => data.events.find((e) => e.liturgical_id === id);

test("generated Philippine JSON supplies movable solemnities and local feasts", async () => {
  const data = await getLiturgicalYear(2027);
  for (const [id, date] of [
    ["epiphany_of_the_lord", "2027-01-03"],
    ["santo_nino", "2027-01-17"],
    ["annunciation_of_the_lord", "2027-04-05"],
    ["ascension_of_the_lord", "2027-05-09"],
    ["pentecost_sunday", "2027-05-16"],
    ["most_holy_trinity", "2027-05-23"],
    ["most_holy_body_and_blood_of_christ", "2027-05-30"],
    ["most_sacred_heart_of_jesus", "2027-06-04"],
    ["lawrence_ruiz_and_companions_martyrs", "2027-09-28"],
    ["pedro_calungsod_martyr", "2027-10-21"],
    ["our_lord_jesus_christ_king_of_the_universe", "2027-11-21"],
  ])
    assert.equal(find(data, id)?.date, date, id);
  assert.equal(find(data, "santo_nino").category, "feast");
  assert.equal(find(data, "pedro_calungsod_martyr").category, "feast");
  assert(
    data.events.every(
      (e) => e.all_day && !e.time && !e.location && e.repeat === "none",
    ),
  );
  assert.equal(
    data.events.length,
    new Set(data.events.map((e) => e.date)).size,
  );
  const serialized = JSON.parse(JSON.stringify(data));
  assert.equal(find(serialized, "all_saints").title, "All Saints");
});

test("transfers and suppressed memorials are recalculated each year", async () => {
  assert.equal(
    find(await getLiturgicalYear(2023), "joseph_spouse_of_mary").date,
    "2023-03-20",
  );
  assert.equal(
    find(await getLiturgicalYear(2024), "annunciation_of_the_lord").date,
    "2024-04-08",
  );
  assert.equal(
    find(await getLiturgicalYear(2026), "cecilia_of_rome_virgin"),
    undefined,
  );
  assert.equal(
    find(await getLiturgicalYear(2027), "cecilia_of_rome_virgin").date,
    "2027-11-22",
  );
  assert.equal(
    find(await getLiturgicalYear(2028), "santo_nino").date,
    "2028-01-16",
  );
});

test("only obligatory primary memorials are included and seasonal markers stay automatic", async () => {
  const data = await getLiturgicalYear(2027);
  assert.equal(find(data, "john_henry_newman_priest"), undefined);
  assert.equal(
    find(data, "commemoration_of_all_the_faithful_departed"),
    undefined,
  );
  assert.equal(data.events.filter((e) => e.date === "2027-06-05").length, 1);
  assert.equal(find(data, "immaculate_heart_of_mary").date, "2027-06-05");
  assert.equal(find(data, "ash_wednesday").date, "2027-02-10");
  assert.equal(find(data, "holy_thursday").date, "2027-03-25");
  assert.equal(find(data, "holy_saturday").title, "Black Saturday");
  assert.equal(find(data, "advent_1_sunday").date, "2027-11-28");
  assert.equal(find(data, "nativity_of_the_lord").category, "christmas");
  assert.equal(find(data, "easter_sunday").category, "easter");
});

test("the generator supports the whole picker range and rejects invalid years", async () => {
  for (const year of [1900, 2100])
    assert.equal((await getLiturgicalYear(year)).year, year);
  for (const year of [1899, 2101, 2027.5, NaN, "2027"])
    await assert.rejects(getLiturgicalYear(year), RangeError);
});
