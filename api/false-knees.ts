import parseDate from "date-fns/parse";
import startOfToday from "date-fns/startOfToday";
import { scrapeItems, scrape, createFeed, staticFile } from "../src/util";

const url = "https://www.falseknees.com/archive.html";
const parseURL = (relURL: string) => new URL(relURL, url);

const re = /^(.+?) - (.+)$/;
export default createFeed({
  title: "False Knees",
  home_page_url: "https://www.falseknees.com",
  icon: staticFile("false-knees.jpg"),
  author: {
    name: "Joshua Barkman",
    url: "https://www.falseknees.com/about.html",
  },
  items: scrapeItems(
    url,
    {
      selector: ($) => $("#archivetext").parent().next().children("a"),
      limit: 10,
    },
    async (comic) => {
      const [, date, title] = re.exec(comic.text())!;
      let comicURL = parseURL(comic.attr("href")!);

      const $comic = await scrape(comicURL);

      const image = $comic("div > img");
      const imageSource = parseURL(image.attr("src")!);
      const hovertext = image.attr("title");

      if (comicURL.pathname.endsWith("index.html")) {
        comicURL = parseURL(
          imageSource.pathname.match(/imgs\/(.+)\.\w+$/)![1] + ".html"
        );
      }

      return {
        id: comicURL.toString(),
        title,
        content_html: `<img src="${imageSource}" title="${hovertext}">`,
        image: imageSource.toString(),
        date_published: parseDate(
          date,
          "MMMM do, yyyy",
          startOfToday()
        ).toISOString(),
      };
    }
  ),
});
