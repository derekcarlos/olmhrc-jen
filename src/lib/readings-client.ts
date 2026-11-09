import { sundayDate, targetDates } from "./readings.mjs";
import { prepareReadingMasses } from "./reading-masses-client.ts";

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
