import parseDate from "date-fns/parse";
import startOfToday from "date-fns/startOfToday";
import { createFeed, scrapeItems } from "../src/util";
import { parse as parseSrcset } from "srcset";

const url = "https://foxtrot.com";

export default createFeed({
  title: "FoxTrot",
  home_page_url: url,
  description: "Bill Amend’s FoxTrot comic strip. New comics every Sunday!",
  icon:
    "https://foxtrot.com/wp-content/uploads/2020/05/cropped-favicon-quincy-1.png",
  favicon:
    "https://1a3k5t1s1nlq3nug3z23q9ed-wpengine.netdna-ssl.com/wp-content/uploads/2020/05/cropped-favicon-quincy-1-180x180.png",
  author: { name: "Bill Amend", url },
  items: scrapeItems(url, { selector: ".entry" }, (comic) => {
    const srcset = comic.find("img").attr("srcset")!;
    return {
      id: comic.find(".entry-title a").attr("href")!,
      author: { name: "Bill Amend", url },
      title: comic.find(".entry-title").text(),
      content_html: `<img srcset="${srcset}">`,
      image: parseSrcset(srcset).sort((a, b) => b.width! - a.width!)[0].url,
      date_published: parseDate(
        comic.find(".entry-summary").text().trim(),
        "MMMM do, yyyy",
        startOfToday()
      ).toISOString(),
    };
  }),
});
