import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  massProblems,
  parsePost,
  titleDate,
} from "../src/lib/lectionary-source.mjs";
import {
  COLLECTIONS,
  lectionaryKey,
  dayChoices,
  romcalYear,
  underlyingWeekday,
} from "../src/lib/lectionary-keys.mjs";
import { addDays } from "../src/lib/readings.mjs";

// Builds a reusable lectionary from every Awit at Papuri post that carries full
// reading text. Posts come from the WordPress REST API and are cached in the
// ignored .astro/ directory; pass --fetch to download them again.
const root = new URL("..", import.meta.url).pathname;
const cache = join(root, ".astro/lectionary-source");
const output = join(root, "src/data/readings/lectionary");
const api = "https://www.awitatpapuri.com/wp-json/wp/v2/posts";
const perPage = 25;

async function download() {
  const temp = `${cache}.tmp`;
  rmSync(temp, { recursive: true, force: true });
  mkdirSync(temp, { recursive: true });
  for (let page = 1, pages = 1; page <= pages; page++) {
    const response = await fetch(
      `${api}?per_page=${perPage}&page=${page}&orderby=date&order=asc&_fields=id,date,modified,link,title,content`,
      { signal: AbortSignal.timeout(60000) },
    );
    if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
    pages = Number(response.headers.get("x-wp-totalpages")) || page;
    writeFileSync(
      join(temp, `page-${String(page).padStart(3, "0")}.json`),
      await response.text(),
    );
    process.stdout.write(`\rDownloaded ${page}/${pages} pages`);
    // Sequential, spaced requests keep the bulk import gentle on the provider.
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  process.stdout.write("\n");
  rmSync(cache, { recursive: true, force: true });
  renameSync(temp, cache);
}

if (process.argv.includes("--fetch") || !existsSync(cache)) await download();
const posts = readdirSync(cache)
  .sort()
  .flatMap((file) => JSON.parse(readFileSync(join(cache, file), "utf8")));

const stop = new Set(
  "of the in and a an at on for to st sts saint saints mass solemnity feast memorial optional during white red green violet rose purple gold black i ii iii b c".split(
    " ",
  ),
);
const tokens = (text) =>
  new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 1 && !stop.has(word)),
  );
const overlap = (a, b) => [...tokens(a)].filter((w) => tokens(b).has(w)).length;
const weekdayLabel =
  /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday) (of|after|in)\b|\b(Lunes|Martes|Miyerkules|Huwebes|Biyernes|Sabado) (ng|sa|pagkaraan|ika)\b/i;
const vigilLabel = /\b(vigil|bisperas)\b/i;
const slug = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const days = new Map();
async function choices(date) {
  if (!days.has(date)) days.set(date, await dayChoices(date));
  return days.get(date);
}

/** Decide which liturgical day a post's readings belong to. */
async function classify(date, mass) {
  const today = await choices(date);
  const primary = today.find((day) => !day.isOptional) || today[0];
  const ferial =
    today.map(underlyingWeekday).find(Boolean) ||
    (primary.rank === "WEEKDAY" ? primary : undefined);
  const text = mass.label || mass.celebration;
  const votive = mass.celebration.match(
    /^Mga Pagbasa mula sa(?: —)? (Misa .+)$/,
  );
  if (!mass.label && votive)
    return { votive: votive[1], occurs: date, priority: 2 };
  // Memorial posts often say "Mga Pagbasa mula sa Miyerkules ng Ika-32 Linggo…";
  // such weekday readings rank below a plain weekday's own post.
  if (ferial && !vigilLabel.test(text) && weekdayLabel.test(mass.celebration))
    return {
      day: ferial,
      occurs: date,
      priority: primary.rank === "WEEKDAY" ? 2 : 1,
    };
  const candidates = [...new Set([...today, ferial].filter(Boolean))].map(
    (day) => ({ day, occurs: date, name: day.name }),
  );
  if (vigilLabel.test(text) && !/easter vigil/i.test(text))
    for (const day of await choices(addDays(date, 1)))
      if (day.rank === "SOLEMNITY" || day.rank === "SUNDAY")
        candidates.push({
          day,
          occurs: addDays(date, 1),
          name: day.name,
          vigil: true,
        });
  const scored = candidates
    .map((c) => ({ ...c, score: overlap(text, c.name) + (c.vigil ? 1 : 0) }))
    .sort((a, b) => b.score - a.score);
  if (mass.label && scored[0]?.score > 0) return { ...scored[0], priority: 2 };
  // No usable label: memorials normally take the weekday readings.
  if (primary.rank === "MEMORIAL" && ferial)
    return { day: ferial, occurs: date, priority: 1 };
  // Further posts for the same day (All Souls, votive options) become extra masses.
  return { day: primary, occurs: date, priority: 2 };
}

