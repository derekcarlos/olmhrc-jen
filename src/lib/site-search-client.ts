import {
  foldSearch,
  searchTerms,
  searchSite,
  searchExcerpt,
  searchTypes,
} from "./site-search.mjs";
import type { SearchDocument, SearchType } from "../types/search";

const pageSize = 12;

function highlight(container: HTMLElement, text: string, query: string) {
  const document = container.ownerDocument;
  let folded = "",
    offset = 0;
  const starts: number[] = [],
    ends: number[] = [];
  for (const character of text) {
    const part = foldSearch(character);
    if (!part && ends.length) ends[ends.length - 1] = offset + character.length;
    for (let index = 0; index < part.length; index++) {
      starts.push(offset);
      ends.push(offset + character.length);
    }
    folded += part;
    offset += character.length;
  }
  const ranges: Array<[number, number]> = [];
  for (const term of searchTerms(query)) {
    let from = 0,
      at: number;
    while ((at = folded.indexOf(term, from)) >= 0) {
      ranges.push([starts[at], ends[at + term.length - 1]]);
      from = at + term.length;
    }
  }
  const merged: Array<[number, number]> = [];
  for (const range of ranges.sort((a, b) => a[0] - b[0])) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  let cursor = 0;
  for (const [start, end] of merged) {
    container.append(document.createTextNode(text.slice(cursor, start)));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(start, end);
    container.append(mark);
    cursor = end;
  }
  container.append(document.createTextNode(text.slice(cursor)));
}

function validDocument(value: unknown): value is SearchDocument {
  if (!value || typeof value !== "object") return false;
  const item = value as SearchDocument;
  return (
    typeof item.url === "string" &&
    /^\/(?!\/)/.test(item.url) &&
    typeof item.type === "string" &&
    Object.hasOwn(searchTypes, item.type) &&
    [item.title, item.description, item.keywords, item.content].every(
      (field) => typeof field === "string",
    )
  );
}

