import { searchTypes } from "./site-search.mjs";

/** Turn stored Markdown/MDX into searchable words without executing content. */
export function markdownSearchText(text = "") {
  return String(text)
    .replace(/^\s*import\b[\s\S]*?;\s*/gm, " ")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[^]*?-->/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(
      /&(?:amp|nbsp|quot|apos|lt|gt|#39);/g,
      (entity) =>
        ({
          "&amp;": "&",
          "&nbsp;": " ",
          "&quot;": '"',
          "&apos;": "'",
          "&#39;": "'",
          "&lt;": "<",
          "&gt;": ">",
        })[entity],
    )
    .replace(/[#*_`~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract human-readable structured prayer content without URLs or code. */
export function structuredSearchText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(structuredSearchText).join(" ");
  if (!value || typeof value !== "object") return "";
  return Object.entries(value)
    .filter(
      ([key]) =>
        !/^(?:id|source_url|image|alt|license_url|license|artist|audio|youtube|link|href|draft|placeholder)$/.test(
          key,
        ),
    )
    .map(([, nested]) => structuredSearchText(nested))
    .join(" ");
}

/**
 * @param {Array<{url:string,type:import('../types/search.ts').SearchType,id?:string,data?:Record<string,any>,body?:string,extra?:unknown,keywords?:string[]}>} sources
 * @param {Date} [now]
 * @returns {import('../types/search.ts').SearchDocument[]}
 */
export function buildSearchDocuments(sources, now = new Date()) {
  const seen = new Set();
  return sources
    .flatMap((source) => {
      const data = source.data || {};
      if (
        data.draft ||
        data.placeholder ||
        !data.title ||
        !Object.hasOwn(searchTypes, source.type)
      )
        return [];
      if (
        !/^\/(?!\/)/.test(source.url) ||
        /^\/(?:blog|authors|categories|tags|elements|contact|privacy-policy)(?:\/|$)/.test(
          source.url,
        )
      )
        return [];
      if (source.id?.startsWith("-") || seen.has(source.url)) return [];
      if (source.type === "news" && data.date && new Date(data.date) > now)
        return [];
      seen.add(source.url);
      const keywords = [
        data.composer,
        data.arranger,
        data.language,
        ["tl", "Tagalog", "Filipino"].includes(data.language)
          ? "Tagalog Filipino"
          : data.language === "en"
            ? "English"
            : "",
        ...(data.mass_parts || []),
        ...(data.seasons || []),
        ...(data.occasions || []),
        ...(source.keywords || []),
      ]
        .filter(Boolean)
        .join(" ");
      return [
        {
          url: source.url,
          title: markdownSearchText(data.title),
          type: source.type,
          description: markdownSearchText(data.description || ""),
          keywords: markdownSearchText(keywords),
          byline: [
            data.composer,
            data.arranger && data.arranger !== data.composer
              ? `Arranged by ${data.arranger}`
              : "",
            data.language === "tl"
              ? "Tagalog"
              : data.language === "en"
                ? "English"
                : data.language,
          ]
            .filter(Boolean)
            .join(" · "),
          content: markdownSearchText(
            `${source.body || ""} ${structuredSearchText(source.extra)}`,
          ),
        },
      ];
    })
    .sort((a, b) => a.title.localeCompare(b.title, "en"));
}
