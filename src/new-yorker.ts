import { map, scrape, makeMidnight } from "../src/util";

import parseDate from "date-fns/parse";
import startOfToday from "date-fns/startOfToday";
import isValid from "date-fns/isValid";
import zonedTimeToUtc = require("date-fns-tz/zonedTimeToUtc");

function parsePublishDate(date: string) {
  const dayDate = parseDate(date, "LLLL d, y", startOfToday());
  return isValid(dayDate)
    ? makeMidnight(dayDate)
    : zonedTimeToUtc(
        parseDate(date.toLowerCase(), "h:mm aaaa", startOfToday()),
        "America/New_York"
      );
}

export async function parseArticles(
  url: string
): Promise<ReturnType<typeof parseArticle>[]> {
  const parseURL = (relURL: string) => new URL(relURL, url);
  const $ = await scrape(url);
  const articles = $("[class*=itemContent i]");
  return map(articles, parseArticle.bind(null, parseURL));
}

function parseArticle(
  parseURL: (url: string) => URL,
  article: ReturnType<typeof import("cheerio")>
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
    url: articleURL,
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
