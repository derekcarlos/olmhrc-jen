import test from "node:test";
import assert from "node:assert/strict";
import { lyricSize } from "../src/lib/song-practice.mjs";

test("lyrics start at 24px and reject invalid saved preferences", () => {
  for (const value of [null, undefined, "", "broken", Infinity])
    assert.equal(lyricSize(value), 24);
  assert.equal(lyricSize("30"), 30);
});
test("lyric size stays within readable limits and uses two-pixel steps", () => {
  assert.equal(lyricSize(10), 20);
  assert.equal(lyricSize(99), 36);
  assert.equal(lyricSize(27), 28);
});
