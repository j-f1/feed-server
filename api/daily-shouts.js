const fetch = require("node-fetch");
const cheerio = require("cheerio");
const parseDate = require("date-fns/parse");
const startOfToday = require("date-fns/startOfToday");
const isValid = require("date-fns/isValid");
const zonedTimeToUtc = require("date-fns-tz/zonedTimeToUtc");

function map(selection, mapper) {
  return selection.toArray().map((el, i) => mapper(cheerio(el), i));
}

function parsePublishDate(date) {
  const dayDate = parseDate(date, "LLLL d, y", startOfToday());
  return zonedTimeToUtc(
    isValid(dayDate)
      ? dayDate
      : parseDate(date.toLowerCase(), "h:mm aaaa", startOfToday()),
    "America/New_York"
  );
}

const url = "https://www.newyorker.com/humor/daily-shouts";
const parseURL = (relURL) => new URL(relURL, url);
module.exports = async (req, res) => {
  const $ = await fetch(url)
    .then((res) => res.text())
    .then(cheerio.load);

  const articles = $("[class*=itemContent i]");

  res.setHeader("content-type", "application/feed+json");
  res.status(200).json({
    version: "https://jsonfeed.org/version/1.1",
    title: "Daily Shouts",
    home_page_url: url,
    feed_url: new URL(req.url, `http://${req.headers.host}`),
    favicon: "https://www.newyorker.com/favicon.ico",
    language: "en-US",
    items: map(articles, (article) => {
      const title = article.find("h4");
      const articleURL = parseURL(title.parents("a").attr("href"));
      const authors = map(article.find("[class^=byline i] a"), (link) => ({
        name: link.text(),
        url: parseURL(link.attr("href")),
      }));
      return {
        id: articleURL,
        url: articleURL,
        title: title.text(),
        summary: article.find("h5").text(),
        image: article
          .find("img")
          .attr("src")
          .replace("4:3/w_116,c_limit/", ""),
        date_published: parsePublishDate(
          article.find("[class*=publishDate i]").text()
        ),
        authors,
        author: authors[0],
      };
    }),
  });
};
