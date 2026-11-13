import { readPracticeMarks, practiceProgress } from "./songs-hub.mjs";
import { choirPracticePath } from "./song-practice.mjs";

export function prepareChoirPractice(scope: ParentNode = document) {
  scope.querySelectorAll<HTMLElement>("[data-choir-practice]").forEach(root => {
    if (root.dataset.choirReady) return;
    let ids: string[];
    try { ids = JSON.parse(root.dataset.practiceSongs || "[]"); }
    catch { return; }
    if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== "string")) return;
    root.dataset.choirReady = "true";
    const tracks = ids.map(id => ({ key: id, id }));
    const win = root.ownerDocument.defaultView!;
    const key = "rosarium-choir-practice";
    let raw: string | null = null;
    let storageWorks = true;
    try { raw = win.localStorage.getItem(key); } catch { storageWorks = false; }
    let marks = readPracticeMarks(raw, tracks);
    const controller = new win.AbortController();
    const { signal } = controller;
    const setText = (selector: string, text: string) => {
      root.querySelectorAll<HTMLElement>(selector).forEach(node => node.textContent = text);
    };
    function draw() {
      const progress = practiceProgress(tracks, marks);
      setText("[data-choir-count]", `${progress.completed} of ${progress.total} practised`);
      setText("[data-choir-storage]", storageWorks ? "Your progress is saved only on this device." : "Progress is temporary on this page.");
      root.querySelectorAll<HTMLProgressElement>("[data-choir-meter]").forEach(meter => {
        meter.max = progress.total;
        meter.value = progress.completed;
      });
      root.querySelectorAll<HTMLInputElement>("[data-choir-mark]").forEach(input => input.checked = marks.has(input.value));
      const resume = root.querySelector<HTMLAnchorElement>("[data-choir-resume]");
      if (resume && progress.next) resume.href = choirPracticePath(progress.next.id, root.dataset.base);
      setText("[data-choir-resume-label]", progress.completed === progress.total ? "Practise again" : progress.completed ? "Continue practising" : "Start practising");
    }
    root.querySelectorAll<HTMLInputElement>("[data-choir-mark]").forEach(input => {
      input.disabled = false;
      input.addEventListener("change", () => {
        if (input.checked) marks.add(input.value); else marks.delete(input.value);
        try { win.localStorage.setItem(key, JSON.stringify([...marks])); }
        catch { storageWorks = false; }
        draw();
      }, { signal });
    });
    root.querySelectorAll<HTMLElement>("[data-choir-progress], [data-choir-mark-wrap]").forEach(node => node.hidden = false);
    win.addEventListener("storage", event => {
      if (event.key !== key && event.key !== null) return;
      marks = readPracticeMarks(event.newValue, tracks);
      draw();
    }, { signal });
    root.ownerDocument.addEventListener("astro:before-swap", () => controller.abort(), { once: true });
    draw();
  });
}
