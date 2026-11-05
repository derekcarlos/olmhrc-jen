/** @returns {"page"|"location"|undefined} */
export function navigationCurrent(pathname, href) {
  if (!href) return undefined;
  const path = pathname.replace(/\/+$/, "") || "/";
  const destination = href.replace(/\/+$/, "") || "/";
  if (path === destination) return "page";
  if (destination !== "/" && path.startsWith(`${destination}/`))
    return "location";
  return undefined;
}

/** @param {Array<{name:string,url:string,hasChildren?:boolean,children?:Array<{name:string,url:string}>}>} main */
export function footerNavigation(main) {
  return {
    chapel: main.filter((item) => !item.hasChildren && item.url),
    prayer: main.flatMap((item) =>
      item.hasChildren ? item.children || [] : [],
    ),
  };
}
