import { map, makeMidnight, scrapeItems } from "./util";

import parseDate from "date-fns/parse";
import startOfToday from "date-fns/startOfToday";
import isValid from "date-fns/isValid";
import { Cheerio, Element } from "cheerio";
import type { FeedItem } from "./json-feed";
const zonedTimeToUtc = require("date-fns-tz/zonedTimeToUtc");

export function parsePublishDate(date: string) {
  const dayDate = parseDate(date, "LLLL d, y", startOfToday());
  return isValid(dayDate)
    ? makeMidnight(dayDate)
    : zonedTimeToUtc(
        parseDate(date.toLowerCase(), "h:mm aaaa", startOfToday()),
        "America/New_York"
      );
}

export function parseArticles(
  url: string,
  mapper: (article: ReturnType<typeof parseArticle>) => FeedItem = (x) => x
): () => Promise<FeedItem[]> {
  return scrapeItems(url, { selector: "[class*=itemContent i]" }, (article) =>
    mapper(parseArticle((relURL: string) => new URL(relURL, url), article))
  );
}

function parseArticle(
  parseURL: (url: string) => URL,
  article: Cheerio<Element>
) {
  const title = article.find("h4");
  const articleURL = parseURL(title.parents("a").attr("href")!).toString();
  const summary = article.find("h5").text();
  const image = article
    .find("img")
    .attr("src")!
    .replace("4:3/w_116,c_limit/", "w_500/");
  return {
    id: articleURL,
    title: title.text(),
    summary: summary,
    image: image,
    date_published: parsePublishDate(
      article.find("[class*=publishDate i]").text()
    ).toISOString(),
    authors: map(article.find("[class^=byline i] a"), (link) => ({
      name: link.text(),
      url: parseURL(link.attr("href")!).toString(),
    })),
    content_html: `<p><em>${summary}</em></p><img width=500 src="${image}" />`,
  };
}
