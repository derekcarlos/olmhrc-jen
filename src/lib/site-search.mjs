/** @typedef {import('../types/search.ts').SearchDocument} SearchDocument */
/** @typedef {import('../types/search.ts').SearchHit} SearchHit */

export const searchTypes = {
  songs: "Songs",
  lineups: "Song lineups",
  prayers: "Prayers",
  readings: "Readings",
  news: "News",
  pages: "Chapel pages",
};

export const foldSearch = (text) =>
  String(text)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[’‘']/g, "")
    .toLowerCase();
export const normalizeSearch = (text) =>
  foldSearch(text)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export const searchTerms = (query) =>
  [...new Set(normalizeSearch(query).split(/\s+/).filter(Boolean))].slice(
    0,
    16,
  );

/** One insertion, removal, or substitution; limited to longer words. */
function nearWord(a, b) {
  if (a === b) return true;
  if (a.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  let first = 0,
    second = 0,
    edits = 0;
  while (first < a.length && second < b.length) {
    if (a[first] === b[second]) {
      first++;
      second++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length >= b.length) first++;
    if (b.length >= a.length) second++;
  }
  return edits + (first < a.length || second < b.length ? 1 : 0) <= 1;
}

/** @param {SearchDocument[]} documents @param {string} query @param {{type?:string}} [options] @returns {SearchHit[]} */
export function searchSite(documents, query, options = {}) {
  const terms = searchTerms(String(query).slice(0, 160));
  if (!terms.length) return [];
  const phrase = terms.join(" ");
  const candidates = documents.filter(
    (document) =>
      !options.type || options.type === "all" || document.type === options.type,
  );
  function rank(fuzzy) {
    return candidates
      .flatMap((document) => {
        const title = normalizeSearch(document.title);
        const metadata = normalizeSearch(
          `${document.description} ${document.keywords}`,
        );
        const body = normalizeSearch(document.content);
        const words = (title + " " + metadata).split(" ");
        let score = 0;
        let approximate = false;
        for (const term of terms) {
          if (title.includes(term))
            score += title.split(" ").includes(term) ? 55 : 35;
          else if (metadata.includes(term)) score += 15;
          else if (body.includes(term)) score += 5;
          else if (fuzzy && words.some((word) => nearWord(term, word))) {
            score += title.split(" ").some((word) => nearWord(term, word))
              ? 35
              : 2;
            approximate = true;
          } else return [];
        }
        if (title === phrase) score += 1200;
        else if (title.startsWith(phrase)) score += 180;
        else if (title.includes(phrase)) score += 120;
        if (terms.length > 1 && body.includes(phrase)) score += 70;
        if (document.type === "songs") score += 3;
        return [{ document, score, fuzzy: approximate }];
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.document.title.localeCompare(b.document.title, "en"),
      );
  }
  const exact = rank(false);
  return exact.length ? exact : rank(true);
}

/** @param {string} text @param {string} query @param {number} [length] */
export function searchExcerpt(text, query, length = 210) {
  const plain = text.replace(/\s+/g, " ").trim();
  const folded = foldSearch(plain);
  const matches = searchTerms(query)
    .map((term) => folded.indexOf(term))
    .filter((index) => index >= 0);
  const first = matches.length ? Math.min(...matches) : 0;
  let start = Math.max(0, first - 60);
  if (start > 0) {
    const boundary = plain.indexOf(" ", start);
    if (boundary >= 0 && boundary < first) start = boundary + 1;
  }
  let end = Math.min(plain.length, start + length);
  if (end < plain.length) {
    const boundary = plain.lastIndexOf(" ", end);
    if (boundary > start) end = boundary;
  }
  return `${start ? "…" : ""}${plain.slice(start, end)}${end < plain.length ? "…" : ""}`;
}
