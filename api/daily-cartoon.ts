import { createFeed } from "../src/util";
import { parseArticles } from "../src/new-yorker";

const url = "https://www.newyorker.com/cartoons/daily-cartoon";
export default createFeed({
  title: "Daily Cartoon",
  home_page_url: url,
  favicon: "https://www.newyorker.com/favicon.ico",
  items: parseArticles(url, (article) => ({
    ...article,
    content_html: `<img src="${article.image}">${
      article.summary[0] === "“"
        ? `<p align="center"><em>${article.summary}</em></p>`
        : ""
    }`,
  })),
});