export function prepareSearchPage(
  root: HTMLElement,
  loadIndex?: () => Promise<SearchDocument[]>,
) {
  const document = root.ownerDocument;
  const win = document.defaultView!;
  const controller = new win.AbortController();
  const { signal } = controller;
  const field = <T extends HTMLElement = HTMLElement>(name: string) =>
    root.querySelector<T>(`[data-search-${name}]`)!;
  const input = field<HTMLInputElement>("input");
  const form = field<HTMLFormElement>("form");
  const base = root.dataset.searchBase || "";
  let query = "",
    type = "all",
    page = 1;
  let documents: SearchDocument[] | null = null;
  let pending: Promise<SearchDocument[]> | null = null;
  let version = 0;
  let timer: number | undefined;
  const fetchIndex =
    loadIndex ||
    (async () => {
      const response = await fetch(
        new URL(root.dataset.searchIndex!, win.location.href),
        { signal },
      );
      if (!response.ok) throw new Error("Search index unavailable");
      return response.json();
    });
  function ensureIndex() {
    if (documents) return Promise.resolve(documents);
    if (!pending)
      pending = Promise.resolve()
        .then(fetchIndex)
        .then((value) => {
          if (!Array.isArray(value)) throw new Error("Invalid search index");
          documents = value.filter(validDocument);
          return documents;
        })
        .catch((error) => {
          pending = null;
          throw error;
        });
    return pending;
  }
  function readUrl() {
    const params = new URL(win.location.href).searchParams;
    query = (params.get("q") || "").slice(0, 160).trim();
    const selected = params.get("type") || "all";
    type = Object.hasOwn(searchTypes, selected) ? selected : "all";
    page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
    input.value = query;
  }
  function urlFor(targetPage = page) {
    const url = new URL(`${base}/search`, win.location.href);
    if (query) url.searchParams.set("q", query);
    if (type !== "all") url.searchParams.set("type", type);
    if (targetPage > 1) url.searchParams.set("page", String(targetPage));
    return url;
  }
  function updateUrl(push = true) {
    const url = urlFor();
    if (url.href !== win.location.href)
      win.history[push ? "pushState" : "replaceState"](null, "", url);
  }
  function markFilters() {
    root
      .querySelectorAll<HTMLButtonElement>("[data-search-type]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.searchType === type),
        ),
      );
    field("clear").hidden = !query && type === "all";
  }
  function showEmpty(initial: boolean) {
    field("empty").hidden = false;
    field("empty-title").textContent = initial
      ? "Find the song before the first note."
      : "Let’s try another way.";
    field("empty-text").textContent = initial
      ? "Song titles come first. Search lyrics, composers, Mass parts, prayers, readings, or chapel information."
      : "Try a shorter phrase, another spelling, or the Everything filter. You can search a line from the lyrics even if you don’t remember the title.";
    field("suggestions").hidden = !initial;
  }
  async function render() {
    const current = ++version;
    markFilters();
    field("results").replaceChildren();
    field("pagination").hidden = true;
    field("error").hidden = true;
    if (!query) {
      root.setAttribute("aria-busy", "false");
      field("status").textContent =
        "Search by title, composer, or words from the lyrics.";
      root
        .querySelectorAll<HTMLElement>("[data-search-count]")
        .forEach((count) => {
          count.textContent = "";
        });
      showEmpty(true);
      return;
    }
    root.setAttribute("aria-busy", "true");
    field("empty").hidden = true;
    field("status").textContent = "Searching Rosarium…";
    let index: SearchDocument[];
    try {
      index = await ensureIndex();
    } catch {
      if (signal.aborted || current !== version) return;
      root.setAttribute("aria-busy", "false");
      field("status").textContent = "Search is temporarily unavailable.";
      field("error").hidden = false;
      return;
    }
    if (signal.aborted || current !== version) return;
    const matches = searchSite(index, query);
    const results =
      type === "all"
        ? matches
        : matches.filter((hit) => hit.document.type === type);
    root
      .querySelectorAll<HTMLElement>("[data-search-count]")
      .forEach((count) => {
        count.textContent = String(
          count.dataset.searchCount === "all"
            ? matches.length
            : matches.filter(
                (hit) => hit.document.type === count.dataset.searchCount,
              ).length,
        );
      });
    const pages = Math.max(1, Math.ceil(results.length / pageSize));
    page = Math.min(page, pages);
    updateUrl(false);
    root.setAttribute("aria-busy", "false");
    if (!results.length) {
      field("status").textContent =
        `No results for “${query}”${type !== "all" ? ` in ${searchTypes[type as SearchType]}` : ""}.`;
      showEmpty(false);
      return;
    }
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, results.length);
    const close = results.some((hit) => hit.fuzzy)
      ? " close matches"
      : results.length === 1
        ? " result"
        : " results";
    field("status").textContent =
      `${results.length}${close} for “${query}” · Showing ${start + 1}–${end}`;
    const list = field<HTMLOListElement>("results");
    list.start = start + 1;
    for (const hit of results.slice(start, end)) {
      const item = document.createElement("li");
      const category = document.createElement("p");
      category.className = "site-search-result-type";
      category.textContent = searchTypes[hit.document.type];
      const heading = document.createElement("h2");
      const link = document.createElement("a");
      link.href = `${base}${hit.document.url}`;
      highlight(link, hit.document.title, query);
      heading.append(link);
      const excerpt = document.createElement("p");
      excerpt.className = "site-search-result-excerpt";
      const contentMatch = searchTerms(query).some((term) =>
        foldSearch(hit.document.content).includes(term),
      );
      highlight(
        excerpt,
        searchExcerpt(
          contentMatch
            ? hit.document.content
            : hit.document.description || hit.document.content,
          query,
        ),
        query,
      );
      item.append(category, heading);
      if (hit.document.byline) {
        const byline = document.createElement("p");
        byline.className = "site-search-result-byline";
        highlight(byline, hit.document.byline, query);
        item.append(byline);
      }
      item.append(excerpt);
      list.append(item);
    }
    field("pagination").hidden = pages <= 1;
    field("page-label").textContent = `Page ${page} of ${pages}`;
    for (const [name, target, hidden] of [
      ["previous", page - 1, page === 1],
      ["next", page + 1, page === pages],
    ] as const) {
      const link = field<HTMLAnchorElement>(name);
      link.hidden = hidden;
      if (!hidden) link.href = urlFor(target).href;
      else link.removeAttribute("href");
    }
  }
  const search = (push = true) => {
    query = input.value.slice(0, 160).trim();
    page = 1;
    updateUrl(push);
    void render();
  };
  form.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      win.clearTimeout(timer);
      search();
    },
    { signal },
  );
  input.addEventListener(
    "input",
    () => {
      win.clearTimeout(timer);
      timer = win.setTimeout(() => search(false), 180);
    },
    { signal },
  );
  root.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof win.Element) || event.defaultPrevented)
        return;
      const filter = event.target.closest<HTMLElement>("[data-search-type]");
      if (filter) {
        win.clearTimeout(timer);
        type = filter.dataset.searchType!;
        search();
        return;
      }
      if (event.target.closest("[data-search-clear]")) {
        win.clearTimeout(timer);
        input.value = "";
        type = "all";
        search();
        input.focus();
        return;
      }
      if (event.target.closest("[data-search-retry]")) {
        void render();
        return;
      }
      const link = event.target.closest<HTMLAnchorElement>(
        "[data-search-pagination] a[href]",
      );
      if (
        link &&
        !(
          event instanceof win.MouseEvent &&
          (event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.altKey ||
            event.shiftKey)
        )
      ) {
        event.preventDefault();
        win.history.pushState(null, "", link.href);
        readUrl();
        void render();
        input.focus({ preventScroll: true });
        form.scrollIntoView?.({ block: "start" });
      }
    },
    { signal },
  );
  win.addEventListener(
    "popstate",
    () => {
      win.clearTimeout(timer);
      readUrl();
      void render();
    },
    { signal },
  );
  readUrl();
  void render();
  return () => {
    version++;
    controller.abort();
    win.clearTimeout(timer);
  };
}
