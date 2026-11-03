import "./social-preview-fonts.mjs";
import sharp from "sharp";
import { resolve } from "node:path";
import { SOCIAL_IMAGE_WIDTH, SOCIAL_IMAGE_HEIGHT } from "./social-preview.mjs";

const fonts = {
  serif: {
    family: "Gentium Book Plus",
    path: resolve("assets/social-fonts/GentiumBookPlus-Regular.ttf"),
  },
  sans: { family: "Figtree", path: resolve("assets/social-fonts/Figtree.ttf") },
};
const escape = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

async function text(
  value,
  { size = 24, color = "#fff7e8", maxWidth = 1040, serif = false } = {},
) {
  const font = serif ? fonts.serif : fonts.sans;
  return sharp({
    text: {
      text: `<span foreground="${color}"${serif ? ` line_height="${Math.round(size * 1.1 * 1024)}"` : ""}>${escape(value)}</span>`,
      font: `${font.family} ${size}`,
      fontfile: font.path,
      width: maxWidth,
      dpi: 72,
      rgba: true,
      wrap: "word-char",
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
}

async function title(value, initialSize) {
  let label = String(value).trim();
  for (let size = initialSize; size >= 40; size -= 4) {
    const image = await text(label, { size, serif: true });
    if (image.info.height <= 230) return image;
  }
  // Keep unusually long author-supplied titles readable; the page metadata retains the full title.
  while (label.length > 24) {
    label = label.slice(0, Math.floor(label.length * 0.8)).trimEnd() + "…";
    const image = await text(label, { size: 40, serif: true });
    if (image.info.height <= 230) return image;
  }
  return text(label, { size: 40, serif: true });
}

/** Render fixed sharing artwork from public metadata; no browser, external API, or runtime font download.
 * @param {{key:string,brand:string,title:string,subtitle:string,badge:string}} card
 */
export async function renderSocialPreview(card) {
  const confirmed =
    card.key.startsWith("lineup-") && card.badge === "Confirmed lineup";
  const [brand, heading, subtitle, badge, domain, signature] =
    await Promise.all([
      text(card.brand.toUpperCase(), { size: 25, color: "#e8d4ae" }),
      title(card.title, card.key === "songs" ? 112 : 84),
      text(card.subtitle, { size: 30, color: "#e8d4ae" }),
      text(card.badge, {
        size: 21,
        color: confirmed ? "#263c50" : "#e8d4ae",
        maxWidth: 1000,
      }),
      text("holyrosarychapel.com", { size: 20, color: "#d0d9de" }),
      text("Rosarium", {
        size: 28,
        color: "#e8d4ae",
        serif: true,
        maxWidth: 250,
      }),
    ]);
  const badgeWidth = badge.info.width + 32;
  const badgeHeight = badge.info.height + 20;
  const background = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><pattern id="lines" width="42" height="42" patternUnits="userSpaceOnUse" patternTransform="rotate(20)"><path d="M0 0V42" stroke="#e8d4ae" stroke-opacity=".07" stroke-width="1"/></pattern></defs>
    <rect width="1200" height="630" fill="#263c50"/><rect width="1200" height="630" fill="url(#lines)"/>
    <path d="M80 120H1120M80 548H1120" stroke="#e8d4ae" stroke-opacity=".3"/>
    <rect x="80" y="465" width="${badgeWidth}" height="${badgeHeight}" rx="5" fill="#e8d4ae" fill-opacity="${confirmed ? "1" : ".07"}" stroke="#e8d4ae" stroke-opacity=".5"/>
    <circle cx="1094" cy="84" r="24" fill="none" stroke="#e8d4ae" stroke-opacity=".6"/>
    <path d="M1094 71V97M1081 84H1107" stroke="#e8d4ae" stroke-width="1.5"/>
  </svg>`;
  return sharp(Buffer.from(background))
    .composite([
      { input: brand.data, left: 80, top: 72 },
      { input: heading.data, left: 80, top: 155 },
      { input: subtitle.data, left: 80, top: 410 },
      { input: badge.data, left: 96, top: 475 },
      { input: domain.data, left: 80, top: 575 },
      {
        input: signature.data,
        left: SOCIAL_IMAGE_WIDTH - 80 - signature.info.width,
        top: 566,
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}
