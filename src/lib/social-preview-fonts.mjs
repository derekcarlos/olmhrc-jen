import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { resolve, join } from "node:path";

// Keep Fontconfig independent of machine-installed fonts and writable home caches.
const workspace = resolve(".astro/social-fonts");
const directory = resolve("assets/social-fonts");
const cache = join(workspace, "cache");
const escape = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
mkdirSync(cache, { recursive: true });
const config = join(workspace, "fonts.conf");
const contents = `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd"><fontconfig><dir>${escape(directory)}</dir><cachedir>${escape(cache)}</cachedir><alias><family>sans-serif</family><prefer><family>Figtree</family></prefer></alias><alias><family>serif</family><prefer><family>Gentium Book Plus</family></prefer></alias></fontconfig>`;
if (!existsSync(config) || readFileSync(config, "utf8") !== contents) {
  const temporary = `${config}.${process.pid}.tmp`;
  writeFileSync(temporary, contents);
  renameSync(temporary, config);
}
process.env.FONTCONFIG_FILE = config;
// macOS otherwise selects CoreText, which ignores Fontconfig's application fonts.
// The Sharp builds used here include the Fontconfig backend on macOS and Linux.
process.env.PANGOCAIRO_BACKEND = "fc";
