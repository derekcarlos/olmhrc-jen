import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { prepareSearchPage } from "../src/lib/site-search-client.ts";
import { prepareSearchDialog } from "../src/lib/site-search-dialog.ts";

const documents = [
  ...Array.from({ length: 25 }, (_, index) => ({
    url: `/songs/holy-${index}`,
    title: `Holy Song ${String(index).padStart(2, "0")}`,
    type: "songs",
    description: "Practice listening",
    keywords: "Sanctus Magnificat",
    content: "Napupuno ang langit at lupa.",
  })),
  {
    url: "/prayers/rosary",
    title: "Holy Rosary",
    type: "prayers",
    description: "A prayer guide",
    keywords: "Mary",
    content: "Hail Mary, full of grace.",
  },
];
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
function fixture(query = "?q=holy", load = async () => documents) {
  const dom = new JSDOM(
    `<div data-site-search-page data-search-index="/search-data/index.json" data-search-base="">
    <form data-search-form><input name="q" data-search-input><button>Search</button></form>
    <nav data-search-filters>${["all", "songs", "prayers"].map((type) => `<button data-search-type="${type}">${type}<span data-search-count="${type}"></span></button>`).join("")}</nav>
    <p data-search-status></p><button data-search-clear hidden>Clear</button>
    <div data-search-empty><h2 data-search-empty-title>Begin</h2><p data-search-empty-text>Help</p><nav data-search-suggestions>Suggestions</nav></div>
    <div data-search-error hidden><button data-search-retry>Retry</button></div>
    <ol data-search-results></ol>
    <nav data-search-pagination hidden><a data-search-previous>Back</a><span data-search-page-label></span><a data-search-next>Next</a></nav>
  </div>`,
    { url: `https://holyrosarychapel.com/search${query}` },
  );
  const root = dom.window.document.querySelector("[data-site-search-page]");
  const cleanup = prepareSearchPage(root, load);
  const submit = (query) => {
    root.querySelector("input").value = query;
    root
      .querySelector("form")
      .dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true }),
      );
  };
  return {
    dom,
    root,
    submit,
    close: () => {
      cleanup();
      dom.window.close();
    },
  };
}

test("search page reads shareable queries, filters, paginates, and follows Back/Forward without refetching", async () => {
  let calls = 0;
  const f = fixture("?q=holy&type=songs", async () => {
    calls++;
    return documents;
  });
  try {
    await flush();
    assert.equal(
      f.root.querySelectorAll("[data-search-results] > li").length,
      12,
    );
    assert.match(
      f.root.querySelector("[data-search-status]").textContent,
      /25/,
    );
    f.root.querySelector("[data-search-next]").click();
    await flush();
    assert.equal(
      new URL(f.dom.window.location.href).searchParams.get("page"),
      "2",
    );
    assert.match(
      f.root.querySelector("[data-search-page-label]").textContent,
      /2.*3/,
    );
    f.root.querySelector('[data-search-type="prayers"]').click();
    await flush();
    assert.equal(
      f.root.querySelectorAll("[data-search-results] > li").length,
      1,
    );
    assert.match(
      f.root.querySelector("[data-search-results] a").href,
      /prayers\/rosary$/,
    );
    f.dom.window.history.replaceState(
      null,
      "",
      "?q=magnificat&type=songs&page=3",
    );
    f.dom.window.dispatchEvent(new f.dom.window.Event("popstate"));
    await flush();
    assert.equal(f.root.querySelector("input").value, "magnificat");
    assert.equal(
      f.root.querySelectorAll("[data-search-results] > li").length,
      1,
    );
    assert.equal(calls, 1);
  } finally {
    f.close();
  }
});

test("results and highlighting render as text, never as HTML from titles or queries", async () => {
  const unsafe = [
    { ...documents[0], title: 'Holy <img src=x onerror="alert(1)"> song' },
  ];
  const f = fixture("?q=holy", async () => unsafe);
  try {
    await flush();
    assert.equal(f.root.querySelectorAll("img,script").length, 0);
    assert.ok(f.root.querySelector("mark"));
    assert.ok(
      f.root
        .querySelector("[data-search-results]")
        .textContent.includes("<img"),
    );
    f.submit("[.*");
    await flush();
    assert.match(
      f.root.querySelector("[data-search-status]").textContent,
      /No results/,
    );
    f.root.querySelector("[data-search-clear]").click();
    await flush();
    assert.equal(f.root.querySelector("input").value, "");
    assert.equal(f.root.querySelector("[data-search-empty]").hidden, false);
  } finally {
    f.close();
  }
});

test("a failed index request offers retry, and the latest query wins if loading is slow", async () => {
  let calls = 0;
  const f = fixture("?q=holy", async () => {
    if (++calls === 1) throw new Error("offline");
    return documents;
  });
  try {
    await flush();
    assert.equal(f.root.querySelector("[data-search-error]").hidden, false);
    f.root.querySelector("[data-search-retry]").click();
    await flush();
    assert.equal(f.root.querySelector("[data-search-error]").hidden, true);
    assert.equal(calls, 2);
  } finally {
    f.close();
  }
  let resolve;
  const slow = fixture(
    "?q=magnificat",
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  try {
    await Promise.resolve();
    slow.submit("rosary");
    resolve(documents);
    await flush();
    assert.equal(
      slow.root.querySelectorAll("[data-search-results] > li").length,
      1,
    );
    assert.match(
      slow.root.querySelector("[data-search-results] a").textContent,
      /Rosary/,
    );
  } finally {
    slow.close();
  }
});

test("global search opens from the header or Ctrl/Cmd K, closes with Escape, and cleans up listeners", () => {
  const dom = new JSDOM(
    '<a href="/search" data-site-search-open>Search</a><site-search-dialog><dialog><input name="q"><form action="/search"></form><button data-site-search-close>Close</button></dialog></site-search-dialog>',
    { url: "https://holyrosarychapel.com/songs/santo" },
  );
  const root = dom.window.document.querySelector("site-search-dialog");
  const dialog = root.querySelector("dialog");
  dialog.showModal = () => {
    dialog.open = true;
  };
  dialog.close = () => {
    dialog.open = false;
  };
  const cleanup = prepareSearchDialog(root);
  try {
    dom.window.document.querySelector("a").click();
    assert.equal(dialog.open, true);
    assert.equal(
      dom.window.document.activeElement,
      root.querySelector("input"),
    );
    dom.window.document.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", { key: "Escape" }),
    );
    assert.equal(dialog.open, false);
    dom.window.document.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
    );
    assert.equal(dialog.open, true);
    dom.window.document.dispatchEvent(
      new dom.window.Event("astro:before-swap"),
    );
    assert.equal(dialog.open, false);
    cleanup();
    dom.window.document.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", { key: "k", metaKey: true }),
    );
    assert.equal(dialog.open, false);
  } finally {
    cleanup();
    dom.window.close();
  }
});
