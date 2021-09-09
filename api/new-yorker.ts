import { map, scrapeItems, createFeed, makeError } from "../src/util";
import cheerio, { Cheerio, CheerioAPI, Element } from "cheerio";
import { parsePublishDate } from "../src/new-yorker";
import fetch from "node-fetch";
import type { FeedItem } from "../src/json-feed";

const exclusions = [
  "Daily Shouts",
  "Daily Cartoon",
  "Daily Comment",
  "Crossword",
  "Books",
  "Musical Events",
  "The Theatre",
  "Under Review",
  "Fiction",
  "This Week in Fiction",
  "Poems",
  "The New Yorker Radio Hour",
  "Photo Booth",
  "Cryptic Crossword",
  "Newsletters",
];

async function parseArticle(article: Cheerio<Element>) {
  const articleResponse = await fetch(article.attr("href")!);
  const articleURL = articleResponse.url.split("?")[0];

  const $ = cheerio.load(await articleResponse.text());

  return {
    id: articleURL,
    date_published: parsePublishDate(
      $("article [data-testid=ContentHeaderPublishDate]").text()
    ).toISOString(),
    authors: map($("article [data-testid=BylineName] a"), (link) => ({
      name: link.text(),
      url: link.attr("href")!,
    })),
  };
}

function parseClassic($: CheerioAPI, url: string): FeedItem {
  const title = $('[style="font-size: 28px; color: #000000;"]');
  return {
    id: url,
    url,
    external_url: title.attr("href")!,
    title: title.text(),
    content_html: `
      <p>
        <strong>${$('[style*="color: #df3331"]').first().text()}</strong>:
        ${$('[style="text-decoration: none; color: #999999;"]').first().text()}
      </p>
      ${$('[style*="color:#121212;"] > [style*="font-size: 18px;"]').text()}
    `,
    author: {
      name: $('strong>[style="font-size: 13px; mso-ansi-font-size: 14px;"]')
        .first()
        .html()!
        .replace(/^By /, ""),
    },
  };
}

module.exports = createFeed({
  title: "The New Yorker",
  home_page_url: "https://www.newyorker.com/",
  icon: "https://media.newyorker.com/photos/59096d7d6552fa0be682ff8f/master/eustace-400.png",
  items: scrapeItems(
    "https://www.kill-the-newsletter.com/feeds/yof6oolwi1ssoj74co8r.xml",
    { xml: true, selector: "entry", limit: 10 },
    async (issue) => {
      const title = issue.children("title").text();
      if (title.includes("This Week's Featured City")) return [];

      const $ = cheerio.load(issue.children("content[type=html]").text());
      if (!$('[alt="THE NEW YORKER CLASSICS NEWSLETTER"]').empty()) {
        return parseClassic($, issue.find("link").attr("href")!);
      }
      const $articles = $(".article").filter(
        (_, el) =>
          !exclusions.includes($(el).find(".rubric").text()) &&
          $(el).parents('[style*="display: none"],[style*="display:none"]')
            .length === 0
      );
      const articles = map($articles, async (article) => {
        const summary = article.find(".dek").text();
        const image = article
          .find("img")
          .attr("src")!
          .replace(/\d+:\d+\/w_\d+(,|%2c)c_limit/i, "w_500");
        const content_html = `<p><strong>${article
          .find(".rubric")
          .text()}</strong>: <em>${summary}</em></p><img width=500 src="${image}" />`;
        return Object.assign(
          {
            title: article.find(".hed").text(),
            summary,
            image,
            content_html,
          },
          await parseArticle(article).catch((err) =>
            Object.assign(makeError(err), {
              title: `[ERROR SCRAPING] ${article.find(".hed").text()}`,
              external_url: article.attr("href")!,
              url: issue.find("link").attr("href")!,
              content_html: content_html + makeError(err).content_html,
            })
          )
        );
      });
      if (!articles.length) {
        return [
          {
            id: "error::" + issue.children("id").text(),
            url: issue.find("link").attr("href")!,
            content_text: "No articles parsed",
          },
        ];
      }
      return Promise.all(
        articles.map((a, i) =>
          a.catch((err) =>
            Object.assign(makeError(err), {
              title: `[ERROR PARSING] ${$($articles[i]).find(".hed").text()}`,
              external_url: $($articles[i]).attr("href")!,
              url: issue.find("link").attr("href")!,
            })
          )
        )
      );
    }
  ),
});
