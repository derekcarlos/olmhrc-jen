import test from "node:test";
import assert from "node:assert/strict";
import {
  targetDates,
  sundayDate,
  reconcileSnapshot,
  validateSnapshot,
  sameReadingContent,
} from "../src/lib/readings.mjs";
import {
  parseReadingPage,
  sourceUrl,
  fetchReading,
} from "../src/lib/readings-source.mjs";
import { refreshReadings } from "../src/lib/readings-sync.mjs";

const sample = (date = "2026-11-08") => ({
  date,
  celebration: "Test celebration",
  language: "fil",
  source_url: sourceUrl(date),
  retrieved_at: "2026-11-02T01:00:00Z",
  sections: ["first", "psalm", "second", "acclamation", "gospel"].map(
    (type) => ({
      type,
      heading: type,
      reference: "Test reference",
      blocks: [{ type: "paragraph", text: "Original test prose." }],
    }),
  ),
});

test("timestamp-only refresh does not require a content commit", () => {
  const original = reconcileSnapshot(
    null,
    [sample()],
    "next-sunday",
    new Date("2026-11-02T01:00:00Z"),
  );
  const refreshed = structuredClone(original);
  refreshed.last_attempt = "2026-11-03T01:00:00Z";
  refreshed.records[0].retrieved_at = "2026-11-03T01:00:00Z";
  assert.equal(sameReadingContent(original, refreshed), true);
  refreshed.records[0].celebration = "Updated celebration";
  assert.equal(sameReadingContent(original, refreshed), false);
  assert.equal(
    sameReadingContent(
      original,
      reconcileSnapshot(
        null,
        [],
        "next-sunday",
        new Date("2026-11-09T01:00:00Z"),
      ),
    ),
    false,
  );
});

// Original sample prose, not a copied lectionary fixture.
const html = (
  second = true,
) => `<h1 class="entry-title">Linggo, Nobyembre 8, 2026</h1>
<div class="entry-content"><p>Test celebration</p><p>Ignored summary</p>
<p><strong>UNANG PAGBASA</strong><br>Test 1</p><p>Original first reading.</p><p>Ang Salita ng Diyos.</p>
<p><strong>SALMONG TUGUNAN</strong><br>Test 2</p><p><strong><em>Original response<br>second line.</em></strong></p><p>Original stanza<br>another line.</p>
${second ? "<p><strong>IKALAWANG PAGBASA</strong><br>Test 3</p><p>Original second reading.</p><p>Ang Salita ng Diyos.</p>" : ""}
<p><strong>ALELUYA</strong><br>Test 4</p><p>Original acclamation.</p>
<p><strong>MABUTING BALITA</strong><br>Test 5</p><p>Original gospel.</p><p>Ang Mabuting Balita ng Panginoon.</p>
<p><strong>PANALANGIN NG BAYAN</strong></p><p>Must not import this.</p></div>`;

