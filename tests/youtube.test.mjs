import test from "node:test";
import assert from "node:assert/strict";
import { youtubeVideoId } from "../src/lib/youtube.mjs";

test("accepts YouTube watch, share, mobile, Shorts and embed links", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=M7lc1UVf-VE&list=example",
    "https://youtu.be/M7lc1UVf-VE?si=example",
    "https://m.youtube.com/watch?v=M7lc1UVf-VE",
    "https://www.youtube.com/shorts/M7lc1UVf-VE",
    "https://www.youtube.com/live/M7lc1UVf-VE",
    "https://www.youtube.com/embed/M7lc1UVf-VE",
    "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE",
    "  https://youtu.be/M7lc1UVf-VE  ",
  ])
    assert.equal(youtubeVideoId(url), "M7lc1UVf-VE", url);
});

test("rejects malformed links, unrelated hosts and URLs without a video", () => {
  for (const url of [
    "",
    "not a URL",
    "javascript:alert(1)",
    "https://youtube.com.evil.example/watch?v=M7lc1UVf-VE",
    "https://example.com/watch?v=M7lc1UVf-VE",
    "https://youtube.com/playlist?list=example",
    "https://youtube.com/watch?v=short",
    "https://youtu.be/M7lc1UVf-VE/extra",
    "https://youtube.com/embed/M7lc1UVf-VE/extra",
  ])
    assert.equal(youtubeVideoId(url), null, url);
});
