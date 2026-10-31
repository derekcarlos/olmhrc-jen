import { getSinglePage } from "@/lib/contentParser.astro";

export async function getNewsPosts() {
  const posts = await getSinglePage("news");
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
