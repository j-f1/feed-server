const { createFeed } = require("../src/util");
const { parseArticles } = require("../src/new-yorker");

const url = "https://www.newyorker.com/cartoons/daily-cartoon";
module.exports = createFeed(
  {
    title: "Daily Cartoon",
    home_page_url: url,
    favicon: "https://www.newyorker.com/favicon.ico",
  },
  () =>
    parseArticles(url).then((articles) =>
      articles.map(({ image, summary, ...item }) => ({
        ...item,
        image,
        content_html: `<img src="${image}">${
          summary[0] === "“" ? `<p align="center"><em>${summary}</em></p>` : ""
        }`,
      }))
    )
);
