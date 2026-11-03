import test from "node:test";
import assert from "node:assert/strict";
import {
  readPracticeMarks,
  practiceProgress,
  practiceSource,
} from "../src/lib/songs-hub.mjs";
const tracks = [
  { key: "processional:first", id: "first", audio: "", videoId: "kRzRejLZquY" },
  {
    key: "gloria:second",
    id: "second",
    audio: "/audio/example.mp3",
    videoId: null,
  },
];
test("saved practice marks accept only entries from this selection", () => {
  assert.deepEqual(
    [
      ...readPracticeMarks(
        '["processional:first","old-song","processional:first"]',
        tracks,
      ),
    ],
    ["processional:first"],
  );
  assert.equal(readPracticeMarks("broken", tracks).size, 0);
  assert.equal(readPracticeMarks('{"wrong":"shape"}', tracks).size, 0);
});
test("continue practice opens the first unfinished song, and complete selections can restart", () => {
  const progress = practiceProgress(tracks, new Set(["processional:first"]));
  assert.equal(progress.completed, 1);
  assert.equal(progress.total, 2);
  assert.equal(progress.next.id, "second");
  assert.equal(
    practiceProgress(tracks, new Set(tracks.map((t) => t.key))).next.id,
    "first",
  );
  assert.equal(practiceProgress([], new Set()).next, null);
});
test("media choices use only available sources and support lyrics-only songs", () => {
  assert.equal(practiceSource(tracks[0], "audio"), "video");
  assert.equal(practiceSource(tracks[1], "video"), "audio");
  assert.equal(practiceSource({ audio: "", videoId: null }), null);
});
