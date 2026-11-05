import { prepareDayPrayerGuide } from "./day-prayer-guide-client.ts";

type Phase =
  "opening" | "daily" | "petitions" | "offering" | "family" | "closing";
type Step = { title: string; phase: Phase; nodes: Element[] };

/** Build from the rendered prayer booklet so edits have one source of truth. */
export function createFloresSteps(source: HTMLElement, day: number): Step[] {
  const steps: Step[] = [];
  let current: Step | undefined;
  let inDaily = false;
  let phase: Phase = "opening";
  for (const node of source.children) {
    if (/^H[23]$/.test(node.tagName)) {
      const title = node.textContent?.trim() || "";
      if (title === "Pagninilay sa araw") {
        inDaily = true;
        current = undefined;
        const selected = source.querySelector(`#araw-${day}`);
        if (!selected) throw new Error(`Missing Flores prayer for May ${day}`);
        let reading: Step | undefined;
        const introduction: Element[] = [];
        for (const child of selected.children) {
          if (child.tagName === "SUMMARY") continue;
          if (child.tagName === "H4") {
            reading = {
              title:
                steps.at(-1)?.phase !== "daily"
                  ? selected.querySelector("summary")!.textContent!.trim()
                  : child.textContent!.trim(),
              phase: "daily",
              nodes: [],
            };
            steps.push(reading);
            if (introduction.length)
              reading.nodes.push(...introduction.splice(0));
          } else if (reading) reading.nodes.push(child);
          else introduction.push(child);
        }
        continue;
      }
      inDaily = false;
      if (title.startsWith("Mga Pagdulog")) phase = "petitions";
      else if (title.startsWith("Pag-aalay")) phase = "offering";
      else if (title.startsWith("Ang Pagtatalaga")) phase = "family";
      else if (title.startsWith("Pangwakas")) phase = "closing";
      current = { title, phase, nodes: [] };
      steps.push(current);
    } else if (!inDaily && current) current.nodes.push(node);
  }
  return steps.flatMap((step) => {
    if (step.phase !== "petitions") return [step];
    const parts: Step[] = [];
    for (const node of step.nodes) {
      // The Hail Mary's leader part belongs to the preceding invocation.
      const text = node.textContent?.trim() || "";
      const startsInvocation =
        node.firstElementChild?.tagName === "STRONG" &&
        node.firstElementChild.textContent?.trim() === "℣." &&
        !/^℣\.\s*Aba Ginoong Maria/.test(text);
      if (!parts.length || (startsInvocation && parts.at(-1)!.nodes.length)) {
        parts.push({ title: step.title, phase: step.phase, nodes: [] });
      }
      parts.at(-1)!.nodes.push(node);
    }
    return parts.map((part, index) => ({
      ...part,
      title: part.nodes[0]?.textContent?.includes("Luwalhati sa Ama")
        ? "Luwalhati sa Ama"
        : `${step.title} — ${index + 1}`,
    }));
  });
}

export function prepareFloresGuide(root: HTMLElement, now = new Date()) {
  return prepareDayPrayerGuide(
    root,
    {
      dayCount: 31,
      labels: {
        opening: "Pambungad",
        daily: "Pagninilay sa araw",
        petitions: "Mga pagdulog",
        offering: "Pag-aalay",
        family: "Pagtatalaga",
        closing: "Pangwakas na awit",
      },
      makeSteps: createFloresSteps,
      dayLabel: (day) => `Mayo ${day}`,
      suggestDay: (now) => {
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Manila",
          month: "numeric",
          day: "numeric",
        }).formatToParts(now);
        return Number(parts.find((part) => part.type === "month")?.value) === 5
          ? Number(parts.find((part) => part.type === "day")?.value)
          : 1;
      },
    },
    now,
  );
}
