import { prepareReadingWalkthrough } from "./reading-walkthrough-client.ts";

/** Each Mass has its own guide; alternate forms share the parent reading step. */
export function prepareReadingMasses(root: HTMLElement) {
  const win = root.ownerDocument.defaultView!;
  const panels = [...root.querySelectorAll<HTMLElement>("[data-reading-mass]")];
  const controller = new win.AbortController();
  const { signal } = controller;
  const select = root.querySelector<HTMLSelectElement>(
    "[data-reading-mass-select]",
  );
  const inHash = () =>
    panels.find((panel) =>
      [...panel.querySelectorAll<HTMLElement>("[id]")].some(
        (node) => `#${node.id}` === win.location.hash,
      ),
    );
  const requested = new URL(win.location.href).searchParams.get("mass");
  let active =
    inHash()?.dataset.readingMass ||
    (panels.some((p) => p.dataset.readingMass === requested)
      ? requested
      : root.dataset.selectedMass) ||
    panels[0]?.dataset.readingMass;
  function show() {
    panels.forEach(
      (panel) => (panel.hidden = panel.dataset.readingMass !== active),
    );
    if (select) select.value = active!;
    const panel = panels.find((p) => p.dataset.readingMass === active);
    if (panel) root.dataset.readingsView = panel.dataset.readingsView || "step";
  }
  show();
  const browser = root.querySelector<HTMLDetailsElement>(
    "[data-reading-browser]",
  );
  browser?.addEventListener(
    "toggle",
    () => {
      const list = browser.querySelector<HTMLElement>(
        ".reading-celebration-list",
      );
      const selected = browser.querySelector<HTMLElement>(
        '[aria-current="date"]',
      );
      if (browser.open && list && selected && !selected.hidden)
        list.scrollTop = Math.max(
          0,
          selected.offsetTop - list.offsetTop - list.clientHeight / 3,
        );
    },
    { signal },
  );
  const onHash = () => {
    const panel = inHash();
    if (panel) {
      active = panel.dataset.readingMass;
      show();
    }
  };
  win.addEventListener("hashchange", onHash, { signal });
  win.addEventListener("popstate", onHash, { signal });
  const stops = panels.length
    ? panels.map((panel) => prepareReadingWalkthrough(panel))
    : [prepareReadingWalkthrough(root)];
  if (select) {
    root.querySelector<HTMLElement>("[data-reading-mass-picker]")!.hidden =
      false;
    select.addEventListener(
      "change",
      () => {
        active = select.value;
        show();
        const article = panels
          .find((p) => p.dataset.readingMass === active)!
          .querySelector<HTMLElement>("[data-reading-panel]")!;
        const url = new URL(win.location.href);
        url.searchParams.set("mass", active!);
        url.hash = article.id;
        win.history.replaceState(null, "", url);
        article.focus({ preventScroll: true });
        article.scrollIntoView({ block: "start" });
      },
      { signal },
    );
  }
  const versions = [
    ...root.querySelectorAll<HTMLSelectElement>("[data-reading-version]"),
  ];
  const updateVersion = (version: HTMLSelectElement) => {
    const section = version.closest<HTMLElement>("[data-reading-section]")!;
    section
      .querySelectorAll<HTMLElement>("[data-reading-option]")
      .forEach(
        (option) =>
          (option.hidden = option.dataset.readingOption !== version.value),
      );
  };
  versions.forEach((version) => {
    version.closest<HTMLElement>("[data-reading-version-picker]")!.hidden =
      false;
    version.value = "0";
    updateVersion(version);
    version.addEventListener("change", () => updateVersion(version), {
      signal,
    });
  });
  const search = root.querySelector<HTMLInputElement>(
    "[data-reading-calendar-filter]",
  );
  if (search) {
    root.querySelector<HTMLElement>("[data-reading-calendar-search]")!.hidden =
      false;
    search.addEventListener(
      "input",
      () => {
        const normalize = (s: string) =>
          s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
        const terms = normalize(search.value).split(/\s+/).filter(Boolean);
        let count = 0;
        root
          .querySelectorAll<HTMLElement>("[data-reading-calendar-entry]")
          .forEach((entry) => {
            entry.hidden = !terms.every((term) =>
              normalize(entry.dataset.readingCalendarEntry || "").includes(
                term,
              ),
            );
            if (!entry.hidden) count++;
          });
        root
          .querySelectorAll<HTMLElement>("[data-reading-calendar-year]")
          .forEach(
            (year) =>
              (year.hidden = !year.querySelector(
                "[data-reading-calendar-entry]:not([hidden])",
              )),
          );
        root.querySelector<HTMLElement>(
          "[data-reading-calendar-empty]",
        )!.hidden = count > 0;
      },
      { signal },
    );
  }
  return () => {
    controller.abort();
    stops.forEach((stop) => stop());
    panels.forEach((panel) => (panel.hidden = false));
    delete root.dataset.readingsView;
    root
      .querySelectorAll<HTMLElement>("[data-reading-option]")
      .forEach((option) => (option.hidden = false));
  };
}
