const parseDate = require("date-fns/parse");
const startOfToday = require("date-fns/startOfToday");
const { map, scrape, sendFeed, static } = require("../src/util");

const url = "https://www.falseknees.com/archive.html";
const homePage = "https://www.falseknees.com";
const parseURL = (relURL) => new URL(relURL, url);

const re = /^(.+?) - (.+)$/;
module.exports = async (req, res) => {
  const $ = await scrape(url);
  sendFeed(res, {
    title: "False Knees",
    home_page_url: homePage,
    feed_url: req.url,
    icon: static("false-knees.jpg"),
    author: {
      name: "Joshua Barkman",
      url: "https://www.falseknees.com/about.html",
    },
    items: await Promise.all(
      map(
        $("#archivetext").parent().next().children("a"),
        async (comic) => {
          const [, date, title] = re.exec(comic.text());
          let comicURL = parseURL(comic.attr("href"));

          const $comic = await scrape(comicURL);

          const image = $comic("div > img");
          const imageSource = parseURL(image.attr("src"));
          const hovertext = image.attr("title");

          if (comicURL.pathname.endsWith("index.html")) {
            comicURL = parseURL(
              imageSource.pathname.match(/imgs\/(.+)\.\w+$/)[1] + ".html"
            );
          }

          return {
            id: comicURL,
            url: comicURL,
            title,
            content_html: `<img src="${imageSource}" title="${hovertext}">`,
            image: imageSource,
            date_published: parseDate(date, "MMMM do, yyyy", startOfToday()),
          };
        },
        10
      )
    ),
  });
};
