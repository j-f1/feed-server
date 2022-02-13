import fetch from "node-fetch";
import cheerio from "cheerio";

import { createFeed, scrape, parseDate, map } from "../src/util";

const url = "https://buttercupfestival.com";

export default createFeed({
  title: "Buttercup Festival",
  home_page_url: url,
  description: "You're just in time for euphoria. New comics every Monday.",
  icon: "https://pbs.twimg.com/profile_images/1336287565046026248/FRxr4dBb.jpg",
  favicon:
    "https://pbs.twimg.com/profile_images/1336287565046026248/FRxr4dBb.jpg",
  author: { name: "David Troupes", url },
  items: () =>
    scrape(url).then(($) => {
      const links = $('b:contains("Series 3 archive")').parent().children("a");
      return Promise.all(
        map(links, (l) => l.attr("href")!)
          .slice(-5)
          .map((relURL) => {
            const href = new URL(relURL, url);
            return fetch(href)
              .then(
                async (res) =>
                  [await res.text(), res.headers.get("Last-Modified")] as const
              )
              .then(([text, date]) => [cheerio.load(text), date] as const)
              .then(([$, date]) => ({
                id: relURL,
                title: `Buttercup Festival ${relURL.replace(".htm", "")}`,
                url: href.href,
                content_html: $("center > img").toString(),
                date_published: date
                  ? parseDate(date, "EEE, dd MMM yyyy HH:mm:ss 'GMT'")
                  : undefined,
              }));
          })
      );
    }),
});
