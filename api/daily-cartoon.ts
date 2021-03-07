import { createFeed } from "../src/util";
import { parseArticles } from "../src/new-yorker";

const url = "https://www.newyorker.com/cartoons/daily-cartoon";
export default createFeed({
  title: "Daily Cartoon",
  home_page_url: url,
  favicon: "https://www.newyorker.com/favicon.ico",
  items: () =>
    parseArticles(url).then((articles) =>
      articles.map(({ image, summary, ...item }) => ({
        ...item,
        image,
        content_html: `<img src="${image}">${
          summary[0] === "“" ? `<p align="center"><em>${summary}</em></p>` : ""
        }`,
      }))
    ),
});
