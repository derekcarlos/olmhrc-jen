import english from "../data/rosary.json" with { type: "json" };
import tagalog from "../data/rosary-tl.json" with { type: "json" };
import { suggestedMysteries } from "./rosary-walkthrough.mjs";

export function prayerHubState(now = new Date()) {
  const { id, weekday } = suggestedMysteries(now);
  const set = english.mysteries.find((set) => set.id === id);
  const counterpart = tagalog.mysteries.find((set) => set.id === id);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type) => parts.find((part) => part.type === type).value;
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    dateLabel: new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(now),
    weekday,
    mysteryId: id,
    title: set.title,
    tagalogTitle: counterpart.title,
    mysteries: set.items.map((item) => item.title),
    // Open the prayer panel; each guide selects today's mysteries itself.
    englishHref: "/prayers/how-to-pray-the-holy-rosary#prayer-guide",
    tagalogHref: "/prayers/ang-banal-na-rosaryo#prayer-guide",
  };
}

/** Keep a static build's daily invitation current without a request or rebuild. */
export function preparePrayerHub(root, now = () => new Date()) {
  let currentDate = "";
  const update = () => {
    const model = prayerHubState(now());
    if (model.date === currentDate) return;
    currentDate = model.date;
    const field = (name) => root.querySelector(`[data-prayer-hub-${name}]`);
    field("date").textContent = model.dateLabel;
    field("date").setAttribute("datetime", model.date);
    field("weekday").textContent = model.weekday;
    field("title").textContent = model.title;
    field("tagalog-title").textContent = model.tagalogTitle;
    field("english").setAttribute("href", model.englishHref);
    field("tagalog").setAttribute("href", model.tagalogHref);
    root
      .querySelectorAll("[data-prayer-hub-mystery]")
      .forEach((item, index) => {
        item.textContent = model.mysteries[index];
      });
  };
  update();
  const onVisibility = () => {
    if (root.ownerDocument.visibilityState === "visible") update();
  };
  root.ownerDocument.addEventListener("visibilitychange", onVisibility);
  const interval = setInterval(update, 60_000);
  return () => {
    clearInterval(interval);
    root.ownerDocument.removeEventListener("visibilitychange", onVisibility);
  };
}