const report = {
  skipped: [],
  warnings: [],
  cycle_mismatch: [],
  weekday_readings: [],
};
const candidates = new Map();
const byDate = new Map();
for (const post of posts) {
  if (!/UNANG PAGBASA/.test(post.content.rendered)) continue;
  const date = titleDate(post.title.rendered) || post.date.slice(0, 10);
  byDate.set(date, [...(byDate.get(date) || []), post]);
}
const classified = [];
for (const [date, datePosts] of [...byDate].sort()) {
  for (const post of datePosts.sort(
    (a, b) => a.date.localeCompare(b.date) || a.id - b.id,
  )) {
    let mass;
    try {
      mass = parsePost(post.content.rendered);
    } catch (error) {
      report.skipped.push({ date, url: post.link, problems: [error.message] });
      continue;
    }
    const { errors, warnings } = massProblems(mass);
    if (errors.length) {
      report.skipped.push({ date, url: post.link, problems: errors });
      continue;
    }
    classified.push({
      date,
      post,
      mass,
      warnings,
      match: await classify(date, mass),
    });
  }
}

// A memorial post may use the weekday readings without saying so. Weekday
// gospels repeat across years (and across cycles I/II in Ordinary Time), so a
// memorial post whose gospel matches its weekday's is filed as that weekday,
// unless its first reading differs from that weekday's in the same cycle
// (a proper first reading, as for St. Barnabas or Sts. Timothy and Titus).
const reading = (mass, type) =>
  mass.sections
    .find((s) => s.type === type)
    ?.reference.replace(/[\s–—-]+/g, "")
    .toLowerCase();
const weekdayGospels = new Map();
const weekdayFirsts = new Map();
const add = (map, key, value) => map.set(key, [...(map.get(key) || []), value]);
// Only plain weekday posts count; memorial-day posts may mix proper readings.
for (const { match, mass } of classified)
  if (match.day?.rank === "WEEKDAY" && match.priority === 2) {
    const { collection, key } = lectionaryKey(match.day);
    add(weekdayGospels, key, reading(mass, "gospel"));
    add(weekdayFirsts, `${collection}/${key}`, reading(mass, "first"));
  }
for (const item of classified) {
  const { match, mass, date, post } = item;
  if (!match.day || lectionaryKey(match.day).collection !== "saints") continue;
  const ferial = (await choices(date)).map(underlyingWeekday).find(Boolean);
  if (
    !ferial ||
    !weekdayGospels.get(ferial.id)?.includes(reading(mass, "gospel"))
  )
    continue;
  const { collection, key } = lectionaryKey(ferial);
  const firsts = weekdayFirsts.get(`${collection}/${key}`);
  if (firsts && !firsts.includes(reading(mass, "first"))) continue;
  item.match = { day: ferial, occurs: date, priority: 1 };
  report.weekday_readings.push({ date, url: post.link, weekday: ferial.id });
}

