/** Enhance the existing reading sections without copying or changing their text. */
export function prepareReadingWalkthrough(root: HTMLElement) {
  const sections = [
    ...root.querySelectorAll<HTMLElement>("[data-reading-section]"),
  ];
  const panel = root.querySelector<HTMLElement>("[data-reading-panel]");
  const win = root.ownerDocument.defaultView;
  if (!sections.length || !panel || !win) return () => {};
  const controller = new win.AbortController();
  const { signal } = controller;
  const field = <T extends HTMLElement = HTMLElement>(name: string) =>
    root.querySelector<T>(`[data-reading-${name}]`)!;
  const links = [
    ...root.querySelectorAll<HTMLAnchorElement>("[data-reading-section-link]"),
  ];
  let position = 0;
  let view: "step" | "all" | "complete" = "step";
  const indexFromHash = () =>
    sections.findIndex(
      (section) => `#${section.querySelector("h3")?.id}` === win.location.hash,
    );
  const title = (index: number) =>
    sections[index].querySelector("h3")!.textContent!.trim();

  function render(scroll = false) {
    root.dataset.readingsView = view;
    sections.forEach((section, index) => {
      section.hidden =
        view === "complete" || (view === "step" && index !== position);
    });
    links.forEach((link, index) => {
      if (view === "step" && index === position)
        link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
    field("toolbar").hidden = false;
    field("controls").hidden = view !== "step";
    field("complete").hidden = view !== "complete";
    field("status").textContent =
      view === "all"
        ? "Buong teksto ng mga pagbasa"
        : view === "complete"
          ? "Natapos ang mga pagbasa"
          : `${title(position)} · Bahagi ${position + 1} sa ${sections.length}`;
    field("progress").textContent =
      `Bahagi ${position + 1} sa ${sections.length}`;
    field<HTMLButtonElement>("controls").querySelector<HTMLButtonElement>(
      '[data-reading-action="previous"]',
    )!.disabled = position === 0;
    field("controls").querySelector<HTMLButtonElement>(
      '[data-reading-action="next"]',
    )!.textContent =
      position === sections.length - 1 ? "Tapusin →" : "Susunod →";
    root.querySelector<HTMLButtonElement>(
      '[data-reading-action="toggle"]',
    )!.textContent = view === "all" ? "Gabay sa pagbasa" : "Basahin nang buo";
    if (scroll) {
      panel!.focus({ preventScroll: true });
      panel!.scrollIntoView({ block: "start" });
    }
  }

  root.addEventListener(
    "click",
    (event) => {
      if (event.defaultPrevented || !(event.target instanceof win.Element))
        return;
      const link = event.target.closest<HTMLAnchorElement>(
        "[data-reading-section-link]",
      );
      if (link) {
        if (
          event instanceof win.MouseEvent &&
          (event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey)
        )
          return;
        const index = sections.findIndex(
          (section) =>
            section.dataset.readingSection === link.dataset.readingSectionLink,
        );
        if (index < 0) return;
        event.preventDefault();
        position = index;
        view = "step";
        if (win.location.hash !== link.hash)
          win.history.pushState(null, "", link.hash);
        render(true);
        return;
      }
      const action = event.target.closest<HTMLElement>("[data-reading-action]")
        ?.dataset.readingAction;
      if (!action) return;
      if (action === "toggle") view = view === "all" ? "step" : "all";
      else if (action === "all") view = "all";
      else if (action === "restart") {
        position = 0;
        view = "step";
      } else if (view === "step" && action === "previous")
        position = Math.max(0, position - 1);
      else if (view === "step" && action === "next") {
        if (position === sections.length - 1) view = "complete";
        else position++;
      } else return;
      render(true);
    },
    { signal },
  );
  const followHash = () => {
    const index = indexFromHash();
    if (index < 0) return;
    position = index;
    view = "step";
    render(true);
  };
  win.addEventListener("hashchange", followHash, { signal });
  win.addEventListener("popstate", followHash, { signal });
  const initial = indexFromHash();
  if (initial >= 0) position = initial;
  render(initial >= 0);
  return () => {
    controller.abort();
    sections.forEach((section) => {
      section.hidden = false;
    });
    links.forEach((link) => link.removeAttribute("aria-current"));
    for (const name of ["toolbar", "controls", "complete"])
      field(name).hidden = true;
    delete root.dataset.readingsView;
  };
}
