export function lyricSize(value) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;
  if (!Number.isFinite(parsed)) return 24;
  return Math.min(36, Math.max(20, Math.round(parsed / 2) * 2));
}

export function choirPracticePath(songId = "", base = "") {
  return `${base.replace(/\/+$/, "")}/songs/practice${songId ? `/${encodeURIComponent(songId)}` : ""}`;
}
