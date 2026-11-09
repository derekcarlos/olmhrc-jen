import { getCollection } from "astro:content";
import { getListPage, getSinglePage } from "@/lib/contentParser.astro";
import { getChoirLibrary } from "@/lib/songs";
import { massParts } from "@/lib/mass-parts";
import { getReadingSnapshot } from "@/lib/readings-store.mjs";
import { formatReadingDate, targetDates } from "@/lib/readings.mjs";
import { buildSearchDocuments } from "./search-documents.mjs";
import englishRosary from "@/data/rosary.json";
import tagalogRosary from "@/data/rosary-tl.json";
import blockRosary from "@/data/block-rosary.json";
import englishStations from "@/data/stations-cross-en.json";
import tagalogStations from "@/data/stations-cross-tl.json";

/** Build the same index in Astro dev and the static production endpoint. */
export async function getSiteSearchIndex() {
  const [library, prayers, pages, news, events, about, home] =
    await Promise.all([
      getChoirLibrary(),
      getSinglePage("prayers"),
      getSinglePage("pages"),
      getSinglePage("news"),
      getCollection("events", ({ data }) => !data.draft),
      getListPage("about", "-index"),
      getListPage("homepage", "-index"),
    ]);
  const sources: Parameters<typeof buildSearchDocuments>[0] = [];
  for (const song of library.songs)
    sources.push({
      id: song.id,
      type: "songs",
      url: `/songs/${song.id}`,
      data: song.data,
      body: song.body,
      keywords: song.data.mass_parts.map(
        (id) => massParts.find((part) => part.id === id)?.label || id,
      ),
    });
  for (const lineup of library.selections)
    sources.push({
      id: lineup.id,
      type: "lineups",
      url: `/songs/selections/${lineup.id}`,
      data: {
        title: lineup.title,
        description: `${lineup.date} · ${lineup.celebration}`,
      },
      body: lineup.notes,
      extra: lineup.items
        .filter((item) => item.used)
        .map((item) => ({
          part: massParts.find((part) => part.id === item.part)?.label,
          title: item.song ? library.songMap.get(item.song)?.data.title : "",
        })),
    });
  const prayerTexts: Record<string, unknown> = {
    "how-to-pray-the-holy-rosary": englishRosary,
    "ang-banal-na-rosaryo": tagalogRosary,
    "block-rosary": [englishRosary, blockRosary],
    "novena-to-our-lady-of-the-most-holy-rosary": tagalogRosary,
    "flores-de-maria": tagalogRosary,
    "stations-of-the-cross": [englishStations, englishRosary.prayers],
    "ang-bagong-daan-ng-krus": [tagalogStations, tagalogRosary.prayers],
  };
  const prayerAliases: Record<string, string[]> = {
    "stations-of-the-cross": ["Stations of the Cross", "Daan ng Krus"],
    "ang-bagong-daan-ng-krus": ["Stations of the Cross", "Way of the Cross"],
    "how-to-pray-the-holy-rosary": ["Holy Rosary", "Santo Rosaryo"],
    "ang-banal-na-rosaryo": ["Holy Rosary", "Santo Rosaryo"],
  };
  for (const prayer of prayers)
    sources.push({
      id: prayer.id,
      type: "prayers",
      url: `/prayers/${prayer.id}`,
      data: prayer.data,
      body: prayer.body,
      extra: prayerTexts[prayer.id],
      keywords: prayerAliases[prayer.id],
    });
  for (const page of pages)
    sources.push({
      id: page.id,
      type: "pages",
      url: `/${page.id}`,
      data: page.data,
      body: page.body,
      extra: ["mass", "calendar"].includes(page.id)
        ? events.map((event) => event.data)
        : undefined,
    });
  for (const post of news)
    sources.push({
      id: post.id,
      type: "news",
      url: `/news/${post.id}`,
      data: post.data,
      body: post.body,
    });
  if (!about.data.draft)
    sources.push({
      type: "pages",
      url: "/about",
      data: about.data,
      body: about.body,
    });
  sources.push({
    type: "pages",
    url: "/",
    data: {
      title: "Rosarium · Our Lady of the Most Holy Rosary Chapel",
      description: home.data.banner.content,
    },
    extra: [home.data.banner, home.data.mass, home.data.news],
  });
  for (const [url, title, description] of [
    [
      "/songs",
      "Songs · Coro de Rosarium",
      "Sunday song selections, future lineups, lyrics, and practice listening.",
    ],
    [
      "/songs/mass",
      "Mass Song Library",
      "Browse choir songs by Mass part, season, and celebration.",
    ],
    [
      "/songs/marian",
      "Marian Songs",
      "Songs for the Blessed Virgin Mary and community prayer.",
    ],
    [
      "/songs/selections",
      "Song Lineups",
      "Upcoming and past Mass song selections for our choir.",
    ],
    [
      "/readings",
      "Mga Pagbasa · Filipino Readings",
      "Filipino readings for the coming Sunday Mass.",
    ],
    [
      "/news",
      "News and Announcements",
      "Updates from Our Lady of the Most Holy Rosary Chapel.",
    ],
  ])
    sources.push({
      type: url === "/readings" ? "readings" : "pages",
      url,
      data: { title, description },
    });
  const snapshot = getReadingSnapshot();
  const active = targetDates(
    snapshot.mode,
    new Date(),
    snapshot.calendar_dates,
  );
  for (const record of snapshot.records.filter((record) =>
    active.includes(record.date),
  ))
    sources.push({
      type: "readings",
      url: `/readings/${record.date}`,
      data: {
        title: record.celebration,
        description: `Mga Pagbasa · ${formatReadingDate(record.date)}`,
      },
      extra: record.sections.map((section) => ({
        title: section.heading,
        reference: section.reference,
        text: section.blocks.map((block) => block.text),
      })),
    });
  return buildSearchDocuments(sources);
}
