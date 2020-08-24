const parseDate = require("date-fns/parse");
const startOfToday = require("date-fns/startOfToday");
const { map, scrape, sendFeed, static } = require("../src/util");
const { parse: parseSrcset } = require("srcset");

const url = "https://foxtrot.com";
const parseURL = (relURL) => new URL(relURL, url);

const re = /^(.+?) - (.+)$/;
module.exports = async (req, res) => {
  const $ = await scrape(url);
  sendFeed(res, {
    title: "FoxTrot",
    home_page_url: url,
    description: "Bill Amend’s FoxTrot comic strip. New comics every Sunday!",
    feed_url: req.url,
    icon:
      "https://foxtrot.com/wp-content/uploads/2020/05/cropped-favicon-quincy-1.png",
    favicon:
      "https://1a3k5t1s1nlq3nug3z23q9ed-wpengine.netdna-ssl.com/wp-content/uploads/2020/05/cropped-favicon-quincy-1-180x180.png",
    author: { name: "Bill Amend", url },
    items: map($(".entry"), (comic) => {
      const comicURL = comic.find(".entry-title a").attr("href");
      const srcset = comic.find("img").attr("srcset");
      const imageSource = parseSrcset(srcset).sort(
        (a, b) => b.width - a.width
      )[0].url;
      return {
        id: comicURL,
        url: comicURL,
        author: { name: "Bill Amend", url },
        title: comic.find(".entry-title").text(),
        content_html: `<img srcset="${srcset}">`,
        image: imageSource,
        date_published: parseDate(
          comic.find(".entry-summary").text().trim(),
          "MMMM do, yyyy",
          startOfToday()
        ),
      };
    }),
  });
};
