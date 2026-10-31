import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";

const directory = "src/content/news";
const fixtures = [
  ["verify-news-old", "2020-01-01", false],
  ["verify-news-middle", "2020-02-01", false],
  ["verify-news-new", "2020-03-01", false],
  ["verify-news-draft", "2020-04-01", true],
  ["verify-news-future", "2099-01-01", false],
];
const mode = process.argv[2] ?? "--empty";
const read = (path) => readFileSync(`dist/${path}/index.html`, "utf8");

if (mode === "--fixtures") {
  mkdirSync(directory, { recursive: true });
  for (const [slug, date, draft] of fixtures) {
    const path = `${directory}/${slug}.md`;
    assert(!existsSync(path), `Refusing to overwrite ${path}`);
    writeFileSync(
      path,
      `---\ntitle: "${slug}"\ndescription: "Summary for ${slug}"\ndate: ${date}\ndraft: ${draft}\n${slug.endsWith("new") ? 'image: "/images/image-placeholder.png"\nauthor: "Chapel Office"\ncategories: ["Announcements"]\n' : ""}---\n\nArticle body for ${slug}.\n`,
    );
  }
  console.log("Created temporary News fixtures.");
} else if (mode === "--clean") {
  for (const [slug] of fixtures)
    rmSync(`${directory}/${slug}.md`, { force: true });
  console.log("Removed temporary News fixtures.");
} else if (mode === "--published") {
  const listing = read("news");
  const second = read("news/page/2");
  assert(
    listing.includes("verify-news-new") &&
      listing.includes("verify-news-middle"),
  );
  assert(
    listing.indexOf('href="/news/verify-news-new"') <
      listing.indexOf('href="/news/verify-news-middle"'),
  );
  assert(!listing.includes("verify-news-old"));
  assert(listing.includes("Summary for verify-news-new"));
  assert(listing.includes('href="/news/page/2"'));
  assert(second.includes("verify-news-old") && second.includes('href="/news"'));
  const article = read("news/verify-news-new");
  for (const content of [
    "Article body for verify-news-new.",
    "Chapel Office",
    "Announcements",
    'datetime="2020-03-01',
    'href="/news"',
    "lg:col-8",
  ])
    assert(article.includes(content), content);
  assert(article.includes("image-placeholder"));
  assert(
    read("news/verify-news-old").includes(
      "By Our Lady of the Most Holy Rosary Chapel",
    ),
  );
  for (const slug of [
    "verify-news-draft",
    "verify-news-future",
    "welcome-to-rosarium",
  ]) {
    assert(!listing.includes(slug));
    assert(
      !existsSync(`dist/news/${slug}/index.html`),
      `${slug} must not be published`,
    );
  }
  assert(!listing.includes("How to build an Application"));
  console.log(
    "PASS: ordering, summaries, dates, author defaults, images, categories, articles, pagination, drafts and future filtering.",
  );
} else {
  const listing = read("news");
  assert(
    listing.includes("No announcements yet"),
    "News must have an empty state",
  );
  assert(!listing.includes("How to build an Application"));
  assert(!existsSync("dist/news/welcome-to-rosarium/index.html"));
  console.log(
    "PASS: News empty state; sample and draft articles are not published.",
  );
}
