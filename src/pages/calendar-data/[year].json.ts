import type { APIRoute, GetStaticPaths } from "astro";
import {
  getLiturgicalYear,
  MIN_CALENDAR_YEAR,
  MAX_CALENDAR_YEAR,
} from "@/lib/liturgical-calendar.mjs";

export const getStaticPaths = (() =>
  Array.from(
    { length: MAX_CALENDAR_YEAR - MIN_CALENDAR_YEAR + 1 },
    (_, index) => ({
      params: { year: String(MIN_CALENDAR_YEAR + index) },
    }),
  )) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) =>
  new Response(JSON.stringify(await getLiturgicalYear(Number(params.year))), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
