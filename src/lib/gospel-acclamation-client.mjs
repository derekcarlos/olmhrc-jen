// Browser-safe: contains only the prepared verse calendar, never Romcal or source files.
import { manilaToday } from "./calendar.mjs";
import { formatReadingDate } from "./readings.mjs";

export function acclamationView(calendar, setting, now = new Date()) {
  const date = manilaToday(now);
  const record = calendar?.records?.find(r => r.date === date);
  const state = {
    date, date_label: formatReadingDate(date), reading_date: record?.reading_date || date,
    celebration: record?.celebration || "", context: record?.context || "",
    message: "Hindi pa naihahanda ang taludtod para sa araw na ito. Mangyaring bumalik muli.",
    verse: "", reference: "", source_url: "", other_song: "", other_label: "",
  };
  if (!record || record.status !== "available") {
    if (record?.message) state.message = record.message;
    return state;
  }
  if (record.setting !== setting) {
    if (record.setting === "lent") {
      state.message = "Sa Kuwaresma, gamitin ang Misa Pasyon sa halip na Aleluya.";
      state.other_song = "/songs/gospel-acclamation-misa-pasyon";
      state.other_label = "Buksan ang Misa Pasyon →";
    } else {
      state.message = "Ang bersiyong ito ay para sa Kuwaresma. Para sa araw na ito, gamitin ang Magnificat.";
      state.other_song = "/songs/gospel-acclamation-missa-magnificat";
      state.other_label = "Buksan ang Magnificat →";
    }
    return state;
  }
  state.message = "";
  state.verse = record.verse;
  state.reference = record.reference || "";
  state.source_url = record.source_url || "";
  return state;
}

export function prepareGospelAcclamation(root, now = () => new Date()) {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const controller = new win.AbortController();
  let calendar;
  try { calendar = JSON.parse(root.querySelector("[data-acclamation-data]").textContent); }
  catch { calendar = { records: [] }; }
  const field = name => root.querySelector(`[data-acclamation-${name}]`);
  function refresh() {
    const state = acclamationView(calendar, root.dataset.setting, now());
    field("date").textContent = state.date_label;
    field("date").setAttribute("datetime", state.date);
    for (const name of ["celebration", "context", "message", "verse", "reference"])
      field(name).textContent = state[name];
    field("message").hidden = !state.message;
    field("reference").hidden = !state.reference;
    field("body").hidden = !state.verse;
    const source = field("source");
    source.hidden = !state.source_url;
    if (state.source_url) source.href = state.source_url;
    else source.removeAttribute("href");
    const other = field("other");
    other.hidden = !state.other_song;
    other.textContent = state.other_label;
    if (state.other_song) other.href = `${root.dataset.base || ""}${state.other_song}`;
    else other.removeAttribute("href");
  }
  refresh();
  const timer = win.setInterval(refresh, 60_000);
  const { signal } = controller;
  win.addEventListener("focus", refresh, { signal });
  doc.addEventListener("visibilitychange", refresh, { signal });
  function stop() { win.clearInterval(timer); controller.abort(); }
  doc.addEventListener("astro:before-swap", stop, { once: true, signal });
  return stop;
}
