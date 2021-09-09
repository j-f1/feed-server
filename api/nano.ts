import { scrape, createFeed, scrapeItems, parseDate } from "../src/util";

function parseLists(input: string) {
  const result: string[] = [];
  let inList = false;
  for (const line of input.split("\n")) {
    if (line.startsWith("• ")) {
      if (!inList) result.push("<ul>");
      inList = true;
      result.push(`<li>${line.slice(2)}`);
    } else if (inList && line.startsWith("  ")) {
      result[result.length - 1] += line.slice(1);
    } else {
      if (inList) result.push("</ul>");
      inList = false;
      result.push(line);
    }
  }
  if (inList) result.push("</ul>");
  return result.join("\n").replace(/\n*(<\/?ul>)\n*/g, "$1");
}

const archiveURL = "https://lists.gnu.org/archive/html/info-nano/";
export default createFeed({
  title: "nano",
  home_page_url: "https://lists.gnu.org/mailman/listinfo/info-nano",
  description: "The GNU nano announcements mailing list",
  favicon: "https://www.nano-editor.org/favicon.ico",
  items: scrapeItems(
    archiveURL,
    { selector: 'a[href$="/index.html"]', limit: 3 },
    (monthLink) => {
      const monthURL = new URL(monthLink.attr("href")!, archiveURL);
      return scrapeItems.now(
        monthURL,
        { selector: "a[href^=msg]" },
        ($threadLink) => {
          const $article = $threadLink.parent();
          const articleURL = new URL(
            $threadLink.attr("href")!,
            monthURL
          ).toString();
          return scrape(articleURL).then(($) => ({
            id: articleURL,
            title: $threadLink
              .text()
              .replace("[Info-nano] ", "")
              .replace("[ANNOUNCE] ", ""),
            date_published: parseDate(
              `${$article.parents("li").children().first().text()} ${$article
                .find("tt")
                .text()}`,
              "MMMM dd, yyyy HH:mm"
            ),
            author: { name: $article.find("i").text() },
            content_html: `<div style="white-space: pre-wrap">${parseLists(
              $("pre").html()!
            ).replace(
              /(^|[^a-z])'(.+?)\b'($|[^a-z])/g,
              "$1<code>$2</code>$3"
            )}</div>`,
          }));
        }
      );
    }
  ),
});
