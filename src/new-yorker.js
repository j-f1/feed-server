const { map, scrape } = require("../src/util");

const parseDate = require("date-fns/parse");
const startOfToday = require("date-fns/startOfToday");
const isValid = require("date-fns/isValid");
const zonedTimeToUtc = require("date-fns-tz/zonedTimeToUtc");

module.exports = { parseArticles };

function parsePublishDate(date) {
  const dayDate = parseDate(date, "LLLL d, y", startOfToday());
  return zonedTimeToUtc(
    isValid(dayDate)
      ? dayDate
      : parseDate(date.toLowerCase(), "h:mm aaaa", startOfToday()),
    "America/New_York"
  );
}

async function parseArticles(url) {
  const parseURL = (relURL) => new URL(relURL, url);
  const $ = await scrape(url);
  const articles = $("[class*=itemContent i]");
  return map(articles, parseArticle.bind(null, parseURL));
}

function parseArticle(parseURL, article) {
  const title = article.find("h4");
  const articleURL = parseURL(title.parents("a").attr("href"));
  return {
    id: articleURL,
    url: articleURL,
    title: title.text(),
    summary: article.find("h5").text(),
    image: article.find("img").attr("src").replace("4:3/w_116,c_limit/", ""),
    date_published: parsePublishDate(
      article.find("[class*=publishDate i]").text()
    ),
    authors: map(article.find("[class^=byline i] a"), (link) => ({
      name: link.text(),
      url: parseURL(link.attr("href")),
    })),
  };
}
