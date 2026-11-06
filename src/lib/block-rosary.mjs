import additions from "../data/block-rosary.json" with { type: "json" };
import { rosaryWalkthrough } from "./rosary-walkthrough.mjs";

/** @typedef {import('../types/rosary.ts').RosaryCatalog} Catalog */
/** @typedef {import('../types/rosary.ts').RosaryMysterySet} MysterySet */

export const blockRosaryPhases = {
  welcome: "Welcome to Mary",
  opening: "The Holy Rosary",
  closing: "Rosary collect",
  litany: "Litany of Mary",
  family: "Family prayers",
  farewell: "Farewell",
};

/** Keep standard prayers and mystery meditations in the shared English catalog.
 * The booklet's own opening versicles are the one intentional text override.
 * @param {Catalog} english @returns {Catalog}
 */
export function blockRosaryCatalog(english) {
  const extras = new Map(
    additions.prayers.map((prayer) => [prayer.id, prayer]),
  );
  const shared = english.prayers.map((prayer) => {
    if (extras.has(prayer.id)) return extras.get(prayer.id);
    if (["our-father", "hail-mary", "glory-be"].includes(prayer.id)) {
      const [leader, ...response] = prayer.text.split(/\n\s*\n/);
      return { ...prayer, text: `℣. ${leader}\n℟. ${response.join("\n\n")}` };
    }
    return prayer;
  });
  const prayers = new Map(
    [...shared, ...additions.prayers].map((prayer) => [prayer.id, prayer]),
  );
  const ids = [
    ...new Set(
      blockRosaryWalkthrough(english.mysteries[0])
        .map((step) => step.prayer)
        .filter(Boolean),
    ),
  ];
  return {
    mysteries: english.mysteries,
    prayers: ids.map((id) => prayers.get(id)),
  };
}

/** @param {MysterySet} set @returns {import('./rosary-walkthrough.mjs').RosaryStep[]} */
export function blockRosaryWalkthrough(set) {
  /** @type {import('./rosary-walkthrough.mjs').RosaryStep[]} */
  const steps = [];
  const add = (
    prayer,
    phase,
    instruction = "The leader reads ℣ and all respond ℟.",
    optional = false,
  ) =>
    steps.push({
      kind: "prayer",
      phase,
      prayer,
      instruction,
      decade: null,
      bead: null,
      mystery: "",
      optional,
    });
  add(
    "acceptance",
    "welcome",
    "When receiving the image, a member of the host family prays. Skip on other evenings.",
    true,
  );
  for (const prayer of [
    "mary-comes",
    "immaculate-mother",
    "welcome-mary",
    "mary-said",
  ])
    add(prayer, "welcome");
  for (const step of rosaryWalkthrough(set)) {
    // The booklet begins with its welcoming prayers and ends after the farewell.
    if (step.prayer === "sign-of-cross") continue;
    steps.push(
      step.prayer === "fatima"
        ? {
            ...step,
            optional: false,
            instruction: "After each decade, all say the Fatima Prayer.",
          }
        : step,
    );
    if (step.prayer === "fatima")
      steps.push({
        ...step,
        prayer: "miraculous-medal",
        optional: true,
        instruction: "This invocation may follow the Fatima Prayer.",
      });
  }
  for (const prayer of [
    "litany-opening",
    "litany-trinity",
    "litany-mary-1",
    "litany-mary-2",
    "litany-mary-3",
    "litany-lamb-of-god",
    "litany-collect",
  ])
    add(prayer, "litany");
  add("family-prayer", "family", "All stand.");
  add("give-thanks", "family", "All sing.");
  add(
    "farewell",
    "farewell",
    "When passing the image to the next home, a member of the host family prays. Skip on other evenings.",
    true,
  );
  add("sign-of-cross", "farewell", "All make the Sign of the Cross.");
  return steps;
}
