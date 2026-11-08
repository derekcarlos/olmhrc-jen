/** @typedef {import('../types/rosary.ts').RosaryPrayer} Prayer */
/** @typedef {{kind:string,phase:string,prayer:string|null,station:number|null}} StationStep */

/** @returns {Prayer[]} */
export function stationsPrayerCatalog(devotion, rosary) {
  return [
    ...rosary.prayers.filter((prayer) =>
      ["sign-of-cross", "our-father", "hail-mary", "glory-be"].includes(
        prayer.id,
      ),
    ),
    ...devotion.prayers,
  ];
}

/** @returns {StationStep[]} */
export function stationsWalkthrough(devotion) {
  if (devotion.stations.length !== 14)
    throw new Error("The Stations of the Cross need fourteen stations.");
  const steps = [];
  const add = (prayer, phase, station = null) =>
    steps.push({ kind: "prayer", phase, prayer, station });
  add("sign-of-cross", "opening");
  add("stations-opening", "opening");
  devotion.stations.forEach((_station, index) => {
    steps.push({
      kind: "station",
      phase: "stations",
      prayer: null,
      station: index,
    });
    for (const prayer of ["our-father", "hail-mary", "glory-be"])
      add(prayer, "stations", index);
  });
  for (const prayer of [
    "our-father",
    "hail-mary",
    "glory-be",
    "stations-closing",
    "stations-blessing",
    "sign-of-cross",
  ])
    add(prayer, "closing");
  return steps;
}