for (const { date, post, mass, warnings, match } of classified) {
  {
    const { collection, key } = match.votive
      ? { collection: "votive", key: slug(match.votive) }
      : lectionaryKey(match.day);
    const cycle = (mass.label || mass.celebration).match(/\(([ABC])\)/)?.[1];
    if (
      cycle &&
      collection.startsWith("year-") &&
      collection !== `year-${cycle.toLowerCase()}`
    )
      report.cycle_mismatch.push({
        date,
        url: post.link,
        collection,
        label: mass.label,
      });
    if (warnings.length)
      report.warnings.push({ date, url: post.link, problems: warnings });
    const id = `${collection}/${key}`;
    if (!candidates.has(id))
      candidates.set(id, {
        collection,
        key,
        name: match.votive || match.day.name,
        occurrences: new Map(),
      });
    const entry = candidates.get(id);
    const occurrence = entry.occurrences.get(match.occurs) || {
      priority: 0,
      masses: [],
    };
    occurrence.priority = Math.max(occurrence.priority, match.priority);
    const sections = JSON.stringify(mass.sections);
    // Some dates repeat an identical post.
    if (occurrence.masses.some((m) => JSON.stringify(m.sections) === sections))
      continue;
    occurrence.masses.push({
      label: mass.label,
      celebration: mass.celebration,
      vigil: Boolean(match.vigil) || undefined,
      source_url: post.link,
      source_date: date,
      sections: mass.sections,
    });
    entry.occurrences.set(match.occurs, occurrence);
  }
}

// Keep the best occurrence per liturgical day: a direct match over a memorial
// fallback, then the most recent year.
const lectionary = Object.fromEntries(COLLECTIONS.map((c) => [c, {}]));
for (const entry of candidates.values()) {
  const [occurs, chosen] = [...entry.occurrences].sort(
    ([dateA, a], [dateB, b]) =>
      b.priority - a.priority || dateB.localeCompare(dateA),
  )[0];
  lectionary[entry.collection][entry.key] = {
    key: entry.key,
    name: entry.name,
    occurs,
    masses: chosen.masses.sort(
      (a, b) => Number(Boolean(b.vigil)) - Number(Boolean(a.vigil)),
    ),
  };
}

// Expected days from several liturgical years, to report coverage gaps.
const expected = Object.fromEntries(COLLECTIONS.map((c) => [c, new Map()]));
for (let year = 2025; year <= 2032; year++)
  for (const date of Object.keys(await romcalYear(year))) {
    const primary = (await choices(date)).find((day) => !day.isOptional);
    if (!primary) continue;
    const ferial = underlyingWeekday(primary);
    // Christmas octave ferias are always displaced by their feasts.
    const days = [
      primary,
      ...(ferial && !ferial.id.startsWith("christmas_octave") ? [ferial] : []),
    ];
    for (const day of days) {
      const { collection, key } = lectionaryKey(day);
      if (collection === "saints" && !["SOLEMNITY", "FEAST"].includes(day.rank))
        continue;
      expected[collection].set(key, day.name);
    }
  }

mkdirSync(output, { recursive: true });
let changed = 0;
const write = (name, data) => {
  const file = join(output, `${name}.json`);
  const json = `${JSON.stringify(data, null, 2)}\n`;
  if (existsSync(file) && readFileSync(file, "utf8") === json) return;
  writeFileSync(`${file}.tmp`, json);
  renameSync(`${file}.tmp`, file);
  changed++;
};
const coverage = {};
for (const collection of COLLECTIONS) {
  const entries = Object.fromEntries(
    Object.entries(lectionary[collection]).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
  );
  write(collection, {
    schema_version: 1,
    source: "awit-at-papuri",
    language: "fil",
    collection,
    entries,
  });
  const missing = [...expected[collection]]
    .filter(([key]) => !entries[key])
    .map(([key, name]) => ({ key, name }))
    .sort((a, b) => a.key.localeCompare(b.key));
  coverage[collection] = {
    entries: Object.keys(entries).length,
    expected: expected[collection].size,
    missing,
  };
}
write("manifest", {
  schema_version: 1,
  source: "awit-at-papuri",
  source_api: api,
  collections: COLLECTIONS,
  coverage,
  report,
});

console.log(
  `Posts: ${posts.length}; with full readings: ${[...byDate.values()].flat().length}.`,
);
for (const [collection, c] of Object.entries(coverage))
  console.log(
    `${collection.padEnd(10)} ${String(c.entries).padStart(4)} entries; ${c.missing.length} of ${c.expected} expected days missing`,
  );
console.log(
  `Skipped ${report.skipped.length}, cycle mismatches ${report.cycle_mismatch.length}, warnings ${report.warnings.length}.`,
);
console.log(
  changed
    ? `Wrote ${changed} file(s) to src/data/readings/lectionary/.`
    : "Lectionary unchanged.",
);
