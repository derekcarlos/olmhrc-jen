/** Validate optional editorial content before rendering a public prayer guide.
 * @param {import('../types/rosary.ts').RosaryMysterySet[]} sets
 */
export function validateRosaryMysteries(sets) {
  const ids = new Set();
  const setIds = new Set();
  const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const https = (value, label) => {
    if (!value) return;
    try {
      if (new URL(value).protocol === "https:") return;
    } catch {
      /* Report the field below. */
    }
    throw new Error(`${label} must be an HTTPS URL`);
  };
  for (const set of sets) {
    if (!slug.test(set.id) || setIds.has(set.id))
      throw new Error(`Invalid or duplicate mystery set ID: ${set.id}`);
    setIds.add(set.id);
    if (set.items?.length !== 5)
      throw new Error(`${set.id} needs five mystery entries`);
    for (const item of set.items) {
      if (!slug.test(item.id) || ids.has(item.id))
        throw new Error(`Invalid or duplicate mystery ID: ${item.id}`);
      ids.add(item.id);
      if (!item.title?.trim())
        throw new Error(`${item.id} needs a mystery title`);
      if (item.meditation !== undefined && typeof item.meditation !== "string")
        throw new Error(`${item.id}: meditation must be text`);
      if (item.fruit !== undefined && typeof item.fruit !== "string")
        throw new Error(`${item.id}: fruit of the mystery must be text`);
      const art = item.art;
      if (!art) continue;
      https(art.source_url, `${item.id}: artwork source`);
      https(art.license_url, `${item.id}: artwork license link`);
      if (!art.image?.trim()) continue;
      if (
        !/^\/images\/rosary\/[a-z0-9/_ .-]+\.(?:jpe?g|png|webp|avif|gif)$/i.test(
          art.image,
        ) ||
        art.image.includes("..")
      )
        throw new Error(
          `${item.id}: image must be a local file under /images/rosary/`,
        );
      if (!art.alt?.trim())
        throw new Error(`${item.id}: artwork needs an alt description`);
      if (!art.source_url?.trim())
        throw new Error(`${item.id}: artwork needs its source URL`);
      if (!art.license?.trim())
        throw new Error(
          `${item.id}: artwork needs a license or public-domain label`,
        );
    }
  }
  return true;
}
