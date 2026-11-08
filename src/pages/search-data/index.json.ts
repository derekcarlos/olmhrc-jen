import type { APIRoute } from "astro";
import { getSiteSearchIndex } from "@/lib/search-index";

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await getSiteSearchIndex()), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
