import { manilaToday } from "./calendar.mjs";

export function lentenPracticeDefault(practice, now = new Date()) {
  const today = manilaToday(now);
  const season = practice.seasons.find(season => season.end >= today);
  return season ? { year: season.year, cycle: season.cycle } : { year: null, cycle: "a" };
}

export function prepareLentenPractice(root, now = () => new Date()) {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const controller = new win.AbortController();
  const { signal } = controller;
  const practice = JSON.parse(root.querySelector("[data-lent-data]").textContent);
  let chosen = null;
  function refresh() {
    const suggested = lentenPracticeDefault(practice, now());
    const cycle = chosen || suggested.cycle;
    root.querySelector("[data-lent-period]").textContent =
      cycle === suggested.cycle && suggested.year
        ? `Kuwaresma ${suggested.year} · Year ${cycle.toUpperCase()}`
        : `Year ${cycle.toUpperCase()} · Pagsasanay`;
    root.querySelectorAll("[data-lent-cycle]").forEach(button => {
      button.hidden = false;
      button.setAttribute("aria-pressed", String(button.dataset.lentCycle === cycle));
    });
    root.querySelectorAll("[data-lent-celebration]").forEach(detail => {
      const record = practice.cycles[cycle].find(record => record.key === detail.dataset.lentCelebration);
      detail.querySelector("[data-lent-verse]").textContent = record.verse;
      const reference = detail.querySelector("[data-lent-reference]");
      reference.textContent = record.reference;
      reference.hidden = !record.reference;
      detail.querySelector("[data-lent-source]").href = record.source_url;
    });
  }
  root.querySelectorAll("[data-lent-cycle]").forEach(button => {
    button.addEventListener("click", () => { chosen = button.dataset.lentCycle; refresh(); }, { signal });
  });
  refresh();
  const timer = win.setInterval(refresh, 60_000);
  win.addEventListener("focus", refresh, { signal });
  doc.addEventListener("visibilitychange", refresh, { signal });
  function stop() { win.clearInterval(timer); controller.abort(); }
  doc.addEventListener("astro:before-swap", stop, { once: true, signal });
  return stop;
}
