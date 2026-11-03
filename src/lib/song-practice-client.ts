import { lyricSize } from "./song-practice.mjs";

function preparePracticeRail(rail: HTMLElement) {
  if (rail.dataset.railReady) return;
  rail.dataset.railReady = "true";
  function measure() {
    const top = Number.parseFloat(window.getComputedStyle(rail).top) || 120;
    const height = rail.getBoundingClientRect().height;
    const fits =
      window.innerWidth >= 1024 &&
      height > 0 &&
      height + top + 24 <= window.innerHeight;
    rail.dataset.stickyFit = String(fits);
  }
  measure();
  let observer: ResizeObserver | undefined;
  if (typeof window.ResizeObserver === "function") {
    observer = new window.ResizeObserver(measure);
    observer.observe(rail);
  }
  window.addEventListener("resize", measure);
  rail.addEventListener("toggle", measure, true);
  rail.addEventListener("load", measure, true);
  rail.ownerDocument.addEventListener(
    "astro:before-swap",
    () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      rail.removeEventListener("toggle", measure, true);
      rail.removeEventListener("load", measure, true);
    },
    { once: true },
  );
}

export function prepareSongPractice(scope: ParentNode = document) {
  scope
    .querySelectorAll<HTMLElement>("[data-song-rehearsal]")
    .forEach((root) => {
      const rail = root.querySelector<HTMLElement>(".practice-rail");
      if (rail) preparePracticeRail(rail);
      if (root.dataset.practiceReady) return;
      const lyrics = root.querySelector<HTMLElement>("[data-lyrics-copy]");
      const controls = root.querySelector<HTMLElement>("[data-lyric-controls]");
      const output =
        root.querySelector<HTMLOutputElement>("[data-lyrics-size]");
      const smaller = root.querySelector<HTMLButtonElement>(
        "[data-lyrics-smaller]",
      );
      const larger = root.querySelector<HTMLButtonElement>(
        "[data-lyrics-larger]",
      );
      if (!lyrics || !controls || !output || !smaller || !larger) return;
      root.dataset.practiceReady = "true";
      let size = 24;
      try {
        size = lyricSize(window.localStorage.getItem("rosarium-lyrics-size"));
      } catch {
        /* Private browsing can block storage. */
      }
      function update() {
        lyrics!.style.setProperty("--lyrics-size", `${size}px`);
        output!.textContent = `${size} px`;
        smaller!.disabled = size === 20;
        larger!.disabled = size === 36;
      }
      function resize(change: number) {
        size = lyricSize(size + change);
        update();
        try {
          window.localStorage.setItem("rosarium-lyrics-size", String(size));
        } catch {
          /* Resizing works without persistence. */
        }
      }
      smaller.addEventListener("click", () => resize(-2));
      larger.addEventListener("click", () => resize(2));
      update();
      controls.hidden = false;
    });
}
