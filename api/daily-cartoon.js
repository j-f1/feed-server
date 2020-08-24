const { sendFeed } = require("../src/util");
const { parseArticles } = require("../src/new-yorker");

const url = "https://www.newyorker.com/cartoons/daily-cartoon";
module.exports = async (req, res) => {
  sendFeed(res, {
    title: "Daily Cartoon",
    home_page_url: url,
    feed_url: req.url,
    favicon: "https://www.newyorker.com/favicon.ico",
    items: (await parseArticles(url)).map(({ image, summary, ...item }) => ({
      ...item,
      image,
      content_html: `<img src="${image}">${
        summary[0] === "“" ? `<p align="center"><em>${summary}</em></p>` : ""
      }`,
    })),
  });
};
