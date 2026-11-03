import { nextHomeMass } from "./home-bulletin.mjs";
import { formatEventTime } from "./calendar.mjs";
import { massInvitation, massCalendarFile } from "./mass-invitation.mjs";

export function prepareHomeBulletin(
  scope: ParentNode = document,
  now = () => new Date(),
) {
  scope.querySelectorAll<HTMLElement>("[data-home-mass]").forEach((root) => {
    if (root.dataset.ready) return;
    root.dataset.ready = "true";
    const document = root.ownerDocument;
    let schedules: Parameters<typeof nextHomeMass>[0] = [];
    try {
      const parsed = JSON.parse(root.dataset.schedules || "[]");
      if (Array.isArray(parsed)) schedules = parsed;
    } catch {
      /* Keep the schedule fallback usable. */
    }
    const field = <T extends HTMLElement = HTMLElement>(name: string) =>
      root.querySelector<T>(`[data-home-mass-${name}]`)!;
    function refresh() {
      const current = now();
      const mass = nextHomeMass(schedules, current);
      const info = massInvitation(mass);
      field("title").textContent = mass?.title || "Gather for Mass";
      field("number").textContent = info.number;
      field("month").textContent = info.month;
      field("day").textContent = info.weekday;
      field("year").textContent = info.year;
      const date = field<HTMLTimeElement>("date");
      date.setAttribute("aria-label", info.dateLabel);
      if (mass) date.dateTime = mass.day;
      else date.removeAttribute("datetime");
      const time = field<HTMLTimeElement>("time");
      time.textContent = mass ? formatEventTime(mass.time) : "See schedule";
      if (info.dateTime) time.dateTime = info.dateTime;
      else time.removeAttribute("datetime");
      const location = field("location");
      location.textContent = mass?.location || "";
      location.hidden = !mass?.location;
      field("zone").hidden = !mass?.time;
      const file = massCalendarFile(mass, current);
      const save = field<HTMLAnchorElement>("save");
      save.hidden = !file;
      if (file) {
        save.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(file.content)}`;
        save.download = file.filename;
      } else {
        save.removeAttribute("href");
        save.removeAttribute("download");
      }
    }
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    const visible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", visible);
    document.addEventListener(
      "astro:before-swap",
      () => {
        window.clearInterval(timer);
        document.removeEventListener("visibilitychange", visible);
      },
      { once: true },
    );
  });
}
