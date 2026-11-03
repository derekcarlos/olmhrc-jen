import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { JSDOM } from "jsdom";
import sharp from "sharp";
import matter from "gray-matter";

const config = JSON.parse(readFileSync("src/config/config.json", "utf8"));
const selections = JSON.parse(
  readFileSync("src/config/song-selections.json", "utf8"),
).filter((selection) => selection.status === "published");
const page = (path) =>
  new JSDOM(readFileSync(`dist/${path ? `${path}/` : ""}index.html`, "utf8"))
    .window.document;
const meta = (document, name) =>
  document.querySelector(`meta[property="${name}"],meta[name="${name}"]`)
    ?.content;
const expected = [
  "rosarium.png",
  "songs.png",
  ...selections.map((selection) => `lineup-${selection.id}.png`),
];
assert.deepEqual(
  readdirSync("dist/share").sort(),
  expected.sort(),
  "only site, Songs and published lineup images are generated",
);

async function check(document, path) {
  const url = new URL(meta(document, "og:image"));
  assert.equal(url.origin, new URL(config.site.base_url).origin);
  assert.equal(url.pathname, path);
  assert.equal(meta(document, "twitter:image"), url.href);
  assert.equal(meta(document, "og:image:secure_url"), url.href);
  assert.equal(meta(document, "og:image:type"), "image/png");
  assert.equal(meta(document, "og:image:width"), "1200");
  assert.equal(meta(document, "og:image:height"), "630");
  assert.ok(meta(document, "og:image:alt"));
  assert.equal(
    meta(document, "twitter:image:alt"),
    meta(document, "og:image:alt"),
  );
  assert.equal(meta(document, "twitter:card"), "summary_large_image");
  const file = `dist${url.pathname}`;
  assert.ok(existsSync(file));
  const image = await sharp(readFileSync(file)).metadata();
  assert.equal(image.format, "png");
  assert.equal(image.width, 1200);
  assert.equal(image.height, 630);
  assert.equal(
    new URL(meta(document, "og:url")).origin,
    new URL(config.site.base_url).origin,
  );
}
await check(page(""), "/share/rosarium.png");
await check(page("songs"), "/share/songs.png");
await check(page("mass"), "/share/rosarium.png");
await check(page("calendar"), "/share/rosarium.png");
for (const selection of selections) {
  const document = page(`songs/selections/${selection.id}`);
  await check(document, `/share/lineup-${selection.id}.png`);
  const alt = meta(document, "og:image:alt");
  assert.ok(alt.includes(selection.title));
  assert.ok(alt.includes(selection.date.slice(0, 4)));
  assert.ok(
    alt.includes(
      selection.readiness === "confirmed"
        ? "Confirmed lineup"
        : "Preliminary lineup",
    ),
  );
}
const about = matter(readFileSync("src/content/about/-index.md", "utf8")).data;
if (about.image && !about.image.endsWith(".svg")) {
  const document = page("about");
  assert.equal(
    meta(document, "og:image"),
    new URL(about.image, config.site.base_url).href,
    "custom page photo must remain intact",
  );
  assert.equal(
    meta(document, "og:image:width"),
    undefined,
    "unknown custom photo dimensions must not be invented",
  );
}
console.log(
  `PASS: ${expected.length} generated PNGs, correct absolute sharing metadata, published lineup dates/readiness, and preserved About photo.`,
);

if (process.argv.includes("--live")) {
  const origin = process.env.ROSARIUM_PREVIEW_URL || "http://localhost:4321";
  for (const filename of expected) {
    const response = await fetch(`${origin}/share/${filename}`);
    assert.equal(response.status, 200, filename);
    assert.ok(response.headers.get("content-type").startsWith("image/png"));
    const image = await sharp(
      Buffer.from(await response.arrayBuffer()),
    ).metadata();
    assert.equal(image.width, 1200);
    assert.equal(image.height, 630);
  }
  assert.equal(
    (await fetch(`${origin}/share/lineup-not-a-published-selection.png`))
      .status,
    404,
  );
  const response = await fetch(`${origin}/songs`);
  assert.equal(response.status, 200);
  const document = new JSDOM(await response.text()).window.document;
  assert.equal(
    new URL(meta(document, "og:image")).pathname,
    "/share/songs.png",
  );
  console.log(
    "PASS: Actual local image endpoints return PNGs, unknown lineups return 404, and fresh Songs metadata advertises its generated image.",
  );
}
