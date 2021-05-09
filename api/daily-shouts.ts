import { createFeed } from "../src/util";
import { parseArticles } from "../src/new-yorker";

const url = "https://www.newyorker.com/humor/daily-shouts";
export default createFeed({
  title: "Daily Shouts",
  home_page_url: url,
  favicon: "https://www.newyorker.com/favicon.ico",
  items: parseArticles(url),
});
