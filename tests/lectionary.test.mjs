import test from "node:test";
import assert from "node:assert/strict";
import {
  massProblems,
  parsePost,
  titleDate,
} from "../src/lib/lectionary-source.mjs";
import { lectionaryKeyForDate } from "../src/lib/lectionary-keys.mjs";
import { lectionaryReading } from "../src/lib/readings-lectionary.mjs";
import { validRecord } from "../src/lib/readings.mjs";

const body = "Ito ang mahabang teksto ng pagbasa para sa pagsubok. ".repeat(3);
const post = `
<p><iframe src="https://www.youtube.com/embed/x"></iframe><br />
<small><strong>Subscribe to Awit at Papuri</strong></small></p>
<p><strong><em>Vigil of the Solemnity of Sts. Peter and Paul, Apostles</strong> (Red)</em></p>
<p><strong>UNANG PAGBASA</strong><br />Mga Gawa 3, 1-10</p>
<p>Pagbasa mula sa Mga Gawa ng Mga Apostol</p>
<p>${body}</p>
<p>Ang Salita ng Diyos.</p>
<p>o kaya: Maikling Pagbasa<br />Mga Gawa 3, 1-5</p>
<p>${body}</p>
<p>Ang Salita ng Diyos.</p>
<p><strong>SALMONG TUGUNAN</strong><br />Salmo 113 A, 1-2. 3-4</p>
<p><strong>Aleluya.</strong></p>
<p>Ang bayang Israel<br />sa bansang Egipto’y doon inilabas,</p>
<p><strong>Aleluya.</strong></p>
<p><strong>ALELUYA</strong><br />Juan 21, 17</p>
<p>Aleluya! Aleluya!<br />Poon, ikaw ang nakaaalam.<br />Aleluya! Aleluya!</p>
<p><strong>MABUTING BALITA</strong><br />Juan 21, 15-19</p>
<p>${body}</p>
<p>Ang Mabuting Balita ng Panginoon.</p>
<p><strong>PANALANGIN NG BAYAN</strong></p>
<p>Hindi ito bahagi ng mga pagbasa.</p>`;

test("post titles yield their liturgical date, including older formats", () => {
  assert.equal(titleDate("Linggo, Nobyembre 15, 2026"), "2026-11-15");
  assert.equal(
    titleDate("Mga Pagbasa &#8211; Lunes, Hunyo 01, 2015"),
    "2015-06-01",
  );
  assert.equal(
    titleDate("Mga Pagbasa &#8211; Miyerkules, Hunyo, 22, 2016"),
    "2016-06-22",
  );
  assert.equal(
    titleDate("Tagalog Mass Readings &#8211; Sunday, April 19, 2015"),
    "2015-04-19",
  );
  assert.equal(titleDate("Mga Pagbasa"), "");
});

test("posts keep labels, alternatives and psalm responses", () => {
  const mass = parsePost(post);
  assert.equal(
    mass.label,
    "Vigil of the Solemnity of Sts. Peter and Paul, Apostles (Red)",
  );
  assert.deepEqual(
    mass.sections.map((s) => [s.type, Boolean(s.alternative), s.reference]),
    [
      ["first", false, "Mga Gawa 3, 1-10"],
      ["first", true, "Mga Gawa 3, 1-5"],
      ["psalm", false, "Salmo 113 A, 1-2. 3-4"],
      ["acclamation", false, "Juan 21, 17"],
      ["gospel", false, "Juan 21, 15-19"],
    ],
  );
  assert.equal(mass.sections[1].label, "o kaya: Maikling Pagbasa");
  // "Aleluya." is the psalm response, not the acclamation heading.
  assert.deepEqual(
    mass.sections[2].blocks.map((b) => b.type),
    ["response", "stanza", "response"],
  );
  assert.doesNotMatch(JSON.stringify(mass), /Hindi ito bahagi/);
  assert.deepEqual(massProblems(mass), { errors: [], warnings: [] });
});

test("older single-paragraph psalms are split into stanzas", () => {
  const mass = parsePost(
    post.replace(
      /<p><strong>Aleluya\.<\/strong><\/p>\s*<p>Ang bayang[\s\S]*?<p><strong>Aleluya\.<\/strong><\/p>/,
      "<p>Tugon: Aleluya.<br /><br />Ang bayang Israel<br />sa bansang Egipto’y doon inilabas,<br /><br />Tugon: Aleluya.</p>",
    ),
  );
  assert.deepEqual(
    mass.sections.find((s) => s.type === "psalm").blocks.map((b) => b.type),
    ["response", "stanza", "response"],
  );
});

test("incomplete posts are rejected; missing closing lines only warn", () => {
  const noGospel = parsePost(
    post.replace(/MABUTING BALITA<\/strong>/, "X</strong>"),
  );
  assert.ok(massProblems(noGospel).errors.includes("missing gospel"));
  const noClosing = massProblems(
    parsePost(post.replace("<p>Ang Mabuting Balita ng Panginoon.</p>", "")),
  );
  assert.deepEqual(noClosing.errors, []);
  assert.deepEqual(noClosing.warnings, ["gospel: closing formula missing"]);
});

test("dates resolve to lectionary collections and keys", async () => {
  assert.deepEqual(await lectionaryKeyForDate("2026-11-15"), {
    collection: "year-a",
    key: "ordinary_time_33_sunday",
    name: "Thirty-third Sunday in Ordinary Time",
    fallback: undefined,
  });
  const martin = await lectionaryKeyForDate("2026-11-11");
  assert.deepEqual(
    [martin.collection, martin.key, martin.fallback],
    [
      "saints",
      "martin_of_tours_bishop",
      { collection: "weekday-2", key: "ordinary_time_32_wednesday" },
    ],
  );
  for (const [date, collection, key] of [
    ["2026-12-06", "year-b", "advent_2_sunday"],
    ["2027-01-17", "year-b", "santo_nino"],
    ["2027-03-25", "seasonal", "holy_thursday"],
    ["2027-03-27", "year-b", "holy_saturday"],
    ["2027-12-25", "seasonal", "nativity_of_the_lord"],
    ["2027-06-29", "saints", "peter_and_paul_apostles"],
    ["2027-07-13", "weekday-1", "ordinary_time_15_tuesday"],
  ]) {
    const found = await lectionaryKeyForDate(date);
    assert.deepEqual([found.collection, found.key], [collection, key], date);
  }
});

test("snapshot records can be filled from the lectionary", async () => {
  const sunday = await lectionaryReading(
    "2026-11-15",
    new Date("2026-11-09T00:00:00Z"),
  );
  assert.equal(sunday.record.origin, "lectionary");
  assert.equal(sunday.record.lectionary_key, "year-a/ordinary_time_33_sunday");
  assert.ok(validRecord(sunday.record));
  assert.deepEqual(
    sunday.record.sections.map((s) => s.type),
    ["first", "psalm", "second", "acclamation", "gospel"],
  );
  // Palm Sunday keeps the Passion, not the procession gospel.
  const palm = await lectionaryReading("2027-03-21");
  assert.match(palm.record.sections.at(-1).reference, /^Marcos 14/);
  // Gaps are reported like an unpublished date, not as failures.
  const vigil = await lectionaryReading("2027-03-27");
  assert.equal(vigil.record, null);
  assert.equal(vigil.unavailable, true);
  // A lectionary record still needs an Awit at Papuri source.
  assert.equal(
    validRecord({ ...sunday.record, source_url: "https://example.com/" }),
    false,
  );
});
