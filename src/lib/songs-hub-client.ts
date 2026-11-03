import {
  readPracticeMarks,
  practiceProgress,
  practiceSource,
} from "./songs-hub.mjs";
import { selectionSongPath } from "./selection-dates.mjs";

interface HubTrack {
  key: string;
  id: string;
  anchor: string;
  title: string;
  part: string;
  composer: string;
  audio: string;
  audioCredit: string;
  videoId: string | null;
}

export function prepareSongsHub(scope: ParentNode = document) {
  scope.querySelectorAll<HTMLElement>("[data-songs-hub]").forEach((root) => {
    if (root.dataset.hubReady) return;
    let tracks: HubTrack[];
    try {
      tracks = JSON.parse(root.dataset.tracks || "[]");
    } catch {
      return;
    }
    if (!tracks.length) return;
    const media = root.querySelector<HTMLElement>("[data-hub-media]");
    const title = root.querySelector<HTMLElement>("[data-hub-title]");
    const open = root.querySelector<HTMLAnchorElement>("[data-hub-open]");
    if (!media || !title || !open) return;
    root.dataset.hubReady = "true";
    const base = root.dataset.base || "";
    const storageKey = root.dataset.progressKey!;
    let stored: string | null = null;
    let storageWorks = true;
    try {
      stored = window.localStorage.getItem(storageKey);
    } catch {
      storageWorks = false;
    }
    const marks = readPracticeMarks(stored, tracks);
    let active =
      tracks.find((track) => track.key === root.dataset.initialKey) ||
      tracks[0];
    let source = practiceSource(active);
    const path = (track: HubTrack) =>
      selectionSongPath(root.dataset.selectionId, track.id, base);
    function setText(selector: string, text: string) {
      const node = root.querySelector<HTMLElement>(selector);
      if (node) node.textContent = text;
    }

    function drawMedia() {
      const audio = media!.querySelector("audio");
      if (audio && !audio.paused) audio.pause();
      media!.replaceChildren();
      media!.dataset.mode = source || "none";
      if (source === "video" && active.videoId) {
        const iframe = root.ownerDocument.createElement("iframe");
        iframe.src = `https://www.youtube-nocookie.com/embed/${active.videoId}`;
        iframe.title = `Practice video: ${active.title}`;
        iframe.width = "560";
        iframe.height = "315";
        iframe.loading = "lazy";
        iframe.allow = "encrypted-media; picture-in-picture; fullscreen";
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        media!.append(iframe);
      } else if (source === "audio") {
        const label = root.ownerDocument.createElement("p");
        label.textContent = "Practice recording";
        const player = root.ownerDocument.createElement("audio");
        player.controls = true;
        player.preload = "none";
        player.src = active.audio;
        player.setAttribute(
          "aria-label",
          `Practice recording: ${active.title}`,
        );
        media!.append(label, player);
      } else {
        const empty = root.ownerDocument.createElement("p");
        empty.textContent =
          "A recording hasn’t been added yet. You can still open the lyrics and practise.";
        media!.append(empty);
      }
    }
    function updateSource() {
      const credit = root.querySelector<HTMLElement>("[data-hub-credit]");
      if (credit) {
        credit.hidden = source !== "audio" || !active.audioCredit;
        credit.textContent = source === "audio" ? active.audioCredit : "";
      }
      const controls = root.querySelector<HTMLElement>(
        "[data-hub-source-controls]",
      );
      if (controls) controls.hidden = !(active.audio && active.videoId);
      root
        .querySelectorAll<HTMLButtonElement>("[data-hub-source]")
        .forEach((button) =>
          button.setAttribute(
            "aria-pressed",
            String(button.dataset.hubSource === source),
          ),
        );
      const external = root.querySelector<HTMLAnchorElement>(
        "[data-hub-external]",
      );
      if (external) {
        external.hidden = !source;
        external.href =
          source === "video"
            ? `https://www.youtube.com/watch?v=${active.videoId}`
            : active.audio || "#";
        external.textContent =
          source === "video" ? "Open on YouTube ↗" : "Open audio file ↗";
      }
    }
    function selectTrack(track: HubTrack, scroll = false) {
      const changed = track.key !== active.key;
      active = track;
      if (changed) source = practiceSource(active);
      setText("[data-hub-title]", active.title);
      setText("[data-hub-part]", active.part);
      setText(
        "[data-hub-composer]",
        active.composer || "Setting to be confirmed",
      );
      open!.href = path(active);
      const back = root.querySelector<HTMLAnchorElement>("[data-hub-back]");
      if (back) back.href = `#${active.anchor}`;
      root
        .querySelectorAll<HTMLElement>("[data-hub-track]")
        .forEach((row) =>
          row.classList.toggle("is-selected", row.dataset.key === active.key),
        );
      root
        .querySelectorAll<HTMLButtonElement>("[data-hub-preview]")
        .forEach((button) =>
          button.setAttribute(
            "aria-pressed",
            String(button.dataset.key === active.key),
          ),
        );
      if (changed || !media!.firstElementChild) drawMedia();
      updateSource();
      setText(
        "[data-hub-status]",
        `${active.title} selected. ${source ? "Press play when you’re ready." : "Open the lyrics to practise."}`,
      );
      if (scroll && window.innerWidth < 1024) {
        title!.tabIndex = -1;
        title!.focus({ preventScroll: true });
        const player = root.querySelector<HTMLElement>("[data-hub-player]");
        const reduce =
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        player?.scrollIntoView?.({
          block: "start",
          behavior: reduce ? "auto" : "smooth",
        });
      }
    }
    function updateProgress() {
      const state = practiceProgress(tracks, marks);
      setText(
        "[data-hub-count]",
        `${state.completed} of ${state.total} practised`,
      );
      const progress = root.querySelector<HTMLProgressElement>(
        "[data-hub-progress]",
      );
      if (progress) {
        progress.max = state.total;
        progress.value = state.completed;
      }
      const resume = root.querySelector<HTMLAnchorElement>("[data-hub-resume]");
      if (resume && state.next) resume.href = path(state.next);
      setText(
        "[data-hub-resume-label]",
        state.completed === state.total
          ? "Practise again"
          : state.completed
            ? "Continue practising"
            : "Start practising",
      );
      setText(
        "[data-hub-storage]",
        storageWorks
          ? "Saved only on this device."
          : "Progress is temporary on this page.",
      );
    }
    root
      .querySelectorAll<HTMLButtonElement>("[data-hub-preview]")
      .forEach((button) => {
        button.hidden = false;
        button.addEventListener("click", () => {
          const track = tracks.find((t) => t.key === button.dataset.key);
          if (track) selectTrack(track, true);
        });
      });
    root
      .querySelectorAll<HTMLElement>("[data-hub-mark-wrap]")
      .forEach((label) => (label.hidden = false));
    root
      .querySelectorAll<HTMLInputElement>("[data-hub-mark]")
      .forEach((input) => {
        input.disabled = false;
        input.checked = marks.has(input.value);
        input.addEventListener("change", () => {
          if (input.checked) marks.add(input.value);
          else marks.delete(input.value);
          try {
            window.localStorage.setItem(storageKey, JSON.stringify([...marks]));
          } catch {
            storageWorks = false;
          }
          updateProgress();
        });
      });
    root
      .querySelectorAll<HTMLButtonElement>("[data-hub-source]")
      .forEach((button) =>
        button.addEventListener("click", () => {
          source = practiceSource(active, button.dataset.hubSource);
          drawMedia();
          updateSource();
        }),
      );
    media.addEventListener(
      "error",
      (event) => {
        if ((event.target as HTMLElement)?.tagName === "AUDIO")
          setText(
            "[data-hub-status]",
            "The recording could not load. Try the Open audio file link.",
          );
      },
      true,
    );
    root
      .querySelectorAll<HTMLElement>("[data-hub-enhanced]")
      .forEach((node) => (node.hidden = false));
    const progressArea = root.querySelector<HTMLElement>(
      "[data-hub-progress-area]",
    );
    if (progressArea) progressArea.hidden = false;
    updateProgress();
    selectTrack(practiceProgress(tracks, marks).next || active);
  });
}
