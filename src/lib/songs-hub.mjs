export function readPracticeMarks(raw, tracks) {
  try {
    const saved = JSON.parse(raw || "[]");
    if (!Array.isArray(saved)) return new Set();
    return new Set(
      tracks.map((track) => track.key).filter((key) => saved.includes(key)),
    );
  } catch {
    return new Set();
  }
}
export function practiceProgress(tracks, marks) {
  return {
    completed: tracks.filter((track) => marks.has(track.key)).length,
    total: tracks.length,
    next: tracks.find((track) => !marks.has(track.key)) || tracks[0] || null,
  };
}
export function practiceSource(track, preferred = "audio") {
  if (preferred === "video" && track.videoId) return "video";
  if (track.audio) return "audio";
  return track.videoId ? "video" : null;
}
