import catalog from "../data/rosary-tl.json" with { type: "json" };
import type { RosaryPrayer } from "../types/rosary";
import { suggestedMysteries } from "./rosary-walkthrough.mjs";
import {
  prepareDayPrayerGuide,
  type DayPrayerStep,
} from "./day-prayer-guide-client.ts";

export const novenaDays = [
  "Unang araw — Setyembre 28",
  "Ikalawang araw — Setyembre 29",
  "Ikatlong araw — Setyembre 30",
  "Ikaapat na araw — Oktubre 1",
  "Ikalimang araw — Oktubre 2",
  "Ikaanim na araw — Oktubre 3",
  "Ikapitong araw — Oktubre 4",
  "Ikawalong araw — Oktubre 5",
  "Ikasiyam na araw — Oktubre 6",
];
export const novenaPhases = [
  ["opening", "Mga pambungad na panalangin"],
  ["common", "Panalangin sa araw-araw"],
  ["daily", "Panalangin sa araw na ito"],
  ["mysteries", "Mga misteryo ng Rosaryo"],
  ["after", "Pagkatapos ng mga misteryo"],
  ["litany", "Litanya ng Mahal na Birhen"],
  ["dalit", "Dalit"],
  ["closing", "Mga pangwakas na panalangin"],
];

function philippineDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}
export function suggestedNovenaDay(now: Date) {
  const { month, day } = philippineDate(now);
  return month === 9 && day >= 28
    ? day - 27
    : month === 10 && day <= 6
      ? day + 3
      : 1;
}
export function suggestedNovenaMystery(day: number, now: Date) {
  const { year } = philippineDate(now);
  return suggestedMysteries(new Date(Date.UTC(year, 8, 27 + day, 4))).id;
}

