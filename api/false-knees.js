const fetch = require("node-fetch");
const cheerio = require("cheerio");
const parseDate = require("date-fns/parse");
const startOfToday = require("date-fns/startOfToday");
const isValid = require("date-fns/isValid");
const zonedTimeToUtc = require("date-fns-tz/zonedTimeToUtc");

const url = "https://www.falseknees.com/archive.html";
const parseURL = (relURL) => new URL(relURL, url);

function map(selection, mapper, limit = null) {
  const array = selection.toArray();
  return (limit ? array.slice(0, limit) : array).map((el, i) =>
    mapper(cheerio(el), i)
  );
}

const re = /^(.+?) - (.+)$/;
module.exports = async (req, res) => {
  const $ = await fetch(url)
    .then((res) => res.text())
    .then(cheerio.load);

  const comics = $("#archivetext").parent().next().children("a");

  const author = {
    name: "Joshua Barkman",
    url: "https://www.falseknees.com/about.html",
  };

  res.setHeader("content-type", "application/feed+json");
  res.status(200).json({
    version: "https://jsonfeed.org/version/1.1",
    title: "False Knees",
    home_page_url: "https://www.falseknees.com",
    feed_url: new URL(req.url, "https://feeds.jedfox.com/"),
    icon: "https://feeds.jedfox.com/static/false-knees.jpg",
    language: "en-US",
    author,
    authors: [author],
    items: await Promise.all(
      map(
        comics,
        async (comic) => {
          const [, date, title] = re.exec(comic.text());
          const comicURL = parseURL(comic.attr("href"));

          const $comic = await fetch(comicURL)
            .then((res) => res.text())
            .then(cheerio.load);

          const image = $comic("div > img");
          const imageSource = parseURL(image.attr("src"));
          const hovertext = image.attr("title");

          return {
            id: comicURL,
            url: comicURL,
            title,
            content_html: `<img src="${imageSource}" title="${hovertext}">`,
            image: imageSource,
            date_published: parseDate(date, "MMMM do, yyyy", startOfToday()),
          };
        },
        10
      )
    ),
  });
};
