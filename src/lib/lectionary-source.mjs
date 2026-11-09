import { parse } from "node-html-parser";

// Parses Awit at Papuri WordPress posts (REST API `content.rendered`) into
// lectionary masses. Unlike readings-source.mjs, alternates, vigil readings and
// repeated sections are kept, because a lectionary must hold every option.
const months = [
  ["enero", "january"],
  ["pebrero", "february"],
  ["marso", "march"],
  ["abril", "april"],
  ["mayo", "may"],
  ["hunyo", "june"],
  ["hulyo", "july"],
  ["agosto", "august"],
  ["setyembre", "september"],
  ["oktubre", "october"],
  ["nobyembre", "november"],
  ["disyembre", "december"],
];
const headings = new Map([
  ["UNANG PAGBASA", "first"],
  ["UNANG PABGASA", "first"],
  ["IKALAWANG PAGBASA", "second"],
  ["IKATLONG PAGBASA", "third"],
  ["IKAAPAT NA PAGBASA", "fourth"],
  ["IKALIMANG PAGBASA", "fifth"],
  ["IKA-ANIM NA PAGBASA", "sixth"],
  ["IKAPITONG PAGBASA", "seventh"],
  ["SULAT", "epistle"],
  ["SALMONG TUGUNAN", "psalm"],
  ["SAMONG TUGUNAN", "psalm"],
  ["ALELUYA", "acclamation"],
  ["AWIT-PAMBUNGAD SA MABUTING BALITA", "acclamation"],
  ["AWIT PAMBUNGAD SA MABUTING BALITA", "acclamation"],
  ["AWIT TUNGKOL SA MABUTING BALITA", "acclamation"],
  ["PAGPAPAHAYAG BAGO ANG MABUTING BALITA", "acclamation"],
  ["MABUTING BALITA", "gospel"],
]);
const readingTypes = new Set([
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "epistle",
  "gospel",
]);
const reference = /\b\d+\s*,\s*\d/;
// English celebration labels end with the vestment color, e.g. "(Violet or White)".
const liturgicalColor =
  /\((?:White|Red|Green|Violet|Rose|Purple|Gold|Black)\b[^)]*\)/;

