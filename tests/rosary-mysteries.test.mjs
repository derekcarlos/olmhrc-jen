import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateRosaryMysteries } from "../src/lib/rosary-mysteries.mjs";
const sets = () =>
  JSON.parse(readFileSync("src/data/rosary.json", "utf8")).mysteries;

test("every mystery is editable independently and artwork/meditation may be empty", () => {
  const data = sets();
  data.forEach((set) =>
    set.items.forEach((item) => {
      item.meditation = "";
      item.fruit = "";
    }),
  );
  assert.equal(validateRosaryMysteries(data), true);
  assert.equal(
    new Set(data.flatMap((set) => set.items.map((item) => item.id))).size,
    20,
  );
});

test("meditation-only, art-only and partially prepared credits are supported", () => {
  const data = sets();
  data[0].items[0].meditation = "First paragraph.\n\nA reflection question.";
  data[0].items[1].art = {
    image: "/images/rosary/visitation.webp",
    alt: "Mary visiting Elizabeth.",
    source_url: "https://commons.wikimedia.org/wiki/File:Example.jpg",
    license: "Public domain",
  };
  data[0].items[2].art = { artist: "Name being prepared", image: "" };
  data[0].items[2].meditation = "";
  data[0].items[2].fruit = "Humility";
  assert.equal(validateRosaryMysteries(data), true);
});

test("spiritual fruits must be text when provided", () => {
  const data = sets();
  data[0].items[0].fruit = { text: "Humility" };
  assert.throws(() => validateRosaryMysteries(data), /fruit.*text/i);
});

test("published art requires an accessible image and safe source/credit fields", () => {
  const data = sets();
  const item = data[0].items[0];
  item.art = {
    image: "/images/rosary/example.webp",
    alt: "",
    source_url: "",
    license: "",
  };
  assert.throws(() => validateRosaryMysteries(data), /alt|description/i);
  item.art.alt = "The Annunciation.";
  assert.throws(() => validateRosaryMysteries(data), /source/i);
  item.art.source_url = "https://commons.wikimedia.org/wiki/File:Example.jpg";
  assert.throws(() => validateRosaryMysteries(data), /license/i);
  item.art.license = "Public domain";
  item.art.image = "/images/rosary/../../private.png";
  assert.throws(() => validateRosaryMysteries(data), /image/i);
  item.art.image = "/images/rosary/example.webp";
  item.art.license_url = "javascript:alert(1)";
  assert.throws(() => validateRosaryMysteries(data), /https/i);
});
