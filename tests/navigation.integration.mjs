import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { JSDOM } from "jsdom";
import { navigationCurrent } from "../src/lib/navigation.mjs";
const menu = JSON.parse(readFileSync("src/config/menu.json", "utf8"));
const expected = menu.main.flatMap((link) =>
  link.hasChildren ? link.children : [link],
);
for (const pathname of [
  "/",
  "/about",
  "/mass",
  "/calendar",
  "/prayers",
  "/prayers/ang-banal-na-rosaryo",
  "/songs/ama-namin-missa-magnificat",
  "/news",
]) {
  const html = process.argv.includes("--live")
    ? await (await fetch(`http://localhost:4321${pathname}`)).text()
    : readFileSync(
        `dist${pathname === "/" ? "" : pathname}/index.html`,
        "utf8",
      );
  const doc = new JSDOM(html, { url: `http://localhost:4321${pathname}` })
    .window.document;
  const header = doc.querySelector("header.header");
  const footer = doc.querySelector("footer.chapel-footer");
  assert(header && footer, pathname);
  assert.equal(
    header.querySelector("nav").getAttribute("aria-label"),
    "Main navigation",
  );
  const footerLinks = [...footer.querySelectorAll(".footer-sitemap nav a")];
  assert.deepEqual(
    footerLinks.map((link) => link.pathname).sort(),
    expected.map((link) => link.url).sort(),
  );
  for (const link of [
    ...header.querySelectorAll("a.nav-link, a.nav-dropdown-link"),
    ...footerLinks,
  ]) {
    assert.equal(
      link.getAttribute("aria-current") || undefined,
      navigationCurrent(pathname, link.pathname),
    );
    assert(
      existsSync(
        `dist${link.pathname === "/" ? "" : link.pathname}/index.html`,
      ),
      link.href,
    );
  }
  if (pathname.startsWith("/prayers") || pathname.startsWith("/songs"))
    assert(header.querySelector(".nav-dropdown > label.active"));
  for (const toggle of header.querySelectorAll(
    'input[type="checkbox"][aria-controls]',
  )) {
    assert.equal(
      toggle.classList.contains("hidden"),
      false,
      "navigation toggles must be keyboard focusable",
    );
    assert(toggle.getAttribute("aria-label"));
    assert(doc.getElementById(toggle.getAttribute("aria-controls")));
    assert(header.querySelector(`label[for="${toggle.id}"]`));
    toggle.click();
    assert.equal(toggle.checked, true);
    toggle.click();
    assert.equal(toggle.checked, false);
  }
  assert.equal(footer.querySelector(".back-to-top").hash, "#top");
  assert.equal(doc.getElementById("top").tagName, "BODY");
  assert.equal(footer.querySelectorAll(".footer-next-steps a").length, 2);
  assert(
    [...footer.querySelectorAll(".footer-identity img")].every((img) =>
      img.getAttribute("src").includes("rosarium-dark"),
    ),
  );
}
console.log(
  "PASS: all existing navigation destinations, nested active states, accessible toggles, footer invitations and back-to-top anchors across eight pages.",
);
