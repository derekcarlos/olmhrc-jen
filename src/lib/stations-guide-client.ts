import { stationsWalkthrough } from "./stations-cross.mjs";
import type { StationsDevotion } from "../types/stations";
import type { RosaryPrayer } from "../types/rosary";

export function prepareStationsGuide(root: HTMLElement) {
  let devotion: StationsDevotion;
  let prayers: RosaryPrayer[];
  try {
    ({ devotion, prayers } = JSON.parse(root.dataset.stationsCatalog || ""));
  } catch {
    return () => {};
  }
  const win = root.ownerDocument.defaultView;
  if (!win || devotion.stations.length !== 14) return () => {};
  const document = root.ownerDocument;
  const tl = root.lang === "tl";
  const t = (en: string, tagalog: string) => (tl ? tagalog : en);
  const controller = new win.AbortController();
  const { signal } = controller;
  const steps = stationsWalkthrough(devotion);
  const field = <T extends HTMLElement = HTMLElement>(name: string) =>
    root.querySelector<T>(`[data-stations-${name}]`)!;
  const prayerFor = (id: string) => prayers.find((prayer) => prayer.id === id)!;
  let position = 0;
  let complete = false;
  function setWords(text: string) {
    field("words").replaceChildren(
      ...text.split(/([℣℟]\.)/g).map((part) => {
        if (!/^[℣℟]\.$/.test(part)) return document.createTextNode(part);
        const symbol = document.createElement("strong");
        symbol.textContent = part;
        return symbol;
      }),
    );
  }
  const titleFor = (step: (typeof steps)[number]) =>
    step.kind === "station"
      ? devotion.stations[step.station!].title
      : prayerFor(step.prayer!).title;
  function render(focus = false) {
    const step = steps[position];
    const station =
      step.station === null ? null : devotion.stations[step.station];
    const place = station
      ? t(
          `Station ${step.station! + 1} of 14`,
          `Istasyon ${step.station! + 1} sa 14`,
        )
      : step.phase === "opening"
        ? t("Opening prayers", "Mga pambungad na panalangin")
        : t("Closing prayers", "Mga pangwakas na panalangin");
    root.dataset.stationsComplete = String(complete);
    root.dataset.stationsStep = String(position);
    field("reading").hidden = complete;
    field("complete").hidden = !complete;
    field("controls").hidden = complete;
    field("title").textContent = complete
      ? t("Walk in his peace.", "Humayo sa kanyang kapayapaan.")
      : titleFor(step);
    field("status").textContent = complete
      ? t(
          "The Way of the Cross is complete.",
          "Natapos ang pagdarasal ng Daan ng Krus.",
        )
      : `${place} · ${titleFor(step)}`;
    field("position").textContent = complete
      ? t(
          "Remain for a moment in thanksgiving.",
          "Manatili sandali sa pasasalamat.",
        )
      : place;
    field("progress").textContent = place;
    field("context").textContent =
      (step.phase === "closing" &&
      ["our-father", "hail-mary", "glory-be"].includes(step.prayer || "")
        ? t(
            "Prayer for the Intention of the Holy Father",
            "Panalangin para sa Intensiyon ng Santo Papa",
          )
        : station?.title) ||
      (step.phase === "closing"
        ? t(
            "Pray together in thanksgiving.",
            "Sama-samang manalangin nang may pasasalamat.",
          )
        : t(
            "Gather your heart in prayer.",
            "Ihanda ang iyong puso sa panalangin.",
          ));
    const reflection = field("reflection");
    reflection.replaceChildren();
    reflection.hidden = complete || step.kind !== "station";
    if (!complete) {
      const prayer = prayerFor(
        step.kind === "station" ? "stations-adoration" : step.prayer!,
      );
      setWords(prayer.text);
      field("rubric").textContent =
        prayer.rubric ||
        (step.prayer === "sign-of-cross"
          ? t("Make the Sign of the Cross.", "Mag-antanda ng krus.")
          : t(
              "Pray together, slowly and from the heart.",
              "Sabay-sabay na manalangin nang dahan-dahan at mula sa puso.",
            ));
      if (station && step.kind === "station") {
        const source = root.querySelector<HTMLElement>(
          `[data-station-reflection="${station.id}"]`,
        )!;
        reflection.append(source.cloneNode(true));
      }
      field<HTMLButtonElement>("previous").disabled = position === 0;
      field("next").textContent =
        position === steps.length - 1
          ? t("Finish prayer", "Tapusin")
          : t("Next prayer →", "Susunod →");
      field("up-next").textContent =
        position < steps.length - 1
          ? `${t("Next", "Susunod")}: ${titleFor(steps[position + 1])}`
          : t(
              "A moment of quiet prayer follows.",
              "Manatili sandali sa tahimik na panalangin.",
            );
    }
    root
      .querySelectorAll<HTMLElement>("[data-stations-jump]")
      .forEach((button) => {
        const current = station ? station.id : step.phase;
        if (!complete && button.dataset.stationsJump === current)
          button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
    if (focus) {
      field("panel").focus({ preventScroll: true });
      field("panel").scrollIntoView({ block: "start" });
    }
  }
  function jump(id: string) {
    const index = steps.findIndex((step) =>
      ["opening", "closing"].includes(id)
        ? step.phase === id
        : step.kind === "station" && devotion.stations[step.station!].id === id,
    );
    if (index < 0) return false;
    position = index;
    complete = false;
    return true;
  }
  root.addEventListener(
    "click",
    (event) => {
      if (event.defaultPrevented || !(event.target instanceof win.Element))
        return;
      const shortcut = event.target.closest<HTMLElement>(
        "[data-stations-jump]",
      );
      if (shortcut && jump(shortcut.dataset.stationsJump!)) {
        win.history.pushState(
          null,
          "",
          `#station-${shortcut.dataset.stationsJump}`,
        );
        render(true);
        return;
      }
      const action = event.target.closest<HTMLElement>("[data-stations-action]")
        ?.dataset.stationsAction;
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
  function followHash() {
    if (win!.location.hash === "#prayer-guide") {
      position = 0;
      complete = false;
      render(true);
    } else if (
      win!.location.hash.startsWith("#station-") &&
      jump(win!.location.hash.slice(9))
    )
      render(true);
  }
  field("workspace").hidden = false;
  field<HTMLDetailsElement>("reference").open = false;
  root.dataset.enhanced = "true";
  render();
  followHash();
  win.addEventListener("hashchange", followHash, { signal });
  win.addEventListener("popstate", followHash, { signal });
  return () => controller.abort();
}
