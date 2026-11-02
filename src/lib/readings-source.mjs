import { parse } from "node-html-parser";
import { validDate, validRecord } from "./readings.mjs";

const months = [
  "Enero",
  "Pebrero",
  "Marso",
  "Abril",
  "Mayo",
  "Hunyo",
  "Hulyo",
  "Agosto",
  "Setyembre",
  "Oktubre",
  "Nobyembre",
  "Disyembre",
];
const weekdays = [
  "Linggo",
  "Lunes",
  "Martes",
  "Miyerkules",
  "Huwebes",
  "Biyernes",
  "Sabado",
];
export function sourceUrl(day) {
  if (!validDate(day)) throw new Error("Invalid source date");
  const d = new Date(`${day}T12:00:00Z`);
  return `https://www.awitatpapuri.com/${day.replaceAll("-", "/")}/${weekdays[d.getUTCDay()].toLowerCase()}-${months[d.getUTCMonth()].toLowerCase()}-${d.getUTCDate()}-${d.getUTCFullYear()}/`;
}
const headings = new Map([
  ["UNANG PAGBASA", "first"],
  ["SALMONG TUGUNAN", "psalm"],
  ["IKALAWANG PAGBASA", "second"],
  ["ALELUYA", "acclamation"],
  ["AWIT-PAMBUNGAD SA MABUTING BALITA", "acclamation"],
  ["AWIT PAMBUNGAD SA MABUTING BALITA", "acclamation"],
  ["PAGPAPAHAYAG BAGO ANG MABUTING BALITA", "acclamation"],
  ["MABUTING BALITA", "gospel"],
]);
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
export function parseReadingPage(html, day, now = new Date()) {
  if (!validDate(day)) throw new Error("Invalid source date");
  const doc = parse(html);
  const d = new Date(`${day}T12:00:00Z`);
  const title = `${weekdays[d.getUTCDay()]}, ${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  if (doc.querySelector(".entry-title")?.textContent.trim() !== title)
    throw new Error(`Source date does not match ${day}`);
  const content = doc.querySelector(".entry-content");
  if (!content) throw new Error("Missing readings content");
  const paragraphs = content.querySelectorAll("p");
  const sections = [];
  let section;
  let celebration = "";
  let response = "";
  for (const p of paragraphs) {
    if (
      p.querySelector("iframe, audio") ||
      /powerpress|post-page-numbers/.test(p.getAttribute("class") || "")
    )
      continue;
    const value = paragraphText(p);
    if (!value) continue;
    const lines = value.split("\n");
    const heading = lines[0].trim();
    if (heading === "PANALANGIN NG BAYAN" || /^Pages:/.test(heading)) break;
    const type = headings.get(heading);
    if (type) {
      if (sections.some((s) => s.type === type))
        throw new Error("Unsupported alternate or duplicate reading sections");
      section = {
        type,
        heading,
        reference: lines.slice(1).join(" ").trim(),
        blocks: [],
      };
      sections.push(section);
      continue;
    }
    if (!section) {
      if (!celebration && !p.querySelector("a")) celebration = value;
      continue;
    }
    if (!section.reference) {
      section.reference = value;
      continue;
    }
    if (section.type === "psalm" && !response) response = value;
    section.blocks.push({
      type:
        section.type === "psalm" && value === response
          ? "response"
          : value.includes("\n")
            ? "stanza"
            : "paragraph",
      text: value,
    });
    if (
      section.type === "gospel" &&
      /Ang Mabuting Balita ng Panginoon\./.test(value)
    )
      break;
  }
  const record = {
    date: day,
    celebration,
    language: "fil",
    source_url: sourceUrl(day),
    retrieved_at: now.toISOString(),
    sections,
  };
  if (d.getUTCDay() === 0 && !sections.some((s) => s.type === "second"))
    throw new Error("Incomplete Sunday: second reading missing");
  if (!validRecord(record))
    throw new Error("Unsupported or incomplete reading sections");
  for (const section of sections.filter((s) =>
    ["first", "second", "gospel"].includes(s.type),
  )) {
    const closing =
      section.type === "gospel"
        ? "Ang Mabuting Balita ng Panginoon."
        : "Ang Salita ng Diyos.";
    if (!section.blocks.some((b) => b.text.includes(closing)))
      throw new Error(`Incomplete ${section.type}: closing formula missing`);
    const body = section.blocks
      .flatMap((b) => b.text.replace(closing, "").split("\n"))
      .filter(
        (line) =>
          !/^(?:Pagbasa mula|[+†]?\s*Ang (?:simula ng )?Mabuting Balita|Mga kapatid[,:]?\s*$)/i.test(
            line.trim(),
          ),
      )
      .join(" ")
      .trim();
    if (body.length < 12)
      throw new Error(`Incomplete ${section.type}: reading body missing`);
  }
  const psalm = sections.find((s) => s.type === "psalm");
  if (
    !psalm?.blocks.some(
      (b) => b.type !== "response" && b.text.trim().length >= 12,
    )
  )
    throw new Error("Incomplete psalm: stanza content missing");
  return record;
}
export async function fetchReading(day, fetcher = globalThis.fetch) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetcher(sourceUrl(day), {
        signal: AbortSignal.timeout(20000),
      });
      if (response.status === 404)
        return {
          date: day,
          record: null,
          unavailable: true,
          message: "Hindi pa nailalathala sa pinagmulan (404).",
        };
      if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
      const html = await response.text();
      if (html.length > 2_000_000) throw new Error("Source response too large");
      return { date: day, record: parseReadingPage(html, day), message: "" };
    } catch (error) {
      lastError = error;
    }
  }
  return {
    date: day,
    record: null,
    message:
      lastError instanceof Error ? lastError.message : "Source request failed",
  };
}
