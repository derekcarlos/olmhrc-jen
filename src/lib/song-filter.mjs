/** @param {string} text */
const normalize = (text) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * @param {{title:string, composer?:string, arranger?:string, language?:string, mass_parts:string[], seasons:string[], occasions:string[]}} song
 * @param {{query?:string, part?:string, season?:string, occasion?:string}} filters
 */
export function matchesSong(song, filters) {
  const searchable = normalize(
    [song.title, song.composer, song.arranger, song.language]
      .filter(Boolean)
      .join(" "),
  );
  const words = normalize(filters.query ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  /** @param {string[]} tags @param {string | undefined} selected */
  const matchesTag = (tags, selected) =>
    !selected ||
    (selected === "__untagged" ? tags.length === 0 : tags.includes(selected));
  return (
    words.every((word) => searchable.includes(word)) &&
    (!filters.part || song.mass_parts.includes(filters.part)) &&
    matchesTag(song.seasons, filters.season) &&
    matchesTag(song.occasions, filters.occasion)
  );
}
