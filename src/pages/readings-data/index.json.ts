import type { APIRoute } from "astro";
import { getReadingSnapshot } from "@/lib/readings-store.mjs";
export const GET: APIRoute = () =>
  new Response(JSON.stringify(getReadingSnapshot()), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
