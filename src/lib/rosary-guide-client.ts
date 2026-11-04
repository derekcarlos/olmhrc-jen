import {
  rosaryWalkthrough,
  suggestedMysteries,
} from "./rosary-walkthrough.mjs";

import type {
  RosaryCatalog as Catalog,
  RosaryMysterySet as MysterySet,
} from "../types/rosary";

export function prepareRosaryGuide(root: HTMLElement, now = new Date()) {
  let catalog: Catalog;
  try {
    catalog = JSON.parse(root.dataset.rosaryCatalog || "");
  } catch {
    return () => {};
  }
  if (catalog.mysteries?.length !== 4 || !catalog.prayers?.length)
    return () => {};
  const controller = new window.AbortController();
  const { signal } = controller;
  const document = root.ownerDocument;
  const field = <T extends HTMLElement = HTMLElement>(name: string) =>
    root.querySelector<T>(`[data-rosary-${name}]`)!;
  const links = [
    ...root.querySelectorAll<HTMLAnchorElement>("[data-mystery-set]"),
  ];
  const suggestion = suggestedMysteries(now);
  const suggested =
    catalog.mysteries.find((set) => set.id === suggestion.id) ||
    catalog.mysteries[0];
  let selected =
    catalog.mysteries.find(
      (set) => `#${set.id}-mysteries` === window.location.hash,
    ) || suggested;
  let steps = rosaryWalkthrough(selected);
  let position = 0;
  let complete = false;

  const titleFor = (step: (typeof steps)[number]) =>
    step.kind === "mystery"
      ? step.mystery
      : catalog.prayers.find((prayer) => prayer.id === step.prayer)!.title;
  function render() {
    const step = steps[position];
    root.dataset.rosaryStep = String(position);
    root.dataset.rosaryComplete = String(complete);
    links.forEach((link) => {
      if (link.dataset.mysterySet === selected.id)
        link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    root
      .querySelectorAll<HTMLButtonElement>("[data-rosary-phase]")
      .forEach((button) => {
        const current =
          step.phase === "decade" ? String(step.decade) : step.phase;
        if (button.dataset.rosaryPhase === current)
          button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
    field("reading").hidden = complete;
    field("complete").hidden = !complete;
    const introduction = field("introduction");
    const reflection = field<HTMLDetailsElement>("reflection");
    const reflectionContent = field("reflection-content");
    introduction.replaceChildren();
    reflectionContent.replaceChildren();
    introduction.hidden = true;
    reflection.hidden = true;
    reflection.open = false;
    if (complete) {
      field("title").textContent = "The Rosary is complete.";
      field("status").textContent =
        `${selected.title} · Closing prayers complete`;
      field("position").textContent = "";
      return;
    }
    const phase =
      step.phase === "decade"
        ? `Decade ${step.decade! + 1} of 5`
        : step.phase === "opening"
          ? "Opening prayers"
          : "Closing prayers";
    const title = titleFor(step);
    field("status").textContent = `${selected.title} · ${phase} · ${title}`;
    field("position").textContent = `Step ${position + 1} of ${steps.length}`;
    field("title").textContent = title;
    field("context").textContent = step.mystery
      ? `${phase} · ${step.mystery}`
      : phase;
    field("rubric").textContent = step.instruction;
    field("text").textContent =
      step.kind === "mystery"
        ? step.announcement!
        : catalog.prayers.find((prayer) => prayer.id === step.prayer)!.text;
    if (step.decade !== null) {
      const item = selected.items[step.decade];
      const source = root.querySelector<HTMLElement>(
        `[data-rosary-mystery-content="${item.id}"]`,
      );
      if (source?.childElementCount) {
        const target =
          step.kind === "mystery" ? introduction : reflectionContent;
        for (const child of source.childNodes)
          target.append(child.cloneNode(true));
        if (step.kind === "mystery") {
          introduction.hidden = false;
          const parts = [
            item.meditation?.trim() && "meditation",
            item.fruit?.trim() && "fruit of the mystery",
          ].filter(Boolean);
          if (parts.length)
            field("rubric").textContent =
              `Announce the mystery, then read the ${parts.join(" and ")}. Pause for quiet reflection.`;
        } else {
          reflection.hidden = false;
          reflection.querySelector("summary")!.textContent =
            source.querySelector("figure")
              ? source.querySelector(".mystery-meditation")
                ? "View artwork & meditation"
                : "View artwork"
              : "View meditation";
        }
      }
    }
    field("count").textContent = step.bead
      ? `${step.bead} of ${step.phase === "opening" ? 3 : 10}`
      : "";
    field("count").hidden = !step.bead;
    field("control-count").textContent = step.bead
      ? `${step.bead}/${step.phase === "opening" ? 3 : 10}`
      : "";
    field("control-count").hidden = !step.bead;
    const controlBeads = field("control-beads");
    controlBeads.hidden = !!step.bead;
    controlBeads.setAttribute("aria-label", phase);
    [...controlBeads.children].forEach((bead, index) =>
      bead.classList.toggle("current-decade", index === step.decade),
    );
    field("control-label").textContent = step.bead
      ? "Hail Mary"
      : step.phase === "decade"
        ? `Decade ${step.decade! + 1}`
        : step.phase === "opening"
          ? "Opening"
          : "Closing";
    const beads = field("beads");
    beads.hidden = !step.bead;
    beads.replaceChildren();
    if (step.bead) {
      const total = step.phase === "opening" ? 3 : 10;
      beads.setAttribute("aria-label", `Hail Mary ${step.bead} of ${total}`);
      for (let number = 1; number <= total; number++) {
        const bead = document.createElement("span");
        bead.textContent = String(number);
        bead.setAttribute("aria-hidden", "true");
        if (number === step.bead) bead.className = "current-bead";
        beads.append(bead);
      }
    }
    root
      .querySelectorAll<HTMLButtonElement>('[data-rosary-action="previous"]')
      .forEach((button) => {
        button.disabled = position === 0;
      });
    field<HTMLButtonElement>("next").textContent =
      step.kind === "mystery"
        ? "Begin this decade →"
        : position === steps.length - 1
          ? "Finish prayer"
          : "Next prayer →";
    field("skip").hidden = !step.optional;
    field("up-next").textContent =
      position < steps.length - 1
        ? `Next: ${titleFor(steps[position + 1])}`
        : "A moment of quiet prayer follows.";
  }
  function moveTo(index: number) {
    position = Math.max(0, Math.min(steps.length - 1, index));
    complete = false;
  }
  function choose(set: MysterySet) {
    selected = set;
    steps = rosaryWalkthrough(selected);
    moveTo(0);
  }
  const showReading = () => {
    render();
    const panel = field("panel");
    panel.focus({ preventScroll: true });
    panel.scrollIntoView({ block: "start" });
  };
  field("suggestion").textContent =
    `Customary for ${suggestion.weekday}: ${suggested.title}. Choosing a different set starts a new walkthrough.`;
  field("walkthrough").hidden = false;
  field<HTMLDetailsElement>("reference").open = false;
  root.dataset.enhanced = "true";
  render();

  root.addEventListener(
    "click",
    (event) => {
      const target =
        event.target instanceof window.Element ? event.target : null;
      if (!target || event.defaultPrevented) return;
      const link = target.closest<HTMLAnchorElement>("a[data-mystery-set]");
      if (link) {
        if (
          event instanceof window.MouseEvent &&
          (event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0)
        )
          return;
        const set = catalog.mysteries.find(
          (set) => set.id === link.dataset.mysterySet,
        );
        if (!set) return;
        event.preventDefault();
        if (set.id !== selected.id) choose(set);
        const hash = `#${set.id}-mysteries`;
        if (window.location.hash !== hash)
          window.history.pushState(null, "", hash);
        render();
        return;
      }
      const phase = target.closest<HTMLButtonElement>("[data-rosary-phase]");
      if (phase) {
        const value = phase.dataset.rosaryPhase;
        const index = steps.findIndex((step) =>
          value === "opening" || value === "closing"
            ? step.phase === value
            : step.kind === "mystery" && String(step.decade) === value,
        );
        if (index >= 0) {
          moveTo(index);
          showReading();
        }
        return;
      }
      const action = target.closest<HTMLElement>("[data-rosary-action]")
        ?.dataset.rosaryAction;
      if (!action) return;
      if (action === "restart") moveTo(0);
      else if (action === "previous") {
        if (complete) complete = false;
        else moveTo(position - 1);
      } else if (
        action === "next" ||
        (action === "skip" && steps[position].optional)
      ) {
        if (complete) return;
        if (position === steps.length - 1) complete = true;
        else moveTo(position + 1);
      } else return;
      showReading();
    },
    { signal },
  );
  const followHistory = () => {
    const set =
      catalog.mysteries.find(
        (set) => `#${set.id}-mysteries` === window.location.hash,
      ) || (!window.location.hash ? suggested : null);
    if (set) {
      choose(set);
      render();
    }
  };
  window.addEventListener("hashchange", followHistory, { signal });
  window.addEventListener("popstate", followHistory, { signal });
  return () => controller.abort();
}
