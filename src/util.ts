import cheerio, {
  Cheerio,
  Node,
  CheerioAPI,
  Element,
  SelectorType,
} from "cheerio";
import fetch from "node-fetch";
import sub from "date-fns/sub";
import dateParser from "date-fns/parse";
import { startOfToday } from "date-fns";
import { format as prettier } from "prettier";
export type Awaitable<T> = T | PromiseLike<T>;
import { JSONFeed, FeedItem } from "./json-feed";
import { VercelRequest, VercelResponse } from "@vercel/node";

declare global {
  const URL: typeof import("url").URL;
  type URL = import("url").URL;
}

export function parseDate(date: string, format: string): string {
  try {
    return dateParser(date.trim(), format, startOfToday()).toISOString();
  } catch (e) {
    console.log([date, format]);
    try {
      console.log(dateParser(date, format, startOfToday()));
    } catch {}
    throw e;
  }
}

export function escape(html: string): string {
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Error.stackTraceLimit = 100;

export function makeError(error: Error) {
  return {
    id: "error",
    summary: String(error),
    date_published: new Date().toISOString(),
    content_html: `<pre>${error
      .stack!.replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")}</pre>`,
  };
}

export function createFeed({
  items: getItems,
  ...props
}: Omit<JSONFeed, "items" | "version"> & {
  items: () => Promise<readonly FeedItem[]>;
}) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const feed = { feed_url: req.url, ...props };
    try {
      const items = await getItems();
      sendFeed(res, { ...feed, items });
    } catch (error: any) {
      sendFeed(res, {
        ...feed,
        items: [{ ...makeError(error), title: `Error in ${props.title}` }],
      });
    }
  };
}

export function makeMidnight(date: Date) {
  return sub(date, { minutes: new Date().getTimezoneOffset() });
}

export function map<T extends Node, Result>(
  selection: Cheerio<T>,
  mapper: (el: Cheerio<T>, i: number) => Result | readonly Result[],
  limit?: number
) {
  const array = selection.toArray();
  return (limit ? array.slice(0, limit) : array).flatMap((el, i) =>
    mapper(cheerio(el), i)
  );
}

map.await = <T extends Node, Result>(
  selection: Cheerio<T>,
  mapper: (el: Cheerio<T>, i: number) => Promise<Result | readonly Result[]>,
  limit?: number
) =>
  Promise.all(map(selection, mapper, limit)).then((result) =>
    result.flatMap((x) => x)
  );

const isDev = process.env.NODE_ENV === "development";

const host = isDev ? "http://localhost:3000/" : "https://feeds.jedfox.com/";

const staticURL = new URL("/static/", host);
export function staticFile(name: string) {
  return new URL(name, staticURL).toString();
}

export function scrape(
  url: string | URL,
  options?: Parameters<typeof cheerio.load>[1],
  isDocument = true
) {
  return fetch(url)
    .then((res) => res.text())
    .then((text) => cheerio.load(text, options, isDocument));
}

export function scrapeItems(
  url: string | URL,
  {
    xml = false,
    selector,
    limit,
  }: {
    xml?: boolean;
    selector: (($: CheerioAPI) => Cheerio<Element>) | SelectorType;
    limit?: number;
  },
  mapper: (
    item: Cheerio<Element>,
    $: CheerioAPI
  ) => Awaitable<FeedItem | readonly FeedItem[]>
) {
  return () =>
    scrape(url, { xml })
      .then(($) =>
        map.await(
          typeof selector == "function" ? selector($) : $(selector),
          async (item) => {
            try {
              return await mapper(item, $);
            } catch (err: any) {
              const href = item.find("a").attr("href") || url.toString();
              const errorItem = makeError(err);
              let html;
              try {
                html = prettier(cheerio.html(item), {
                  parser: "html",
                  htmlWhitespaceSensitivity: "ignore",
                });
              } catch {
                try {
                  html = cheerio.html(item);
                } catch {
                  try {
                    html = item.html();
                  } catch {
                    html = require("util").inspect(item[0]);
                  }
                }
              }
              return {
                ...errorItem,
                title: "Error in feed",
                id: href,
                content_html:
                  errorItem.content_html +
                  `<p>HTML content:</p><pre>${escape(html)}</pre>`,
              };
            }
          },
          limit
        )
      )
      .then((items) =>
        items.map((item) => (!item.url ? { url: item.id, ...item } : item))
      );
}

scrapeItems.now = (...args: Parameters<typeof scrapeItems>) =>
  scrapeItems(...args)();

const authorCompat = ({
  author,
  authors,
}: Pick<JSONFeed, "author" | "authors">) => {
  if (!author && !authors) return {};

  const single = author || authors![0];
  const multiple = authors || [author];
  return { author: single, authors: multiple };
};

export function sendFeed(
  res: VercelResponse,
  feed: Omit<import("./json-feed").JSONFeed, "version">
) {
  if (res.req.headers.accept?.includes("text/html")) {
    res.setHeader("Content-Type", "text/html");
    res.status(200).end(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${feed.title}</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/styles/github.min.css">
          <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/highlight.min.js"></script>
        </head>
        <body>
          <pre style="white-space: pre-wrap"><code class="language-json">${escape(
            JSON.stringify(feed, null, 2)
          )}</code></pre>
          <script>
            hljs.highlightAll();
            setTimeout(() => {
              const div = document.createElement("div");
              document.querySelectorAll(".hljs-string").forEach(el => {
                if (el.textContent.includes("\\\\n")) {
                  let prevChild = el;
                  while (prevChild.nodeType !== Node.TEXT_NODE || !prevChild.textContent.includes("\\n")) {
                    prevChild = prevChild.previousSibling;
                  }
                  const indent = prevChild.textContent.split("\\n").pop().length;

                  div.textContent = JSON.parse(el.textContent);
                  const escaped = div.innerHTML;

                  el.innerHTML = \`"""\n<div style="margin-left: \${indent + 4}ch; text-indent: -2ch"><p style="margin: 0">\${escaped.replace(
                    /\\n/g,
                    '\\n<p style="margin: 0">'
                  )}</div>\${" ".repeat(indent)}"""<div style="color: black; font-family: system-ui; white-space: normal; margin-left: \${indent + 4}ch;">\${JSON.parse(el.textContent)}</div>\`;
                }
              });
            }, 30);
          </script>
        </body>
      </html>
    `);
    return;
  }
  res.setHeader("content-type", "application/feed+json; charset=utf-8");
  if (process.env.NODE_ENV === "production") {
    if (feed.items[0].id === "error") {
      res.setHeader("cache-control", "max-age=0, no-store");
    } else {
      // cache for 10 minutes
      res.setHeader("cache-control", `max-age=${10 * 60}, public`);
    }
  }
  res.status(200).end(
    JSON.stringify(
      {
        version: "https://jsonfeed.org/version/1.1",
        language: "en-US",
        ...feed,
        feed_url: feed.feed_url ? new URL(feed.feed_url, host) : feed.feed_url,
        ...authorCompat(feed),
        items:
          feed.items &&
          feed.items.map((item) => ({ ...item, ...authorCompat(item) })),
      },
      undefined,
      isDev ? 2 : undefined
    )
  );
}
