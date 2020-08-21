const parseDate = require("date-fns/parse");
const startOfToday = require("date-fns/startOfToday");
const isValid = require("date-fns/isValid");
const zonedTimeToUtc = require("date-fns-tz/zonedTimeToUtc");
const { map, scrape, sendFeed } = require("../util");

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
  const $ = await scrape(url);
  const articles = $("[class*=itemContent i]");

  sendFeed({
    title: "Daily Shouts",
    home_page_url: url,
    feed_url: req.url,
    favicon: "https://www.newyorker.com/favicon.ico",
    items: map(articles, (article) => {
      const title = article.find("h4");
      const articleURL = parseURL(title.parents("a").attr("href"));
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
        authors: map(article.find("[class^=byline i] a"), (link) => ({
          name: link.text(),
          url: parseURL(link.attr("href")),
        })),
      };
    }),
  });
};
