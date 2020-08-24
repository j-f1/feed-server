const cheerio = require("cheerio");
const fetch = require("node-fetch");

module.exports = { map, scrape, sendFeed, static };

function map(selection, mapper, limit = null) {
  const array = selection.toArray();
  return (limit ? array.slice(0, limit) : array).map((el, i) =>
    mapper(cheerio(el), i)
  );
}

const isDev = process.env.NODE_ENV === "development";

const host = isDev ? "http://localhost:3000/" : "https://feeds.jedfox.com/";

const staticURL = new URL("/static/", host);
function static(name) {
  return new URL(name, staticURL);
}

function scrape(url) {
  return fetch(url)
    .then((res) => res.text())
    .then(cheerio.load);
}

const authorCompat = ({ author, authors }) => {
  if (!author && !authors) return {};

  const single = author || authors[0];
  const multiple = authors || [author];
  return { author: single, authors: multiple };
};

function sendFeed(res, feed) {
  res.setHeader("content-type", "application/feed+json; charset=utf-8");
  res.status(200).end(
    JSON.stringify(
      {
        version: "https://jsonfeed.org/version/1.1",
        language: "en-US",
        ...feed,
        feed_url: new URL(feed.feed_url, host),
        ...authorCompat(feed),
        items:
          feed.items &&
          feed.items.map((item) => ({ ...item, ...authorCompat(item) })),
      },
      null,
      isDev ? 2 : null
    )
  );
}