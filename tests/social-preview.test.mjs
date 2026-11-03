import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  defaultSocialCard,
  songsSocialCard,
  lineupSocialCard,
  socialImagePath,
  resolveSocialImage,
} from "../src/lib/social-preview.mjs";
import { renderSocialPreview } from "../src/lib/social-preview-render.mjs";

const selection = {
  id: "christ-the-king-2026",
  title: "Christ the King",
  date: "2026-11-22",
  status: "published",
  readiness: "preliminary",
};
test("share cards keep Songs undated and describe each published celebration accurately", () => {
  assert.equal(defaultSocialCard().key, "rosarium");
  const songs = songsSocialCard();
  assert.equal(songs.key, "songs");
  assert.equal(songs.brand, "Coro de Rosarium");
  assert.ok(!/2026|November/.test(songs.title + songs.subtitle));
  const card = lineupSocialCard(selection);
  assert.equal(card.key, "lineup-christ-the-king-2026");
  assert.equal(card.title, "Christ the King");
  assert.equal(card.subtitle, "November 22, 2026");
  assert.equal(card.badge, "Preliminary lineup · Choices may change");
  assert.equal(
    lineupSocialCard({ ...selection, readiness: "confirmed" }).badge,
    "Confirmed lineup",
  );
  assert.equal(lineupSocialCard({ ...selection, status: "draft" }), null);
  assert.equal(
    socialImagePath(card.key),
    "/share/lineup-christ-the-king-2026.png",
  );
  assert.throws(() => socialImagePath("../private"));
});
test("generated metadata is absolute and includes known PNG dimensions and alt text", () => {
  const image = resolveSocialImage({
    image: "/share/songs.png",
    alt: "Coro de Rosarium — Songs",
    baseUrl: "https://holyrosarychapel.com/",
  });
  assert.equal(image.url, "https://holyrosarychapel.com/share/songs.png");
  assert.equal(image.type, "image/png");
  assert.equal(image.width, 1200);
  assert.equal(image.height, 630);
  assert.equal(image.alt, "Coro de Rosarium — Songs");
});
test("existing photos retain their URL without fabricated dimensions; SVG and unsafe URLs fall back to PNG", () => {
  const photo = resolveSocialImage({
    image: "https://example.com/chapel.jpeg?size=large",
    baseUrl: "https://holyrosarychapel.com",
  });
  assert.equal(photo.url, "https://example.com/chapel.jpeg?size=large");
  assert.equal(photo.type, "image/jpeg");
  assert.equal(photo.width, undefined);
  for (const image of [
    undefined,
    "/images/rosarium-window.svg",
    "javascript:alert(1)",
    "data:image/svg+xml,<svg/>",
  ]) {
    const resolved = resolveSocialImage({
      image,
      baseUrl: "https://holyrosarychapel.com",
    });
    assert.equal(
      resolved.url,
      "https://holyrosarychapel.com/share/rosarium.png",
    );
    assert.equal(resolved.width, 1200);
  }
});
test("the renderer produces a real 1200×630 PNG with bundled fonts, including long escaped Unicode text", async () => {
  const site = await renderSocialPreview(defaultSocialCard());
  const info = await sharp(site).metadata();
  assert.equal(info.format, "png");
  assert.equal(info.width, 1200);
  assert.equal(info.height, 630);
  assert.ok(site.byteLength < 1_000_000);
  const long = lineupSocialCard({
    ...selection,
    title:
      "Solemnity of Our Lord Jesus Christ, King of the Universe — Biñan & <not-a-pango-tag>Community</not-a-pango-tag>",
  });
  const png = await renderSocialPreview(long);
  assert.equal((await sharp(png).metadata()).width, 1200);
  const confirmed = await renderSocialPreview(
    lineupSocialCard({ ...selection, readiness: "confirmed" }),
  );
  const preliminary = await renderSocialPreview(lineupSocialCard(selection));
  assert.notDeepEqual(
    confirmed,
    preliminary,
    "a changed readiness label must change the rendered preview",
  );
});
