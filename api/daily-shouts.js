const { sendFeed } = require("../src/util");
const { parseArticles } = require("../src/new-yorker");

const url = "https://www.newyorker.com/humor/daily-shouts";
module.exports = async (req, res) => {
  sendFeed(res, {
    title: "Daily Shouts",
    home_page_url: url,
    feed_url: req.url,
    favicon: "https://www.newyorker.com/favicon.ico",
    items: await parseArticles(url),
  });
};
