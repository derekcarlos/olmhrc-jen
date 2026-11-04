/** @typedef {import('../types/rosary.ts').RosaryMysterySet} MysterySet */
/** @typedef {{kind:string,phase:string,prayer:string|null,instruction:string,decade:number|null,bead:number|null,mystery:string,optional:boolean,announcement?:string}} RosaryStep */

export function suggestedMysteries(now = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    timeZone: "Asia/Manila",
  }).format(now);
  const weekly = {
    Monday: "joyful",
    Tuesday: "sorrowful",
    Wednesday: "glorious",
    Thursday: "luminous",
    Friday: "sorrowful",
    Saturday: "joyful",
    Sunday: "glorious",
  };
  return { weekday, id: weekly[weekday] || "joyful" };
}

/** @param {MysterySet} set @returns {RosaryStep[]} */
export function rosaryWalkthrough(set) {
  if (set.items.length !== 5)
    throw new Error("A Rosary set needs five mysteries");
  /** @type {RosaryStep[]} */
  const steps = [];
  /** @param {string} prayer @param {string} phase @param {string} instruction @param {Partial<RosaryStep>} [extra] */
  const add = (prayer, phase, instruction, extra = {}) =>
    steps.push({
      kind: "prayer",
      phase,
      prayer,
      instruction,
      decade: null,
      bead: null,
      mystery: "",
      optional: false,
      ...extra,
    });
  add("sign-of-cross", "opening", "Make the Sign of the Cross.");
  add(
    "apostles-creed",
    "opening",
    "Hold the crucifix and pray the Apostles’ Creed.",
  );
  add("our-father", "opening", "On the first large bead, pray the Our Father.");
  for (let bead = 1; bead <= 3; bead++)
    add(
      "hail-mary",
      "opening",
      `Pray on small bead ${bead} of the three opening beads.`,
      { bead },
    );
  add("glory-be", "opening", "Pray the Glory Be before the first mystery.");
  const ordinals = ["first", "second", "third", "fourth", "fifth"];
  set.items.forEach((item, decade) => {
    const mystery = item.title;
    steps.push({
      kind: "mystery",
      phase: "decade",
      prayer: null,
      instruction: "Announce the mystery, then pause for quiet reflection.",
      decade,
      bead: null,
      mystery,
      optional: false,
      announcement: `The ${ordinals[decade]} ${set.title.replace(/ Mysteries$/, "")} Mystery: ${mystery}.`,
    });
    const context = { decade, mystery };
    add(
      "our-father",
      "decade",
      "On the large bead, pray the Our Father.",
      context,
    );
    for (let bead = 1; bead <= 10; bead++)
      add(
        "hail-mary",
        "decade",
        `Pray on small bead ${bead} of 10, keeping the mystery in mind.`,
        { ...context, bead },
      );
    add(
      "glory-be",
      "decade",
      "At the end of the decade, pray the Glory Be.",
      context,
    );
    add(
      "fatima",
      "decade",
      "This prayer after the decade is optional. Pray it or continue to the next step.",
      { ...context, optional: true },
    );
  });
  add(
    "hail-holy-queen",
    "closing",
    "After five decades, pray the Hail, Holy Queen.",
  );
  add(
    "pray-for-us",
    "closing",
    "When praying together, the leader says ℣ and the assembly responds ℟.",
  );
  add("rosary-prayer", "closing", "Let us pray.");
  add("sign-of-cross", "closing", "Conclude with the Sign of the Cross.");
  return steps;
}
