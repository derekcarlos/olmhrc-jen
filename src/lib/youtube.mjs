/** Extract a video ID only from supported YouTube URLs.
 * @param {string} value
 * @returns {string | null}
 */
export function youtubeVideoId(value) {
  try {
    const url = new URL(value.trim());
    if (!["https:", "http:"].includes(url.protocol)) return null;
    let id = null;
    if (["youtu.be", "www.youtu.be"].includes(url.hostname)) {
      id = url.pathname.match(/^\/([^/]+)\/?$/)?.[1] ?? null;
    } else if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
      ].includes(url.hostname)
    ) {
      id =
        url.pathname === "/watch"
          ? url.searchParams.get("v")
          : (url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1] ??
            null);
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
