import cheerio = require("cheerio");
import fetch from "node-fetch";
import sub from "date-fns/sub";

export type Cheerio = ReturnType<typeof cheerio>;
import { JSONFeed, FeedItem } from "./json-feed";
import { VercelRequest, VercelResponse } from "@vercel/node";

export function createFeed({
  items: getItems,
  ...props
}: Omit<JSONFeed, "items" | "version"> & { items: () => Promise<FeedItem[]> }) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const feed = { feed_url: req.url, ...props };
    try {
      const items = await getItems();
      sendFeed(res, { ...feed, items });
    } catch (error) {
      sendFeed(res, {
        ...feed,
        items: [
          {
            id: "error",
            title: `Error in ${props.title}`,
            summary: String(error),
            date_published: new Date().toISOString(),
            content_html: `<pre>${error.stack
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")}</pre>`,
          },
        ],
      });
    }
  };
}

export function makeMidnight(date: Date) {
  return sub(date, { minutes: new Date().getTimezoneOffset() });
}

export function map<T>(
  selection: Cheerio,
  mapper: (el: Cheerio, i: number) => T,
  limit?: number
) {
  const array = selection.toArray();
  return (limit ? array.slice(0, limit) : array).map((el, i) =>
    mapper(cheerio(el), i)
  );
}

map.await = <T>(
  selection: Cheerio,
  mapper: (el: Cheerio, i: number) => Promise<T>,
  limit?: number
) => Promise.all(map(selection, mapper, limit));

const isDev = process.env.NODE_ENV === "development";

const host = isDev ? "http://localhost:3000/" : "https://feeds.jedfox.com/";

const staticURL = new URL("/static/", host);
export function staticFile(name: string) {
  return new URL(name, staticURL).toString();
}

export function scrape(
  url: string | URL,
  options: Parameters<typeof cheerio.load>[1] = undefined
) {
  return fetch(url)
    .then((res) => res.text())
    .then((text) => cheerio.load(text, options));
}

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
    // cache for 10 minutes
    res.setHeader("cache-control", `max-age=${10 * 60}, public`);
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
