import test from "node:test";
import assert from "node:assert/strict";
import { searchSite, searchExcerpt } from "../src/lib/site-search.mjs";
import {
  buildSearchDocuments,
  markdownSearchText,
} from "../src/lib/search-documents.mjs";

const documents = [
  {
    url: "/songs/santo",
    title: "Santo · Missa Magnificat",
    type: "songs",
    description: "Choir practice",
    keywords: "Sanctus Ferdinand Bautista Filipino",
    content:
      "Santo, Santo, Santo. Napupuno ang langit at lupa ng kaluwalhatian Mo.",
  },
  {
    url: "/prayers/rosary",
    title: "The Holy Rosary",
    type: "prayers",
    description: "A prayer guide",
    keywords: "Mary",
    content: "Hail Mary, full of grace, the Lord is with thee.",
  },
  {
    url: "/news/choir",
    title: "Choir practice",
    type: "news",
    description: "Learn Santo this week",
    keywords: "",
    content: "Join the choir to sing Santo from Missa Magnificat.",
  },
  {
    url: "/about",
    title: "Our chapel in Biñan",
    type: "pages",
    description: "Our village chapel",
    keywords: "",
    content: "Jubilation Enclave North",
  },
];

test("global search finds songs by title, lyrics, composer, and Mass part, with title matches first", () => {
  for (const query of [
    "magnificat",
    "napupuno ang langit",
    "bautista",
    "sanctus",
  ])
    assert.equal(
      searchSite(documents, query)[0]?.document.url,
      "/songs/santo",
      query,
    );
  assert.equal(searchSite(documents, "santo")[0].document.type, "songs");
  assert.equal(
    searchSite(documents, "full of grace")[0].document.type,
    "prayers",
  );
  assert.equal(searchSite(documents, "BINAN")[0].document.url, "/about");
});

test("search treats input as literal text and supports partial words, a small typo, filters, and empty states", () => {
  assert.equal(searchSite(documents, "magni")[0].document.type, "songs");
  assert.equal(searchSite(documents, "magnifcat")[0].document.type, "songs");
  assert.deepEqual(
    searchSite(documents, "santo", { type: "news" }).map(
      (result) => result.document.url,
    ),
    ["/news/choir"],
  );
  for (const query of [
    "",
    "   ",
    "[.*",
    "qwertyzxq",
    "<script>alert(1)</script>",
  ])
    assert.deepEqual(searchSite(documents, query), [], query);
  assert.deepEqual(searchSite(documents, "santo nonexistent"), []);
});

test("lyrics excerpts show the matching words rather than only the start of a document", () => {
  const text =
    "Introductory paragraph. ".repeat(30) +
    "Napupuno ang langit at lupa ng kaluwalhatian Mo. " +
    "Closing text. ".repeat(30);
  const excerpt = searchExcerpt(text, "napupuno", 190);
  assert.ok(excerpt.includes("Napupuno ang langit"));
  assert.ok(excerpt.length <= 200);
});

test("Tagalog contractions match with smart apostrophes, straight apostrophes, or none", () => {
  const records = [
    {
      ...documents[0],
      title: "Ang Puso Ko’y Nagpupuri",
      content: "Kami’y umaawit.",
    },
  ];
  for (const query of ["puso koy", "puso ko'y", "puso ko’y", "kamiy"])
    assert.equal(searchSite(records, query).length, 1, query);
});

test("a misspelled song title ranks above songs that only mention that title in metadata", () => {
  const records = [
    {
      ...documents[0],
      title: "Ama Namin",
      keywords: "Missa Magnificat",
      content: "",
    },
    {
      ...documents[0],
      url: "/songs/magnificat",
      title: "Magnificat (All that I am)",
      keywords: "David Haas",
      content: "",
    },
  ];
  assert.equal(
    searchSite(records, "magnifcat")[0].document.url,
    "/songs/magnificat",
  );
});

test("index excludes drafts, placeholders, template routes, and future news; canonical songs are not duplicated", () => {
  const sources = [
    {
      id: "santo",
      type: "songs",
      url: "/songs/santo",
      data: { title: "Santo", description: "Practice", draft: false },
      body: "Lyrics here",
    },
    {
      id: "draft",
      type: "songs",
      url: "/songs/draft",
      data: { title: "Secret", draft: true },
      body: "secret lyrics",
    },
    {
      id: "placeholder",
      type: "songs",
      url: "/songs/placeholder",
      data: { title: "Placeholder", placeholder: true },
      body: "todo",
    },
    {
      id: "later",
      type: "news",
      url: "/news/later",
      data: { title: "Unpublished", date: "2099-01-01" },
    },
    {
      id: "demo",
      type: "pages",
      url: "/blog/demo",
      data: { title: "Template demo" },
    },
    {
      id: "unsafe",
      type: "pages",
      url: "https://example.com",
      data: { title: "Outside" },
    },
  ];
  const index = buildSearchDocuments(
    [...sources, sources[0]],
    new Date("2026-11-08"),
  );
  assert.deepEqual(
    index.map((document) => document.url),
    ["/songs/santo"],
  );
  assert.equal(index[0].content, "Lyrics here");
});

test("index strips MDX implementation details while retaining lyrics, link labels, and accessible text", () => {
  const text = markdownSearchText(
    'import Notice from "@/Notice.astro";\n\n## Chorus\n<Notice>Practice slowly.</Notice>\n[Our prayer](/prayers)\n**Holy &amp; blessed**\n<script>hiddenCode()</script>',
  );
  assert.ok(text.includes("Chorus"));
  assert.ok(text.includes("Practice slowly."));
  assert.ok(text.includes("Our prayer"));
  assert.ok(text.includes("Holy & blessed"));
  assert.doesNotMatch(text, /import|hiddenCode|Notice|\/prayers/);
});
