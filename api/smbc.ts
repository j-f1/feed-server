import {
  scrape,
  scrapeItems,
  createFeed,
  Cheerio,
  parseDate,
} from "../src/util";

const url = "https://www.smbc-comics.com/comic/rss";
const parseURL = (relURL: string) => new URL(relURL, url);

module.exports = createFeed({
  title: "Saturday Morning Breakfast Cereal",
  home_page_url: "https://www.smbc-comics.com/",
  icon: "https://www.smbc-comics.com/favicon.ico",
  author: {
    name: "Zach Weinersmith",
    url: "https://www.smbc-comics.com/",
  },
  items: scrapeItems(
    url,
    { xml: true, selector: "item", limit: 10 },
    async (comic) => {
      const title = comic
        .find("title")
        .text()
        .replace("Saturday Morning Breakfast Cereal - ", "");
      const date = comic
        .children()
        .filter(function (this: Cheerio[number]) {
          return this.name === "pubDate";
        })
        .text();

      const comicURL = parseURL(comic.find("link").text());
      const $comic = await scrape(comicURL);

      const image = $comic("#cc-comic");
      const imageSource = parseURL(image.attr("src")!);
      const hovertext = image.attr("title");

      const extraImage = parseURL($comic("#aftercomic img").attr("src")!);

      return {
        id: comicURL.toString(),
        title,
        content_html: `<img src="${imageSource}" title="${hovertext}"><br><img src="${extraImage}">`,
        image: imageSource.toString(),
        date_published: parseDate(date, "EEE, dd MMM yyyy HH:mm:ss XX"),
      };
    }
  ),
});
