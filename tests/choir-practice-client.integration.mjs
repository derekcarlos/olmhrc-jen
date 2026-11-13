import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { prepareChoirPractice } from "../src/lib/choir-practice-client.ts";

function fixture(run) {
  const dom = new JSDOM(`<main data-choir-practice data-practice-songs='["advent-one","advent-two"]'><div data-choir-progress hidden><span data-choir-count></span><progress data-choir-meter></progress><p data-choir-storage></p></div><a data-choir-resume href="/songs/practice/advent-one"><span data-choir-resume-label></span></a>${["advent-one", "advent-two"].map(id => `<label data-choir-mark-wrap hidden><input type="checkbox" value="${id}" data-choir-mark disabled>Practised</label>`).join("")}</main>`, { url: "http://localhost:4321/songs/practice" });
  const before = globalThis.window;
  globalThis.window = dom.window;
  try { run(dom.window, dom.window.document); }
  finally { globalThis.window = before; dom.window.close(); }
}
test("practice checks restore by song ID, update progress and remain separate from lineups", () => fixture((win, doc) => {
  win.localStorage.setItem("rosarium-choir-practice", '["advent-two","removed-song"]');
  win.localStorage.setItem("rosarium-practice:sunday:2026-11-15", '["first:advent-one"]');
  prepareChoirPractice(doc);
  const marks = doc.querySelectorAll("input");
  assert.equal(marks[0].checked, false);
  assert.equal(marks[1].checked, true);
  assert.equal(doc.querySelector("[data-choir-count]").textContent, "1 of 2 practised");
  assert.equal(doc.querySelector("[data-choir-meter]").value, 1);
  marks[0].click();
  assert.equal(doc.querySelector("[data-choir-count]").textContent, "2 of 2 practised");
  assert.equal(doc.querySelector("[data-choir-resume-label]").textContent, "Practise again");
  marks[1].click();
  assert.equal(doc.querySelector("[data-choir-resume]").getAttribute("href"), "/songs/practice/advent-two");
  assert.equal(win.localStorage.getItem("rosarium-practice:sunday:2026-11-15"), '["first:advent-one"]');
  const newRoot = doc.querySelector("main").cloneNode(true);
  delete newRoot.dataset.choirReady;
  newRoot.dataset.practiceSongs = '["advent-two","advent-one","new-song"]';
  doc.body.replaceChildren(newRoot);
  prepareChoirPractice(doc);
  assert.equal(newRoot.querySelector("[data-choir-count]").textContent, "1 of 3 practised");
  assert.equal(newRoot.querySelector('input[value="advent-one"]').checked, true);
}));
test("storage failure and repeated initialization still allow reversible temporary checks", () => fixture((win, doc) => {
  Object.defineProperty(win, "localStorage", { get() { throw new Error("blocked"); } });
  prepareChoirPractice(doc);
  prepareChoirPractice(doc);
  const input = doc.querySelector("input");
  assert.equal(input.disabled, false);
  input.click();
  assert.equal(doc.querySelector("[data-choir-count]").textContent, "1 of 2 practised");
  assert.match(doc.querySelector("[data-choir-storage]").textContent, /temporary/);
  input.click();
  assert.equal(doc.querySelector("[data-choir-count]").textContent, "0 of 2 practised");
}));
