import type { APIRoute, GetStaticPaths } from "astro";
import { getChoirLibrary } from "@/lib/songs";
import {
  defaultSocialCard,
  songsSocialCard,
  lineupSocialCard,
} from "@/lib/social-preview.mjs";
import { renderSocialPreview } from "@/lib/social-preview-render.mjs";

export const prerender = true;
export const getStaticPaths = (async () => {
  const { selections } = await getChoirLibrary();
  const cards = [
    defaultSocialCard(),
    songsSocialCard(),
    ...selections.flatMap((selection) => {
      const card = lineupSocialCard(selection);
      return card ? [card] : [];
    }),
  ];
  return cards.map((card) => ({
    params: { image: card.key },
    props: { card },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderSocialPreview(props.card);
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
