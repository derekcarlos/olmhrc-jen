export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;

export function defaultSocialCard() {
  return {
    key: "rosarium",
    brand: "Rosarium",
    title: "Our Lady of the\nMost Holy Rosary Chapel",
    subtitle: "Jubilation Enclave North · Biñan, Laguna",
    badge: "Faith · Prayer · Community",
    alt: "Rosarium — Our Lady of the Most Holy Rosary Chapel, Jubilation Enclave North, Biñan, Laguna.",
  };
}
export function songsSocialCard() {
  return {
    key: "songs",
    brand: "Coro de Rosarium",
    title: "Sunday,\nin song.",
    subtitle: "Lyrics · Recordings · Choir practice",
    badge: "Our voices together.",
    alt: "Coro de Rosarium — Sunday, in song. Lyrics, recordings, and choir practice.",
  };
}
/** @param {{id:string,title:string,date:string,status:string,readiness?:string}} selection */
export function lineupSocialCard(selection) {
  if (selection.status !== "published") return null;
  const subtitle = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${selection.date}T12:00:00Z`));
  const badge =
    selection.readiness === "confirmed"
      ? "Confirmed lineup"
      : "Preliminary lineup · Choices may change";
  return {
    key: `lineup-${selection.id}`,
    brand: "Coro de Rosarium",
    title: selection.title,
    subtitle,
    badge,
    alt: `Coro de Rosarium — ${selection.title}, ${subtitle}. ${badge}.`,
  };
}
/** @param {string} key */
export function socialImagePath(key) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key))
    throw new Error("Invalid social image key");
  return `/share/${key}.png`;
}

/** @param {{image?:string,alt?:string,baseUrl:string}} options */
export function resolveSocialImage({ image, alt, baseUrl }) {
  const site = new URL(baseUrl);
  const fallback = new URL(socialImagePath("rosarium"), site);
  let url = fallback;
  let fallbackUsed = true;
  try {
    const candidate = new URL(image || fallback.href, site);
    if (
      ["http:", "https:"].includes(candidate.protocol) &&
      !/\.svg$/i.test(candidate.pathname)
    ) {
      url = candidate;
      fallbackUsed = !image;
    }
  } catch {
    /* Invalid image metadata uses the site's PNG fallback. */
  }
  const generated =
    url.origin === site.origin &&
    /^\/share\/(?:rosarium|songs|lineup-[a-z0-9-]+)\.png$/.test(url.pathname);
  const extension = url.pathname.split(".").at(-1)?.toLowerCase();
  const types = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif",
  };
  return {
    url: url.href,
    type: types[extension],
    width: generated ? SOCIAL_IMAGE_WIDTH : undefined,
    height: generated ? SOCIAL_IMAGE_HEIGHT : undefined,
    alt: fallbackUsed
      ? defaultSocialCard().alt
      : alt ||
        (url.pathname === socialImagePath("songs")
          ? songsSocialCard().alt
          : defaultSocialCard().alt),
  };
}
