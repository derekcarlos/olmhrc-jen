export function prepareSearchDialog(root: HTMLElement) {
  const dialog = root.querySelector<HTMLDialogElement>("dialog")!;
  const input = dialog.querySelector<HTMLInputElement>('input[name="q"]')!;
  const document = root.ownerDocument;
  const win = document.defaultView!;
  const controller = new win.AbortController();
  const { signal } = controller;
  const open = () => {
    const pageInput = document.querySelector<HTMLInputElement>(
      '[data-site-search-page] input[name="q"]',
    );
    if (pageInput) {
      pageInput.focus();
      pageInput.scrollIntoView({ block: "center" });
      return;
    }
    if (typeof dialog.showModal !== "function") {
      win.location.assign(
        dialog.querySelector<HTMLFormElement>("form")!.action,
      );
      return;
    }
    if (!dialog.open) dialog.showModal();
    input.focus();
  };
  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof win.Element) || event.defaultPrevented)
        return;
      const trigger = event.target.closest<HTMLAnchorElement>(
        "[data-site-search-open]",
      );
      if (trigger) {
        if (
          event instanceof win.MouseEvent &&
          (event.button !== 0 ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey)
        )
          return;
        event.preventDefault();
        open();
      } else if (
        event.target.closest("[data-site-search-close]") &&
        dialog.open
      )
        dialog.close();
    },
    { signal },
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "k" &&
        !event.isComposing
      ) {
        event.preventDefault();
        open();
      } else if (event.key === "Escape" && dialog.open) {
        event.preventDefault();
        dialog.close();
      }
    },
    { signal },
  );
  dialog.addEventListener(
    "click",
    (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    },
    { signal },
  );
  document.addEventListener(
    "astro:before-swap",
    () => {
      if (dialog.open) dialog.close();
    },
    { signal },
  );
  return () => controller.abort();
}
