import { scrape, createFeed, parseDate } from "../src/util";
import { Element } from "cheerio";
import { Text } from "domhandler";
import { FeedItem } from "../src/json-feed";

const archiveURL = "https://apod.nasa.gov/apod/archivepix.html";

export default createFeed({
  title: "APOD",
  home_page_url: "https://apod.nasa.gov",
  icon: "https://apod.nasa.gov/favicon.ico",
  authors: [
    {
      name: "Robert Nemiroff",
      url: "http://www.phy.mtu.edu/faculty/Nemiroff.html",
    },
    {
      name: "Jerry Bonnell",
      url: "https://antwrp.gsfc.nasa.gov/htmltest/jbonnell/www/bonnell.html",
    },
    { name: "Phillip Newman" },
  ],
  items: () =>
    scrape(archiveURL).then(($) => {
      const archive = $("center + b")[0];
      const toJSON = ({ type, data, name, attribs, children }: any) => ({
        type,
        data,
        name,
        attribs,
        children: children && children.map(toJSON),
      });
      return Promise.all(
        archive.children
          .slice(0, -1) // ending \n\n
          .reduce((acc, node, i) => {
            if (i % 3 === 0) {
              acc.push([node] as any);
            } else {
              acc[acc.length - 1].push(node as any);
            }
            return acc;
          }, [] as Array<[Text, Element, Text]>)
          .map(([date, link, _br]) => {
            try {
              const url = new URL(link.attribs.href, archiveURL).toString();
              return {
                id: url,
                date: parseDate(date.data.trim(), "yyyy MMMM dd:"),
                title: (link.children[0] as Text).data,
                url: url,
              };
            } catch (e: any) {
              return {
                error: {
                  id: "ERROR",
                  content_html: `<pre>${JSON.stringify(
                    {
                      date: [date, link, _br].map(toJSON),
                      stack: e.stack,
                    },
                    null,
                    2
                  )}</pre>`,
                },
              };
            }
          })
          .slice(0, 14)
          .map<Promise<FeedItem>>(async (article) => {
            if ("error" in article && article.error) return article.error;
            const $ = await scrape(article.url, {}, false);
            // image title, br
            $("center:nth-of-type(2)").children().first().remove();
            $("center:nth-of-type(2)").children().first().remove();
            return {
              ...article,
              content_html:
                $("center:first-of-type > p:last-child > a").toString() +
                $("center + p").toString() +
                `<p>${$("center:nth-of-type(2)").html()}</p>`,
            };
          })
      );
    }),
});
