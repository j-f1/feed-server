const fetch = require("node-fetch");
const { createFeed } = require("../src/util");
const { encode } = require("querystring");

const absolute = (relURL) => new URL(relURL, "https://www.nasa.gov/");
const image = (uri) =>
  absolute(uri.replace("public://", "/sites/default/files/"));

const escape = (val) =>
  String(val).replace(/&/g, "&amp;").replace(/"/g, "&quot;");

module.exports = createFeed({
  title: "NASA Image of the Day",
  home_page_url: "https://www.nasa.gov/multimedia/imagegallery/iotd.html",
  description: 'The latest NASA "Image of the Day" image.',
  icon:
    "https://www.nasa.gov/sites/all/themes/custom/nasatwo/images/apple-touch-icon-152x152.png",
  favicon:
    "https://www.nasa.gov/sites/all/themes/custom/nasatwo/images/apple-touch-icon-152x152.png",
  language: "en-US",
  items: () =>
    fetch(
      "https://www.nasa.gov/api/2/ubernode/_search?" +
        encode({
          size: 24,
          from: 0,
          sort: "promo-date-time:desc",
          q: "((ubernode-type:image) AND (routes:1446))",
          _source_include:
            "title,body,uri,promo-date-time,master-image,image-feature-caption,name",
        })
    )
      .then((res) => res.json())
      .then(({ hits: { hits } }) =>
        hits.map(({ _source: item }) => ({
          id: absolute(item.uri),
          url: absolute(item.uri),
          title: item.title,
          content_html:
            `<img src="${escape(
              image(item["master-image"].uri)
            )}" alt="${escape(item["master-image"].alt)}" width="${escape(
              item["master-image"].width
            )}" height="${escape(item["master-image"].height)}">` + item.body,
          summary: item["image-feature-caption"],
          image: image(item["master-image"].uri),
          date_published: item["promo-date-time"],
          author: { name: item.name },
        }))
      ),
});

let _example = {
  _index: "nasa-public",
  _type: "ubernode",
  _id: "464164",
  _score: null,
  _source: {
    title: "Completing the Roman Telescope's Primary Mirror",
    body:
      '<p>The <a href="https://www.nasa.gov/content/goddard/nancy-grace-roman-space-telescope">Nancy Grace Roman Space Telescope</a>’s primary mirror, which will collect and focus light from cosmic objects near and far, has been completed. Using this mirror, Roman will capture stunning space vistas with a field of view 100 times greater than Hubble images.</p>\n\n<p>Roman will peer through dust and across vast stretches of space and time to study the universe using infrared light, which human eyes can’t see. The amount of detail these observations will reveal is directly related to the size of the telescope’s mirror, since a larger surface gathers more light and measures finer features.</p>\n\n<p>In this image, the Roman Space Telescope’s primary mirror reflects an American flag. </p>\n\n<p><em>Image Credit: L3Harris Technologies</em></p>',
    name: "Yvette Smith",
    "promo-date-time": "2020-09-04T00:57:00-04:00",
    uri: "/image-feature/completing-the-roman-telescopes-primary-mirror",
    "image-feature-caption":
      "The Nancy Grace Roman Space Telescope’s primary mirror, which will collect and focus light from cosmic objects near and far, has been completed. ",
    "master-image": {
      fid: "628281",
      alt: "American Flag Reflected in Roman's Primary Mirror",
      width: "5184",
      id: "628281",
      title: "American Flag Reflected in Roman's Primary Mirror",
      uri: "public://thumbnails/image/pm10.jpg",
      height: "3193",
    },
  },
  sort: [1599195420000],
};