/** The novena retains its own devotions, but all Rosary words come from rosary-tl.json. */
export function createNovenaSteps(
  source: HTMLElement,
  day: number,
  mystery = "joyful",
): DayPrayerStep[] {
  const document = source.ownerDocument;
  const paragraph = (text: string, rubric = false) => {
    const p = document.createElement("p");
    if (rubric) {
      p.className = "prayer-rubric";
      const em = document.createElement("em");
      em.textContent = text;
      p.append(em);
    } else
      text.split("\n").forEach((line, index) => {
        if (index) p.append(document.createElement("br"));
        if (/^[℣℟]\./.test(line)) {
          const symbol = document.createElement("strong");
          symbol.textContent = line.slice(0, 2);
          p.append(symbol, document.createTextNode(line.slice(2)));
        } else p.append(document.createTextNode(line));
      });
    return p;
  };
  const shared = (
    id: string,
    phase: string,
    extra: Partial<DayPrayerStep> = {},
  ): DayPrayerStep => {
    const prayer: RosaryPrayer | undefined = catalog.prayers.find(
      (prayer) => prayer.id === id,
    );
    if (!prayer) throw new Error(`Unknown shared Tagalog Rosary prayer: ${id}`);
    const nodes: Element[] = [];
    if (prayer.instruction) nodes.push(paragraph(prayer.instruction, true));
    nodes.push(paragraph(prayer.text));
    if (prayer.rubric) nodes.push(paragraph(prayer.rubric, true));
    return { title: prayer.title, phase, nodes, ...extra };
  };
  type Section = { title: string; parent: string; nodes: Element[] };
  const sections: Section[] = [];
  let parent = "";
  let section: Section | undefined;
  for (const node of source.children) {
    if (/^H[23]$/.test(node.tagName)) {
      const title = node.textContent!.trim();
      if (node.tagName === "H2") parent = title;
      section = { title, parent, nodes: [] };
      sections.push(section);
    } else section?.nodes.push(node);
  }
  const steps: DayPrayerStep[] = [];
  for (const section of sections) {
    const { title, parent, nodes } = section;
    if (parent === "Mga bahagi") continue;
    if (parent === "Panalangin sa bawat araw") {
      if (title !== parent) continue;
      const selected = source.querySelector(`#araw-${day}`);
      if (!selected) throw new Error(`Missing novena day ${day}`);
      const prayers = [...selected.children].filter(
        (node) =>
          node.tagName !== "SUMMARY" &&
          !node.querySelector('a[href="#mga-misteryo-ng-santo-rosaryo"]'),
      );
      steps.push({
        title: selected.querySelector("summary")!.textContent!.trim(),
        phase: "daily",
        nodes: prayers,
      });
      continue;
    }
    if (parent === "Mga misteryo ng Santo Rosaryo") {
      if (title !== parent) continue;
      const set = catalog.mysteries.find((set) => set.id === mystery);
      if (!set) throw new Error(`Unknown mystery set: ${mystery}`);
      const ordinals = [
        "Unang",
        "Ikalawang",
        "Ikatlong",
        "Ikaapat na",
        "Ikalimang",
      ];
      set.items.forEach((item, index) => {
        const context = `${set.title} · Misteryo ${index + 1}: ${item.title}`;
        steps.push({
          title: item.title,
          phase: "mysteries",
          context,
          mysteryIndex: index,
          nodes: [
            paragraph(
              "Ipahayag ang misteryo, pagkatapos ay magnilay sandali.",
              true,
            ),
            paragraph(
              `Ang ${ordinals[index]} Misteryo ng ${set.title.replace("Mga Misteryo ng ", "")}:\n${item.title}`,
            ),
          ],
        });
        steps.push(
          shared("our-father", "mysteries", { context, mysteryIndex: index }),
        );
        for (let bead = 1; bead <= 10; bead++)
          steps.push(
            shared("hail-mary", "mysteries", {
              bead,
              beadTotal: 10,
              context,
              mysteryIndex: index,
            }),
          );
        steps.push(
          shared("glory-be", "mysteries", { context, mysteryIndex: index }),
        );
        steps.push(
          shared("fatima", "mysteries", { context, mysteryIndex: index }),
        );
      });
      continue;
    }
    const phase =
      parent === "Mga pambungad na panalangin"
        ? "opening"
        : parent === "Panalangin sa araw-araw"
          ? "common"
          : parent === "Pagkatapos ng mga misteryo"
            ? "after"
            : parent === "Ang Litanya ng Mahal na Birhen"
              ? "litany"
              : parent === "Dalit"
                ? "dalit"
                : "closing";
    if (!nodes.length) continue;
    if (phase === "dalit") {
      const parts: Element[][] = [];
      for (const node of nodes) {
        if (node.tagName !== "P") continue;
        let current: HTMLParagraphElement | undefined;
        for (const child of node.childNodes) {
          if (
            child.nodeType === 1 &&
            (child as Element).tagName === "STRONG" &&
            child.textContent === "℣."
          ) {
            current = document.createElement("p");
            parts.push([current]);
          }
          current?.append(child.cloneNode(true));
        }
      }
      parts.forEach((nodes, index) =>
        steps.push({ title: `Dalit — ${index + 1}`, phase, nodes }),
      );
      continue;
    }
    const prayerNode = nodes.find((node) =>
      node.hasAttribute("data-shared-rosary-prayer"),
    );
    const id = prayerNode?.getAttribute("data-shared-rosary-prayer");
    if (phase === "after" && id === "fatima") continue;
    if (id === "hail-mary" && phase === "opening") {
      for (let bead = 1; bead <= 3; bead++)
        steps.push(shared(id, phase, { bead, beadTotal: 3 }));
    } else if (id && title !== parent) steps.push(shared(id, phase));
    else if (phase === "closing") {
      const body = nodes.filter(
        (node) =>
          node.getAttribute("data-shared-rosary-prayer") !== "sign-of-cross",
      );
      if (body.length) steps.push({ title, phase, nodes: body });
      if (id === "sign-of-cross") steps.push(shared(id, phase));
    } else steps.push({ title, phase, nodes });
  }
  return steps;
}

export function prepareNovenaWalkthrough(root: HTMLElement, now = new Date()) {
  return prepareDayPrayerGuide(
    root,
    {
      dayCount: 9,
      labels: Object.fromEntries(novenaPhases),
      makeSteps: createNovenaSteps,
      dayLabel: (day) => novenaDays[day - 1],
      suggestDay: suggestedNovenaDay,
      suggestMystery: suggestedNovenaMystery,
      mysteryIds: catalog.mysteries.map((set) => set.id),
    },
    now,
  );
}