/** Date from a post title such as "Mga Pagbasa – Lunes, Hunyo 01, 2015". */
export function titleDate(title) {
  const text = parse(title).textContent.toLowerCase();
  const match = text.match(/([a-z]+),?\s+(\d{1,2}),?\s+(\d{4})/);
  if (!match) return "";
  const month = months.findIndex((names) => names.includes(match[1]));
  if (month < 0) return "";
  const day = `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[2].padStart(2, "0")}`;
  const check = new Date(`${day}T12:00:00Z`);
  return !Number.isNaN(check.getTime()) &&
    check.toISOString().slice(0, 10) === day
    ? day
    : "";
}
function paragraphText(node) {
  const safe = parse(
    node.innerHTML.replace(/<br\s*\/?\s*>[\t ]*(?:\r?\n[\t ]*)?/gi, "\n"),
  );
  safe
    .querySelectorAll("script, style, iframe, audio")
    .forEach((n) => n.remove());
  return safe.textContent
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .trim();
}
const headingKey = (line) =>
  line
    .replace(/[:.]+$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
// Headings are written in capitals; a psalm response "Aleluya." is not one.
const headingType = (line) =>
  line === line.toUpperCase() ? headings.get(headingKey(line)) : undefined;
const boldOnly = (p) => {
  const strong = p.querySelectorAll("strong, b");
  return (
    strong.length > 0 &&
    strong
      .map((s) => s.textContent)
      .join("")
      .replace(/\s+/g, "") === p.textContent.replace(/\s+/g, "")
  );
};
const stop = (heading, p) =>
  /^(PANALANGIN NG BAYAN|PANALANGING PANGKALAHATAN|PAGNINILAY|Pages:)/i.test(
    heading,
  ) ||
  (boldOnly(p) &&
    heading.length < 60 &&
    /[A-Z]{4}/.test(heading) &&
    heading === heading.toUpperCase() &&
    !headings.has(headingKey(heading)));

/**
 * @param {string} html WordPress `content.rendered`
 * @returns {{label: string, celebration: string, sections: any[]}}
 */
export function parsePost(html) {
  // Celebration lines are often mis-nested (<strong><em>…</strong>…</em>),
  // which breaks paragraph parsing; emphasis carries no meaning here.
  const paragraphs = parse(html.replace(/<\/?em>/gi, "")).querySelectorAll("p");
  const start = paragraphs.findIndex((p) =>
    headingType(paragraphText(p).split("\n")[0]),
  );
  if (start < 0) throw new Error("No reading headings");
  // Celebration lines sit between the video/subscribe block and the first reading.
  const intro = [];
  for (let i = start - 1; i >= 0 && start - i <= 3; i--) {
    const p = paragraphs[i];
    const value = paragraphText(p);
    if (
      p.querySelector("iframe, audio") ||
      /Subscribe|Podcast:|powerpress/.test(value + p.getAttribute("class"))
    )
      break;
    intro.unshift(
      ...value
        .split(/\n+/)
        .map((line) => line.trim())
        .filter((line) => line && line.length <= 220),
    );
  }
  const label = intro.find((line) => liturgicalColor.test(line));
  const celebration = intro.filter((line) => line !== label).join(" — ");
  const sections = [];
  let section;
  let response = "";
  let done = false;
  for (const p of paragraphs.slice(start)) {
    if (
      p.querySelector("iframe, audio") ||
      /powerpress|post-page-numbers/.test(p.getAttribute("class") || "")
    )
      continue;
    const text = paragraphText(p);
    if (!text) continue;
    // Older posts put a whole psalm in one paragraph separated by blank lines.
    for (const value of text.split(/\n\s*\n/).map((v) => v.trim())) {
      if (!value) continue;
      const lines = value.split("\n");
      const type = headingType(lines[0]);
      if (type) {
        section = {
          type,
          heading: lines[0].replace(/:$/, "").trim(),
          reference: lines.slice(1).join(" ").trim(),
          blocks: [],
        };
        sections.push(section);
        response = "";
        continue;
      }
      if (stop(lines[0], p)) {
        done = true;
        break;
      }
      if (!section) continue;
      // "o kaya Genesis 1, 1. 26-31a" opens an alternative to the current section;
      // "o kaya: Aleluya." inside a psalm is only an alternative response.
      const alternate = value.match(/^o kaya\s*:?\s*([\s\S]*)$/i);
      if (alternate && (reference.test(alternate[1]) || !alternate[1])) {
        const rest = alternate[1].split("\n");
        const refIndex = rest.findIndex((line) => reference.test(line));
        section = {
          type: section.type,
          heading: section.heading,
          alternative: true,
          label: ["o kaya", rest.slice(0, Math.max(refIndex, 0)).join(" ")]
            .filter(Boolean)
            .join(": "),
          reference: refIndex >= 0 ? rest.slice(refIndex).join(" ").trim() : "",
          blocks: [],
        };
        sections.push(section);
        response = "";
        continue;
      }
      // Some acclamations have no scripture reference; the verse is the text.
      const verseOnly =
        section.type === "acclamation" && !reference.test(value);
      if (!section.reference && !verseOnly) {
        section.reference = value.replace(/\n/g, " ");
        continue;
      }
      if (section.type === "psalm" && !response) response = value;
      section.blocks.push({
        type:
          section.type === "psalm" &&
          (value === response ||
            alternate ||
            /^Tugon\s*:/i.test(value) ||
            boldOnly(p))
            ? "response"
            : value.includes("\n")
              ? "stanza"
              : "paragraph",
        text: value,
      });
    }
    if (done) break;
  }
  return { label: label || "", celebration, sections };
}

/**
 * Checks a parsed mass. `errors` make it unusable; `warnings` are source
 * omissions (e.g. a missing "Ang Salita ng Diyos.") with the text still intact.
 */
export function massProblems(mass) {
  const errors = [];
  const warnings = [];
  const types = mass.sections.map((s) => s.type);
  for (const required of ["first", "psalm", "gospel"])
    if (!types.includes(required)) errors.push(`missing ${required}`);
  for (const section of mass.sections) {
    if (!section.reference && section.type !== "acclamation")
      errors.push(`${section.type}: no reference`);
    if (!readingTypes.has(section.type)) continue;
    const closing =
      section.type === "gospel"
        ? /Ang Mabuting Balita ng Panginoon/
        : /Ang Salita ng Diyos/;
    if (!section.blocks.some((b) => closing.test(b.text)))
      warnings.push(`${section.type}: closing formula missing`);
    const body = section.blocks.map((b) => b.text).join(" ");
    if (body.length < 80) errors.push(`${section.type}: body missing`);
  }
  for (const section of mass.sections.filter((s) => s.type === "psalm"))
    if (!section.blocks.some((b) => b.type !== "response"))
      errors.push("psalm: stanzas missing");
  return { errors, warnings };
}
