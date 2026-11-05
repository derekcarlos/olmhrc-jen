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

/** @param {MysterySet} set @param {"en"|"tl"} [language] @returns {RosaryStep[]} */
export function rosaryWalkthrough(set, language = "en") {
  const tl = language === "tl";
  const t = (en, tagalog) => (tl ? tagalog : en);
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
  add(
    "sign-of-cross",
    "opening",
    t("Make the Sign of the Cross.", "Mag-antanda ng krus."),
  );
  add(
    "opening-verses",
    "opening",
    t(
      "The leader says ℣ and the congregation responds ℟.",
      "Bibigkasin ng namumuno ang ℣ at tutugon ang lahat sa ℟.",
    ),
  );
  add(
    "apostles-creed",
    "opening",
    t(
      "Hold the crucifix and pray the Apostles’ Creed.",
      "Hawakan ang krus at dasalin ang Sumasampalataya.",
    ),
  );
  add(
    "our-father",
    "opening",
    t(
      "On the first large bead, pray the Our Father.",
      "Sa unang malaking butil, dasalin ang Ama Namin.",
    ),
  );
  for (let bead = 1; bead <= 3; bead++)
    add(
      "hail-mary",
      "opening",
      t(
        `Pray on small bead ${bead} of the three opening beads.`,
        `Dasalin sa maliit na butil ${bead} ng tatlong pambungad na butil.`,
      ),
      { bead },
    );
  add(
    "glory-be",
    "opening",
    t(
      "Pray the Glory Be before the first mystery.",
      "Dasalin ang Papuri sa Ama bago ang unang misteryo.",
    ),
  );
  const ordinals = ["first", "second", "third", "fourth", "fifth"];
  const tagalogOrdinals = [
    "unang",
    "ikalawang",
    "ikatlong",
    "ikaapat na",
    "ikalimang",
  ];
  set.items.forEach((item, decade) => {
    const mystery = item.title;
    steps.push({
      kind: "mystery",
      phase: "decade",
      prayer: null,
      instruction: t(
        "Announce the mystery, then pause for quiet reflection.",
        "Ipahayag ang misteryo, pagkatapos ay magnilay sandali.",
      ),
      decade,
      bead: null,
      mystery,
      optional: false,
      announcement: tl
        ? `Ang ${tagalogOrdinals[decade]} misteryo: ${mystery}.`
        : `The ${ordinals[decade]} ${set.title.replace(/ Mysteries$/, "")} Mystery: ${mystery}.`,
    });
    const context = { decade, mystery };
    add(
      "our-father",
      "decade",
      t(
        "On the large bead, pray the Our Father.",
        "Sa malaking butil, dasalin ang Ama Namin.",
      ),
      context,
    );
    for (let bead = 1; bead <= 10; bead++)
      add(
        "hail-mary",
        "decade",
        t(
          `Pray on small bead ${bead} of 10, keeping the mystery in mind.`,
          `Dasalin sa maliit na butil ${bead} ng 10 habang pinagninilayan ang misteryo.`,
        ),
        { ...context, bead },
      );
    add(
      "glory-be",
      "decade",
      t(
        "At the end of the decade, pray the Glory Be.",
        "Sa pagtatapos ng sampung Aba Ginoong Maria, dasalin ang Papuri sa Ama.",
      ),
      context,
    );
    add(
      "fatima",
      "decade",
      t(
        "This prayer after the decade is optional. Pray it or continue to the next step.",
        "Maaaring dasalin ang panalanging ito pagkatapos ng bawat misteryo, o magpatuloy sa susunod na hakbang.",
      ),
      { ...context, optional: true },
    );
  });
  add(
    "hail-holy-queen",
    "closing",
    t(
      "After five decades, pray the Hail, Holy Queen.",
      "Pagkatapos ng limang misteryo, dasalin ang Aba po Santa Mariang Hari.",
    ),
  );
  add(
    "pray-for-us",
    "closing",
    t(
      "When praying together, the leader says ℣ and the assembly responds ℟.",
      "Bibigkasin ng namumuno ang ℣ at tutugon ang lahat sa ℟.",
    ),
  );
  if (tl) {
    for (const prayer of [
      "litany-opening",
      "litany-trinity",
      "litany-mary",
      "litany-lamb-of-god",
    ])
      add(
        prayer,
        "closing",
        "Bibigkasin ng namumuno ang ℣ at tutugon ang lahat sa ℟.",
      );
  }
  add("rosary-prayer", "closing", t("Let us pray.", "Manalangin tayo."));
  if (tl)
    add(
      "closing-responses",
      "closing",
      "Bibigkasin ng namumuno ang ℣ at tutugon ang lahat sa ℟.",
    );
  add(
    "sign-of-cross",
    "closing",
    t(
      "Conclude with the Sign of the Cross.",
      "Magtapos sa pamamagitan ng pag-aantanda ng krus.",
    ),
  );
  return steps;
}
