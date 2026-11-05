/** Enhance the original booklet into complete, single-day prayer sheets. */
export function prepareNovenaGuide(root: HTMLElement) {
  const document = root.ownerDocument;
  const controller = new window.AbortController();
  const { signal } = controller;

  root
    .querySelectorAll<HTMLDetailsElement>("details.novena-day")
    .forEach((day) => {
      const summary = day.querySelector("summary");
      const sheet = document.createElement("section");
      sheet.id = day.id;
      sheet.className = "novena-day novena-day-reading";
      const heading = document.createElement("h3");
      heading.id = `${day.id}-title`;
      heading.textContent = summary?.textContent || "Panalangin sa araw na ito";
      sheet.setAttribute("aria-labelledby", heading.id);
      sheet.append(heading);
      for (const node of [...day.childNodes]) {
        if (node !== summary) sheet.append(node);
      }
      day.replaceWith(sheet);
    });
  const days = [...root.querySelectorAll<HTMLElement>(".novena-day-reading")];
  const selectDay = (hash: string) => {
    if (!/^#araw-[1-9]\d*$/.test(hash)) return;
    const selected = days.find((day) => `#${day.id}` === hash);
    if (!selected) return;
    days.forEach((day) => {
      day.hidden = day !== selected;
    });
    root
      .querySelectorAll<HTMLAnchorElement>("[data-novena-day]")
      .forEach((link) => {
        if (link.hash === hash) link.setAttribute("aria-current", "step");
        else link.removeAttribute("aria-current");
      });
    const status = root.querySelector<HTMLElement>("[data-novena-status]");
    if (status) {
      status.hidden = false;
      status.textContent = `Mga panalangin para sa: ${selected.querySelector("h3")?.textContent}.`;
    }
  };
  root.dataset.filtered = "true";
  const initialDay = days.some((day) => `#${day.id}` === window.location.hash)
    ? window.location.hash
    : "#araw-1";
  selectDay(initialDay);
  const followHistory = () => selectDay(window.location.hash || "#araw-1");
  window.addEventListener("hashchange", followHistory, { signal });
  window.addEventListener("popstate", followHistory, { signal });
  root.addEventListener(
    "click",
    (event) => {
      const link =
        event.target instanceof window.Element
          ? event.target.closest<HTMLAnchorElement>("a[data-novena-day]")
          : null;
      if (
        !link ||
        event.defaultPrevented ||
        (event instanceof window.MouseEvent &&
          (event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0))
      )
        return;
      event.preventDefault();
      selectDay(link.hash);
      if (window.location.hash !== link.hash)
        window.history.pushState(null, "", link.hash);
      root
        .querySelector<HTMLElement>(".novena-prayers")
        ?.scrollIntoView({ block: "start" });
    },
    { signal },
  );
  return () => controller.abort();
}
