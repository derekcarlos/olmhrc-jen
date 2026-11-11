import { sundayDate, targetDates } from "./readings.mjs";
import { prepareReadingMasses } from "./reading-masses-client.ts";
import { readingChoice } from "./reading-selection.mjs";

export function prepareReadings() {
  document.querySelectorAll<HTMLElement>("[data-readings]").forEach((root) => {
    if (root.dataset.ready) return;
    root.dataset.ready = "true";
    const dates: string[] = JSON.parse(root.dataset.dates || "[]");
    const available: string[] = JSON.parse(root.dataset.available || "[]");
    const calendarDates: string[] = JSON.parse(
      root.dataset.calendarDates || "[]",
    );
    const mode = root.dataset.mode || "next-sunday";
    const selected = root.dataset.selected!;
    const isEntry = root.dataset.entry === "true";
    const base = root.dataset.base || "";
    const stopWalkthrough = prepareReadingMasses(root);
    if (mode === "upcoming-celebrations") {
      const track = root.querySelector<HTMLElement>(".reading-tile-track");
      const tile = track?.querySelector<HTMLElement>('[aria-current="date"]');
      if (track && tile && track.scrollWidth > track.clientWidth) {
        track.scrollLeft = Math.max(0, tile.offsetLeft - track.offsetLeft - (track.clientWidth - tile.clientWidth) / 2);
      }
      const calendar = JSON.parse(root.dataset.readingCalendar || "[]");
      const url = new URL(window.location.href);
      if (url.searchParams.get("auto") === "1") {
        url.searchParams.delete("auto");
        window.history.replaceState({ ...window.history.state, readingsAuto: true }, "", url);
      }
      const automatic = () => (isEntry || window.history.state?.readingsAuto) && root.dataset.readingPinned !== "true";
      const controller = new window.AbortController();
      const { signal } = controller;
      function refreshUpcoming() {
        root.dataset.readingsActive = "true";
        if (!automatic()) return;
        const choice = readingChoice(calendar);
        const target = root.querySelector<HTMLElement>(`[data-reading-mass="${choice?.mass || root.dataset.selectedMass}"]`);
        if (!choice) {
          root.querySelector<HTMLElement>("[data-readings-content]")!.hidden = true;
          root.querySelector<HTMLElement>("[data-readings-stale]")!.hidden = false;
          return;
        }
        const activeMass = root.querySelector<HTMLElement>("[data-reading-mass]:not([hidden])")?.dataset.readingMass;
        if (!target && choice.date === selected && !isEntry) return;
        if (choice.date !== selected || !target || activeMass !== target.dataset.readingMass) {
          const next = new URL(`${base}/readings/${choice.date}`, window.location.href);
          if (choice.mass) next.searchParams.set("mass", choice.mass);
          next.searchParams.set("auto", "1");
          window.location.replace(next.href);
        }
      }
      root.addEventListener("click", event => {
        const target = event.target as HTMLElement;
        if (target.closest("[data-reading-action], [data-reading-section-link], [data-reading-mass-choice]")) root.dataset.readingPinned = "true";
      }, { signal });
      root.addEventListener("change", () => { root.dataset.readingPinned = "true"; }, { signal });
      refreshUpcoming();
      const timer = window.setInterval(refreshUpcoming, 60_000);
      window.addEventListener("focus", refreshUpcoming, { signal });
      document.addEventListener("visibilitychange", refreshUpcoming, { signal });
      document.addEventListener("astro:before-swap", () => { window.clearInterval(timer); controller.abort(); stopWalkthrough(); }, { once: true });
      return;
    }
    function refreshDate() {
      if (root.dataset.fixed === "true") {
        root.dataset.readingsActive = "true";
        return;
      }
      const today = new Date();
      const active = targetDates(mode, today, calendarDates);
      const target = isEntry
        ? mode === "next-celebration"
          ? active[0]
          : sundayDate(today)
        : selected;
      root
        .querySelectorAll<HTMLElement>("[data-reading-day]")
        .forEach((link) => {
          link.hidden = !active.includes(link.dataset.readingDay!);
        });
      if (
        isEntry &&
        target !== selected &&
        ((mode === "next-celebration" && calendarDates.includes(target)) ||
          (dates.includes(target) && available.includes(target)))
      ) {
        window.location.replace(`${base}/readings/${target}`);
        return;
      }
      const expired =
        !active.includes(target) || (isEntry && target !== selected);
      const notice = root.querySelector<HTMLElement>("[data-readings-stale]")!;
      root.querySelector<HTMLElement>("[data-readings-content]")!.hidden =
        expired;
      notice.hidden = !expired;
      root.dataset.readingsActive = String(!expired);
      if (expired)
        root.querySelector<HTMLElement>(
          "[data-readings-stale-text]",
        )!.textContent = target
          ? `Hindi pa available ang mga pagbasa para sa ${target}. Mag-a-update ang pahinang ito pagkatapos ng susunod na matagumpay na pag-sync.`
          : "Kailangang i-update ang kalendaryo ng mga pagbasa. Mangyaring bumalik muli.";
    }
    refreshDate();
    // Recheck after midnight, on returning to this tab, or after client navigation.
    const timer = window.setInterval(refreshDate, 60_000);
    const onVisibility = () => {
      if (!document.hidden) refreshDate();
    };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener(
      "astro:before-swap",
      () => {
        window.clearInterval(timer);
        stopWalkthrough();
        document.removeEventListener("visibilitychange", onVisibility);
      },
      { once: true },
    );
  });
}
