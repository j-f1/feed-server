import cheerio = require("cheerio");
import fetch from "node-fetch";
import sub from "date-fns/sub";
import dateParser from "date-fns/parse";
import { startOfToday } from "date-fns";
import { format as prettier } from "prettier";

export type Cheerio = ReturnType<typeof cheerio>;
export type Awaitable<T> = T | PromiseLike<T>;
export type $ = ReturnType<typeof cheerio.load>;
import { JSONFeed, FeedItem } from "./json-feed";
import { VercelRequest, VercelResponse } from "@vercel/node";

declare global {
  const URL: typeof import("url").URL;
  type URL = import("url").URL;
}

export function parseDate(date: string, format: string): string {
  return dateParser(date, format, startOfToday()).toISOString();
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
    } catch (error) {
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

export function map<T>(
  selection: Cheerio,
  mapper: (el: Cheerio, i: number) => T | readonly T[],
  limit?: number
) {
  const array = selection.toArray();
  return (limit ? array.slice(0, limit) : array).flatMap((el, i) =>
    mapper(cheerio(el), i)
  );
}

map.await = <T>(
  selection: Cheerio,
  mapper: (el: Cheerio, i: number) => Promise<T | readonly T[]>,
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
  options?: Parameters<typeof cheerio.load>[1]
) {
  return fetch(url)
    .then((res) => res.text())
    .then((text) => cheerio.load(text, options));
}

export function scrapeItems(
  url: string | URL,
  {
    xml = false,
    selector,
    limit,
  }: {
    xml?: boolean;
    selector: (($: $) => Cheerio) | string;
    limit?: number;
  },
  mapper: (item: Cheerio, $: $) => Awaitable<FeedItem | readonly FeedItem[]>
) {
  return () =>
    scrape(url, { xml })
      .then(($) =>
        map.await(
          typeof selector == "function" ? selector($) : $(selector),
          async (item) => {
            try {
              return await mapper(item, $);
            } catch (err) {
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