test("Sunday stays selected all Sunday in Manila and advances on Monday", () => {
  assert.equal(sundayDate(new Date("2026-11-01T15:59:59Z")), "2026-11-01");
  assert.equal(sundayDate(new Date("2026-11-01T16:00:00Z")), "2026-11-08");
  assert.equal(sundayDate(new Date("2026-12-31T16:00:00Z")), "2027-01-03");
});
test("seven-day mode is today plus six days, including year rollover", () => {
  assert.deepEqual(
    targetDates("next-sunday", new Date("2026-11-02T01:00:00Z")),
    ["2026-11-08"],
  );
  const dates = targetDates(
    "next-seven-days",
    new Date("2026-12-30T01:00:00Z"),
  );
  assert.equal(dates.length, 7);
  assert.equal(dates[0], "2026-12-30");
  assert.equal(dates[6], "2027-01-05");
  assert.throws(() => targetDates("invalid"), /mode/i);
});
test("adapter extracts sections, responses and breaks; excludes prayers and unsafe HTML", () => {
  const result = parseReadingPage(
    html().replace(
      "Original gospel.",
      "Original &amp; safe gospel.<script>bad()</script>",
    ),
    "2026-11-08",
  );
  assert.equal(result.sections.length, 5);
  assert.equal(result.sections[1].blocks[0].type, "response");
  assert.equal(
    result.sections[1].blocks[0].text,
    "Original response\nsecond line.",
  );
  assert.equal(result.sections[4].blocks[0].text, "Original & safe gospel.");
  assert.doesNotMatch(
    JSON.stringify(result),
    /Must not import|bad\(\)|<script/,
  );
});
test("adapter rejects wrong dates, malformed pages and incomplete Sunday readings", () => {
  assert.throws(() => parseReadingPage(html(), "2026-11-09"), /date/i);
  assert.throws(() => parseReadingPage("<h1>Login</h1>", "2026-11-08"));
  assert.throws(
    () => parseReadingPage(html(false), "2026-11-08"),
    /second|Sunday/i,
  );
  assert.throws(
    () =>
      parseReadingPage(
        html().replace("Ang Mabuting Balita ng Panginoon.", ""),
        "2026-11-08",
      ),
    /complete|closing/i,
  );
});
test("ordinary weekday supports four sections without a second reading", () => {
  const page = html(false).replace(
    "Linggo, Nobyembre 8, 2026",
    "Lunes, Nobyembre 9, 2026",
  );
  assert.equal(parseReadingPage(page, "2026-11-09").sections.length, 4);
});
test("source formatting newlines after br do not create empty verse lines", () => {
  const page = html().replaceAll("<br>", "<br>\n  ");
  const result = parseReadingPage(page, "2026-11-08");
  assert.equal(
    result.sections[1].blocks[0].text,
    "Original response\nsecond line.",
  );
  assert.equal(
    result.sections[1].blocks[1].text,
    "Original stanza\nanother line.",
  );
  assert.ok(
    result.sections.every((section) =>
      section.blocks.every((block) => !block.text.includes("\n\n")),
    ),
  );
});
test("closing-only prose or response-only psalm cannot pass source validation", () => {
  const emptyProse = html().replace(
    "<p>Original first reading.</p>",
    "<p>Pagbasa mula sa orihinal na pagsubok</p>",
  );
  assert.throws(
    () => parseReadingPage(emptyProse, "2026-11-08"),
    /body|content|complete/i,
  );
  const emptyPsalm = html().replace(
    "<p>Original stanza<br>another line.</p>",
    "",
  );
  assert.throws(
    () => parseReadingPage(emptyPsalm, "2026-11-08"),
    /psalm|stanza|complete/i,
  );
});
test("damaged source prose cannot replace a previously valid cached reading", async () => {
  const now = new Date("2026-11-02T01:00:00Z");
  const previous = reconcileSnapshot(null, [sample()], "next-sunday", now);
  const damaged = html().replace("<p>Original gospel.</p>", "");
  const result = await refreshReadings(previous, "next-sunday", now, (day) =>
    fetchReading(day, async () => new Response(damaged)),
  );
  assert.deepEqual(result.records, previous.records);
  assert.match(result.errors[0].message, /body|content|complete/i);
});
test("FIFO prunes by date and preserves eligible records on refresh failure", () => {
  const now = new Date("2026-11-02T01:00:00Z");
  const previous = reconcileSnapshot(null, [sample()], "next-sunday", now);
  const updated = reconcileSnapshot(
    previous,
    [],
    "next-sunday",
    new Date("2026-11-03T01:00:00Z"),
  );
  assert.equal(
    updated.records[0].retrieved_at,
    previous.records[0].retrieved_at,
  );
  assert.equal(updated.records.length, 1);
  const nextWeek = reconcileSnapshot(
    previous,
    [],
    "next-sunday",
    new Date("2026-11-09T01:00:00Z"),
  );
  assert.equal(nextWeek.records.length, 0);
  assert.deepEqual(nextWeek.dates, ["2026-11-15"]);
  assert.equal(validateSnapshot(updated), true);
});
test("new valid source content replaces cached date without duplicates", () => {
  const now = new Date("2026-11-02T01:00:00Z");
  const previous = reconcileSnapshot(null, [sample()], "next-sunday", now);
  const replacement = { ...sample(), celebration: "Corrected title" };
  assert.equal(
    reconcileSnapshot(previous, [replacement], "next-sunday", now).records[0]
      .celebration,
    "Corrected title",
  );
  assert.equal(
    validateSnapshot({
      ...previous,
      records: [{ ...sample(), source_url: "https://other.example/" }],
    }),
    false,
  );
  assert.equal(
    validateSnapshot({ ...previous, records: [sample(), sample()] }),
    false,
  );
});
