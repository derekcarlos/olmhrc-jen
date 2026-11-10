import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { buildAcclamationCalendar } from "../src/lib/gospel-acclamations.mjs";
import { prepareGospelAcclamation } from "../src/lib/gospel-acclamation-client.mjs";
import { prepareLentenPractice, lentenPracticeDefault } from "../src/lib/lenten-acclamations-client.mjs";

const saved = JSON.parse(readFileSync("src/data/gospel-acclamations.json", "utf8"));
const { lenten_practice, ...dailyCalendar } = saved;
const simbang = await buildAcclamationCalendar({ from: "2026-12-15", days: 9 });
const lent = await buildAcclamationCalendar({ from: "2027-02-10", days: 7 });
const live = process.argv.includes("--live");
for (const [slug, setting] of [
  ["gospel-acclamation-missa-magnificat", "alleluia"],
  ["gospel-acclamation-misa-pasyon", "lent"],
]) {
  const path = `/songs/${slug}`;
  let html;
  if (live) {
    const response = await fetch(`http://localhost:4321${path}`);
    assert.equal(response.status, 200);
    html = await response.text();
  } else html = readFileSync(`dist${path}/index.html`, "utf8");
  const dom = new JSDOM(html, { url: `http://localhost:4321${path}` });
  const doc = dom.window.document;
  const root = doc.querySelector("[data-gospel-acclamation]");
  assert.ok(root, "the song embeds the shared component");
  assert.equal(root.dataset.setting, setting);
  const data = root.querySelector("[data-acclamation-data]");
  assert.deepEqual(JSON.parse(data.textContent), dailyCalendar, "source text and newlines survive safe JSON embedding");
  assert.ok(root.querySelector("noscript"), "no-JavaScript date explanation exists");
  if (setting === "lent") {
    assert.equal(doc.querySelectorAll(".lyric-chorus").length, 7, "the seven collapsible Lenten celebrations remain");
    const practiceRoot = doc.querySelector("[data-lenten-practice]");
    assert.ok(practiceRoot);
    const practice = JSON.parse(practiceRoot.querySelector("[data-lent-data]").textContent);
    assert.deepEqual(practice, saved.lenten_practice);
    const defaultCycle = lentenPracticeDefault(practice).cycle;
    assert.deepEqual([...practiceRoot.querySelectorAll("[data-lent-verse]")].map(node => node.textContent), practice.cycles[defaultCycle].map(record => record.verse), "correct cycle is available without JavaScript");
    const stopPractice = prepareLentenPractice(practiceRoot);
    try {
      const details = [...practiceRoot.querySelectorAll("[data-lent-celebration]")];
      details[3].open = true;
      for (const cycle of ["a", "b", "c"]) {
        practiceRoot.querySelector(`[data-lent-cycle="${cycle}"]`).click();
        assert.equal(details[3].open, true);
        details.forEach((detail, i) => {
          const record = practice.cycles[cycle][i];
          assert.equal(detail.querySelector("[data-lent-verse]").textContent, record.verse);
          assert.equal(detail.querySelector("[data-lent-reference]").textContent, record.reference);
          assert.equal(detail.querySelector("[data-lent-source]").href, record.source_url);
        });
      }
    } finally { stopPractice(); }
  }
  else assert.match(doc.querySelector(".lyrics-copy").textContent, /Aleluya, Aleluya, Aleluya, Aleluya/);
  try {
    for (const calendar of [saved, simbang, lent]) {
      data.textContent = JSON.stringify(calendar);
      const stop = prepareGospelAcclamation(root, () => new Date(`${calendar.from}T04:00:00Z`));
      try {
        const record = calendar.records[0];
        const visible = record.setting === setting && record.status === "available";
        assert.equal(root.querySelector("[data-acclamation-body]").hidden, !visible);
        assert.equal(root.querySelector("[data-acclamation-verse]").textContent, visible ? record.verse : "");
        if (visible) assert.equal(root.querySelector("[data-acclamation-source]").href, record.source_url);
        else if (record.status === "available") assert.equal(root.querySelector("[data-acclamation-other]").hidden, false);
        assert.equal(root.querySelector("[data-acclamation-date]").getAttribute("datetime"), calendar.from);
      } finally { stop(); }
    }
  } finally { dom.window.close(); }
}
console.log(`PASS: both song pages, original lyrics/practice versions, source text/line breaks, seasonal switching, real Simbang Gabi and Lent verses, source links, and dated no-JS fallback${live ? " on localhost" : " in production HTML"}.`);
