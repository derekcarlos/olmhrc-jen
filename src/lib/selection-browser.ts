import { groupSelections } from "./selection-dates.mjs";
import { prepareSongsHub } from "./songs-hub-client.ts";

type SelectionSummary = { id: string; date: string; status: string };

export async function prepareSelectionBrowser(
  scope: ParentNode = document,
  now = () => new Date(),
  fetcher: typeof fetch = fetch,
) {
  await Promise.all(
    [...scope.querySelectorAll<HTMLElement>("[data-selection-browser]")].map(
      async (root) => {
        if (root.dataset.selectionReady) return;
        let selections: SelectionSummary[];
        try {
          selections = JSON.parse(root.dataset.selections || "[]");
          if (!Array.isArray(selections)) return;
        } catch {
          return;
        }
        root.dataset.selectionReady = "true";
        const document = root.ownerDocument;
        const host = root.querySelector<HTMLElement>(
          "[data-featured-rehearsal]",
        );
        const error = root.querySelector<HTMLElement>("[data-lineup-error]");
        const base = (root.dataset.base || "").replace(/\/+$/, "");
        let stopped = false,
          busy = false,
          queued = false;
        let controller: AbortController | undefined;
        function stopMedia() {
          host?.querySelectorAll<HTMLAudioElement>("audio").forEach((audio) => {
            if (!audio.paused) audio.pause();
          });
          host?.querySelectorAll("iframe").forEach((frame) => frame.remove());
        }
        async function refresh() {
          if (stopped) return;
          const grouped = groupSelections(selections, now());
          const shortcut = root.querySelector<HTMLElement>(
            "[data-lineup-shortcut-count]",
          );
          if (shortcut)
            shortcut.textContent = `${grouped.future.length} ${grouped.future.length === 1 ? "lineup" : "lineups"}`;
          root
            .querySelectorAll<HTMLElement>("[data-lineup-collection]")
            .forEach((collection) => {
              const entries =
                collection.dataset.mode === "past"
                  ? grouped.past
                  : grouped.future;
              const visible = new Set(entries.map((entry) => entry.id));
              collection
                .querySelectorAll<HTMLElement>("[data-selection-card]")
                .forEach(
                  (card) =>
                    (card.hidden = !visible.has(card.dataset.selectionId!)),
                );
              const count = collection.querySelector<HTMLElement>(
                "[data-lineup-count]",
              );
              if (count)
                count.textContent = `${visible.size} ${visible.size === 1 ? "lineup" : "lineups"}`;
              const empty = collection.querySelector<HTMLElement>(
                "[data-lineup-empty]",
              );
              if (empty) empty.hidden = visible.size > 0;
            });
          if (!host) return;
          const wanted = grouped.featured?.id || "";
          if (host.dataset.featuredId === wanted) {
            return;
          }
          if (busy) {
            queued = true;
            return;
          }
          busy = true;
          try {
            let rehearsal: Element | null;
            if (wanted) {
              controller = new AbortController();
              const response = await fetcher(
                `${base}/songs/selections/${encodeURIComponent(wanted)}`,
                { signal: controller.signal },
              );
              if (!response.ok) throw new Error("Lineup request failed");
              const html = await response.text();
              const parsed =
                new document.defaultView!.DOMParser().parseFromString(
                  html,
                  "text/html",
                );
              rehearsal = parsed.querySelector("[data-selection-rehearsal]");
              if (rehearsal?.getAttribute("data-selection-id") !== wanted)
                throw new Error("Unexpected lineup response");
            } else {
              rehearsal =
                root
                  .querySelector<HTMLTemplateElement>("[data-empty-lineup]")
                  ?.content.querySelector("[data-selection-rehearsal]") || null;
            }
            if (stopped) return;
            const latest = groupSelections(selections, now());
            if (
              (latest.featured?.id || "") !== wanted ||
              latest.sunday !== grouped.sunday
            ) {
              queued = true;
              return;
            }
            if (!rehearsal) throw new Error("Missing rehearsal content");
            stopMedia();
            host.replaceChildren(document.importNode(rehearsal, true));
            host.dataset.featuredId = wanted;
            if (error) {
              error.hidden = true;
              error.replaceChildren();
            }
            prepareSongsHub(host);
          } catch {
            if (stopped) return;
            if (error) {
              error.hidden = false;
              const link = document.createElement("a");
              link.href = wanted
                ? `${base}/songs/selections/${encodeURIComponent(wanted)}`
                : `${base}/songs`;
              link.textContent = "Open this Sunday’s lineup directly.";
              error.replaceChildren(
                document.createTextNode(
                  "We couldn’t refresh the lineup. The previously loaded selection is still shown. ",
                ),
                link,
              );
            }
          } finally {
            busy = false;
            if (queued && !stopped) {
              queued = false;
              void refresh();
            }
          }
        }
        const visible = () => {
          if (!document.hidden) void refresh();
        };
        const timer = window.setInterval(() => void refresh(), 60_000);
        document.addEventListener("visibilitychange", visible);
        document.addEventListener(
          "astro:before-swap",
          () => {
            stopped = true;
            controller?.abort();
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", visible);
            stopMedia();
          },
          { once: true },
        );
        await refresh();
      },
    ),
  );
}
