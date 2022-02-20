import fetch from "node-fetch";
import { FeedItem } from "../src/json-feed";
import { createFeed, parseDate, escape } from "../src/util";
import { format as prettier } from "prettier";
import marked = require("marked");

const url = "https://observablehq.com/@observablehq/observable-release-notes";

function makeError<T extends Node>(node: T): FeedItem {
  return {
    id: String(node.id),
    title: "Error parsing feed item",
    content_html: `<pre>${escape(
      prettier(JSON.stringify(node), {
        parser: "json5",
      })
    )}</pre><hr><pre>${escape(node.value)}</pre>`,
    content: node,
  } as any;
}

interface Figure {
  figure: true;
  html: string;
}

function isReduce(v: FeedItem | Figure): v is Figure {
  return (v as any).figure;
}

function parseNode(
  node: Node,
  notebook: Notebook,
  hash: string = "",
  orig: Node = node
): FeedItem | Figure {
  if (node.mode === "js") {
    const match = node.value.match(/^(?:(\w+) = )?(md|html) ?`([\s\S]+)`\s*$/m);
    if (match) {
      return parseNode(
        { ...node, mode: match[2], value: match[3] },
        notebook,
        match[1],
        node
      );
    } else {
      return makeError({ ...node, message: "stripJS" });
    }
  } else if (
    (node.mode === "html" || node.mode == "md") &&
    node.value.match(/^\n*<figure( style="max-width:\d+px")?>/)
  ) {
    return {
      figure: true,
      html: node.value.replace(
        /\$\{await FileAttachment\(\s*"([^"]+)"\s*\)\.url\(\)\}/,
        (_, name) => `"${notebook.files.find((f) => f.name === name)!.url}"`
      ),
    };
  } else if (node.mode === "md") {
    const match = node.value.match(
      /^\n*(?:---\n*)?<span class="date">(?<date>[^<]+)<\/span>\s*### (?<title>[^\n]+)\n*(<br>\n*)?(?<content>[\s\S]+)$/m
    );
    if (!match || !match.groups) return makeError({ ...node, orig, match });
    let date: string;
    try {
      date = parseDate(match.groups.date, "MMMM d, yyyy");
    } catch {
      date = parseDate(match.groups.date, "MMMM do, yyyy");
    }
    return {
      id: String(node.id),
      url: hash ? url + "#" + hash : url,
      title: match.groups.title,
      date_published: date,
      content_html: marked(
        match.groups.content
          .replace(/\$\{svg\s*`([\s\S]+?)l`\}/gm, "$1")
          .replace(
            /\(\$\{await FileAttachment\(\s*"([^"]+)"\s*\)\.url\(\)\}\)/,
            (_, name) => `(${notebook.files.find((f) => f.name === name)!.url})`
          )
          .replace(
            /\$\{await FileAttachment\(\s*"([^"]+)"\s*\)\.url\(\)\}/,
            (_, name) => `"${notebook.files.find((f) => f.name === name)!.url}"`
          )
          .replace(
            /(<p style="background: #fffced; box-sizing: border-box; padding: 10px 20px;">)(.+?)<\/p>/,
            (_, tag, content) => `${tag}${marked.parseInline(content)}</p>`
          )
      ),
    };
  }

  return makeError(node);
}

module.exports = createFeed({
  title: "Observable Release Notes",
  home_page_url: url,
  description: "What’s New on Observable?",
  icon: "https://avatars2.githubusercontent.com/u/30080011?v=4&s=512",
  favicon: "https://avatars2.githubusercontent.com/u/30080011?v=4&s=64",
  language: "en-US",
  items: () =>
    fetch(
      "https://api.observablehq.com/document/@observablehq/observable-release-notes"
    )
      .then((res) => res.json())
      .then((notebook: Notebook) => {
        const parsed = notebook.nodes
          .slice(1, -1)
          .filter((n) => n.value.replace(" ", "") !== "md`---`")
          .map((node) => parseNode(node, notebook));
        const result = parsed.slice(1).reduce<[readonly FeedItem[], FeedItem]>(
          ([nodes, next], arg) => {
            if (isReduce(arg)) {
              (next as any).content_html += arg.html;
              return [nodes, next];
            } else {
              return [nodes.concat(next), arg];
            }
          },
          [[], parsed[0] as FeedItem]
        );
        return result[0].concat(result[1]);
      }),
});

interface Notebook {
  /* some elements elided */
  files: Array<{
    /* some elements elided */
    url: string;
    name: string;
  }>;
  nodes: Array<Node>;
}

interface Node {
  id: number;
  value: string;
  pinned: boolean;
  mode: string;
}
