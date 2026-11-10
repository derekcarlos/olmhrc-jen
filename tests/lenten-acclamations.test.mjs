import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { buildLentenPractice, acclamationVerse } from "../src/lib/gospel-acclamations.mjs";
import { lentenPracticeDefault, prepareLentenPractice } from "../src/lib/lenten-acclamations-client.mjs";

test("all seven celebrations in each cycle preserve the local lectionary's actual verse and reference", async () => {
  const practice = await buildLentenPractice({ year: 2026 });
  for (const cycle of ["a", "b", "c"]) {
    const collection = JSON.parse(readFileSync(`src/data/readings/lectionary/year-${cycle}.json`));
    const seasonal = JSON.parse(readFileSync("src/data/readings/lectionary/seasonal.json"));
    assert.equal(practice.cycles[cycle].length, 7);
    for (const record of practice.cycles[cycle]) {
      const source = record.key === "ash_wednesday" ? seasonal : collection;
      const mass = source.entries[record.key].masses.find(m => !m.vigil) || source.entries[record.key].masses[0];
      const verse = mass.sections.filter(s => s.type === "acclamation" && !s.alternative).at(-1);
      assert.equal(record.verse, acclamationVerse(verse.blocks));
      assert.equal(record.reference, verse.reference || "");
      assert.equal(record.source_url, mass.source_url);
      assert.ok(record.verse && !record.verse.includes("Lyrics to follow"));
    }
  }
  const third = Object.values(practice.cycles).map(records => records.find(r => r.key === "lent_3_sunday").verse);
  assert.equal(new Set(third).size, 3);
  assert.match(practice.cycles.b.find(r => r.key === "lent_4_sunday").reference, /Juan 3/);
});

test("practice defaults to the upcoming/current Lent, not the previous Sunday's cycle", async () => {
  const practice = await buildLentenPractice({ year: 2026 });
  assert.deepEqual(lentenPracticeDefault(practice, new Date("2026-11-10T00:00:00Z")), { year: 2027, cycle: "b" });
  assert.deepEqual(lentenPracticeDefault(practice, new Date("2027-03-21T00:00:00Z")), { year: 2027, cycle: "b" });
  assert.deepEqual(lentenPracticeDefault(practice, new Date("2027-03-28T15:59:59Z")), { year: 2027, cycle: "b" });
  assert.deepEqual(lentenPracticeDefault(practice, new Date("2027-03-28T16:00:00Z")), { year: 2028, cycle: "c" });
});

test("cycle controls change each verse without closing an open celebration or changing its line breaks", async () => {
  const practice = await buildLentenPractice({ year: 2026 });
  const dom = new JSDOM(`<section data-lenten-practice>
  <script type="application/json" data-lent-data>${JSON.stringify(practice)}</script>
  <p data-lent-period></p>${["a", "b", "c"].map(c => `<button data-lent-cycle="${c}">Year ${c}</button>`).join("")}
  ${practice.cycles.a.map(r => `<details data-lent-celebration="${r.key}"><summary>${r.title}</summary><p data-lent-verse></p><p data-lent-reference></p><a data-lent-source></a></details>`).join("")}
  </section>`);
  const root = dom.window.document.querySelector("section");
  const stop = prepareLentenPractice(root, () => new Date("2026-11-10T00:00:00Z"));
  try {
    assert.equal(root.querySelector('[data-lent-cycle="b"]').getAttribute("aria-pressed"), "true");
    const third = root.querySelector('[data-lent-celebration="lent_3_sunday"]');
    third.open = true;
    root.querySelector('[data-lent-cycle="a"]').click();
    assert.equal(third.open, true);
    const expected = practice.cycles.a.find(r => r.key === "lent_3_sunday");
    assert.equal(third.querySelector("[data-lent-verse]").textContent, expected.verse);
    assert.equal(third.querySelector("[data-lent-reference]").textContent, expected.reference);
    assert.equal(third.querySelector("[data-lent-source]").href, expected.source_url);
    stop();
    root.querySelector('[data-lent-cycle="c"]').click();
    assert.equal(third.querySelector("[data-lent-verse]").textContent, expected.verse);
  } finally { stop(); dom.window.close(); }
});
