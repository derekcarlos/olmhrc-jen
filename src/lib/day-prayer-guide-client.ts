export type DayPrayerStep = {
  title: string;
  phase: string;
  nodes: Element[];
  bead?: number;
  beadTotal?: number;
  context?: string;
  mysteryIndex?: number;
};
export interface DayPrayerOptions {
  dayCount: number;
  labels: Record<string, string>;
  makeSteps: (
    source: HTMLElement,
    day: number,
    mystery: string,
  ) => DayPrayerStep[];
  suggestDay: (now: Date) => number;
  dayLabel: (day: number) => string;
  suggestMystery?: (day: number, now: Date) => string;
  mysteryIds?: string[];
}

export function prepareDayPrayerGuide(
  root: HTMLElement,
  options: DayPrayerOptions,
  now = new Date(),
) {
  const source = root.querySelector<HTMLElement>("[data-flores-source]");
  if (!source) return () => {};
  // Inline emphasis (e.g. Theotokos) does not make a reading a rubric.
  source.querySelectorAll("p").forEach((paragraph) => {
    const emphasis = paragraph.firstElementChild;
    paragraph.classList.toggle(
      "prayer-rubric",
      paragraph.children.length === 1 &&
        emphasis?.tagName === "EM" &&
        paragraph.textContent?.trim() === emphasis.textContent?.trim(),
    );
  });
  const field = <T extends HTMLElement = HTMLElement>(name: string) =>
    root.querySelector<T>(`[data-flores-${name}]`)!;
  const controller = new window.AbortController();
  const { signal } = controller;
  const suggestedDay = options.suggestDay(now);
  const hashDay = () => {
    const match = /^#araw-([1-9]\d*)$/.exec(window.location.hash);
    const value = Number(match?.[1]);
    return value >= 1 && value <= options.dayCount ? value : null;
  };
  let day = hashDay() || suggestedDay;
  let mystery = options.suggestMystery?.(day, now) || "";
  let manualMystery = false;
  let steps = options.makeSteps(source, day, mystery);
  if (!steps.length) return () => {};
  let position = 0;
  let complete = false;
  const labels = options.labels;
  function render(focus = false) {
    const step = steps[position];
    root.dataset.complete = String(complete);
    const dayChoice = field<HTMLSelectElement>("day");
    if (dayChoice) dayChoice.value = String(day);
    root
      .querySelectorAll<HTMLElement>("[data-flores-day-choice]")
      .forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(Number(button.dataset.floresDayChoice) === day),
        );
      });
    root
      .querySelectorAll<HTMLElement>("[data-flores-mystery-choice]")
      .forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.floresMysteryChoice === mystery),
        );
      });
    const mysteryChoice = field<HTMLSelectElement>("mystery");
    if (mysteryChoice) mysteryChoice.value = mystery;
    field("title").textContent = complete
      ? "Natapos ang ating panalangin."
      : step.title;
    field("status").textContent =
      `${options.dayLabel(day)} · ${complete ? "Panalangin at paghahandog" : step.context || labels[step.phase]}`;
    field("position").textContent = complete
      ? "Salamat sa pakikiisa."
      : labels[step.phase];
    const beads = field("beads");
    const beadCount = field("bead-count");
    if (beadCount) {
      beadCount.hidden = !step.bead || complete;
      beadCount.textContent = step.bead ? `${step.bead}/${step.beadTotal}` : "";
    }
    if (beads) {
      beads.hidden = !step.bead || complete;
      beads.replaceChildren();
      if (step.bead) {
        beads.setAttribute(
          "aria-label",
          `Aba Ginoong Maria ${step.bead} sa ${step.beadTotal}`,
        );
        for (let number = 1; number <= step.beadTotal!; number++) {
          const bead = source!.ownerDocument.createElement("span");
          bead.textContent = String(number);
          bead.setAttribute("aria-hidden", "true");
          if (number === step.bead) bead.className = "current-bead";
          beads.append(bead);
        }
      }
    }
    root
      .querySelector<HTMLElement>(".phase-dots")
      ?.toggleAttribute("hidden", !!step.bead && !complete);
    field("reading").hidden = complete;
    field("complete").hidden = !complete;
    field("reading").replaceChildren();
    if (!complete) {
      for (const node of step.nodes) {
        const copy = node.cloneNode(true) as HTMLElement;
        copy.removeAttribute("id");
        copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
        field("reading").append(copy);
      }
    }
    field("up-next").textContent = complete
      ? ""
      : position < steps.length - 1
        ? `Susunod: ${steps[position + 1].title}`
        : "Manatili sandali sa tahimik na panalangin.";
    root
      .querySelectorAll<HTMLButtonElement>('[data-flores-action="previous"]')
      .forEach((button) => {
        button.disabled = position === 0 && !complete;
      });
    const next = root.querySelector<HTMLButtonElement>(
      '[data-flores-action="next"]',
    )!;
    next.disabled = complete;
    next.textContent =
      position === steps.length - 1 ? "Tapusin →" : "Susunod →";
    root
      .querySelectorAll<HTMLElement>("[data-flores-phase]")
      .forEach((button) => {
        if (!complete && button.dataset.floresPhase === step.phase)
          button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
    root
      .querySelectorAll<HTMLElement>("[data-flores-mystery-step]")
      .forEach((button) => {
        const index = Number(button.dataset.floresMysteryStep);
        const declaration = steps.find((step) => step.mysteryIndex === index);
        if (declaration) {
          button.title = declaration.title;
          button.setAttribute(
            "aria-label",
            `Misteryo ${index + 1}: ${declaration.title}`,
          );
        }
        if (!complete && step.mysteryIndex === index)
          button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
    root.querySelectorAll<HTMLElement>("[data-flores-dot]").forEach((dot) => {
      dot.classList.toggle(
        "current-phase",
        !complete && dot.dataset.floresDot === step.phase,
      );
    });
    if (focus) {
      field("panel").focus({ preventScroll: true });
      field("panel").scrollIntoView({ block: "start" });
    }
  }
  function choose(value: number) {
    day = value;
    if (!manualMystery) mystery = options.suggestMystery?.(day, now) || "";
    steps = options.makeSteps(source!, day, mystery);
    position = Math.min(position, steps.length - 1);
    complete = false;
    render();
  }
  function chooseMystery(value: string) {
    if (!options.mysteryIds?.includes(value)) return;
    const wasMystery = steps[position].phase === "mysteries";
    mystery = value;
    manualMystery = true;
    steps = options.makeSteps(source!, day, mystery);
    if (wasMystery)
      position = steps.findIndex((step) => step.phase === "mysteries");
    position = Math.max(0, Math.min(position, steps.length - 1));
    complete = false;
    render();
  }
  root.addEventListener(
    "click",
    (event) => {
      const target =
        event.target instanceof window.Element ? event.target : null;
      if (!target || event.defaultPrevented) return;
      const dayTile = target.closest<HTMLElement>("[data-flores-day-choice]");
      if (dayTile) {
        const value = Number(dayTile.dataset.floresDayChoice);
        if (
          Number.isInteger(value) &&
          value >= 1 &&
          value <= options.dayCount
        ) {
          choose(value);
          window.history.pushState(null, "", `#araw-${day}`);
        }
        return;
      }
      const mysteryTile = target.closest<HTMLElement>(
        "[data-flores-mystery-choice]",
      );
      if (mysteryTile) {
        chooseMystery(mysteryTile.dataset.floresMysteryChoice || "");
        return;
      }
      const mysteryShortcut = target.closest<HTMLElement>(
        "[data-flores-mystery-step]",
      );
      if (mysteryShortcut) {
        const selected = Number(mysteryShortcut.dataset.floresMysteryStep);
        const index = steps.findIndex((step) => step.mysteryIndex === selected);
        if (index >= 0) {
          position = index;
          complete = false;
          render(true);
        }
        return;
      }
      const phase = target.closest<HTMLElement>("[data-flores-phase]")?.dataset
        .floresPhase;
      if (phase) {
        const index = steps.findIndex((step) => step.phase === phase);
        if (index >= 0) {
          position = index;
          complete = false;
          render(true);
        }
        return;
      }
      const action = target.closest<HTMLElement>("[data-flores-action]")
        ?.dataset.floresAction;
      if (!action) return;
      if (action === "restart") {
        position = 0;
        complete = false;
      } else if (action === "previous") {
        if (complete) complete = false;
        else position = Math.max(0, position - 1);
      } else if (action === "next" && !complete) {
        if (position === steps.length - 1) complete = true;
        else position++;
      } else return;
      render(true);
    },
    { signal },
  );
  field("day")?.addEventListener(
    "change",
    () => {
      const value = Number(field<HTMLSelectElement>("day").value);
      if (value < 1 || value > options.dayCount || !Number.isInteger(value))
        return;
      choose(value);
      window.history.pushState(null, "", `#araw-${day}`);
    },
    { signal },
  );
  field<HTMLSelectElement>("mystery")?.addEventListener(
    "change",
    () => {
      chooseMystery(field<HTMLSelectElement>("mystery").value);
    },
    { signal },
  );
  const followHistory = () => {
    const value = hashDay() || (!window.location.hash ? suggestedDay : null);
    if (value) choose(value);
  };
  window.addEventListener("hashchange", followHistory, { signal });
  window.addEventListener("popstate", followHistory, { signal });
  field("workspace").hidden = false;
  field<HTMLDetailsElement>("reference").open = false;
  root.dataset.enhanced = "true";
  render();
  return () => controller.abort();
}
