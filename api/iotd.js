const parseDate = require("date-fns/parse");
const startOfToday = require("date-fns/startOfToday");
const { map, scrape, sendFeed, static } = require("../src/util");

const homePage = "https://www.nasa.gov/multimedia/imagegallery/iotd.html";
const url = "https://www.nasa.gov/rss/image_of_the_day.rss";
const parseURL = (relURL) => new URL(relURL, url);

const re = /^(.+?) - (.+)$/;
module.exports = async (req, res) => {
  const $ = await scrape(url);
  sendFeed(res, {
    title: "NASA Image of the Day",
    home_page_url: homePage,
    feed_url: req.url,
    icon:
      "https://www.nasa.gov/sites/all/themes/custom/nasatwo/images/nasa-logo.svg",
    author: { name: "Yvette Smith" },
    items: await Promise.all(
      map(
        $("#gallery-list "),
        async (item) => {
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
