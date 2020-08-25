const { createFeed } = require("../src/util");
const { parseArticles } = require("../src/new-yorker");

const url = "https://www.newyorker.com/humor/daily-shouts";
module.exports = createFeed({
  title: "Daily Shouts",
  home_page_url: url,
  favicon: "https://www.newyorker.com/favicon.ico",
  items: () => parseArticles(url),
});
