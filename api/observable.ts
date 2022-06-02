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
    node.value.match(/^\n*<figure( style="max-width:\d+px[^"]*")?>/)
  ) {
    return {
      figure: true,
      html: node.value
        .replace(
          /\$\{(?:await )+visibility\(\)\.then\(\(\) => ([\s\S]+?)\)\}/gm,
          "$1"
        )
        .replace(
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
          .replace(
            /\$\{(?:await )+visibility\(\)\.then\(\(\) => ([\s\S]+?)\)\}/gm,
            "$1"
          )
          .replace(/\$\{\s*svg\s*`([\s\S]+?)`\s*\}/gm, "$1")
          .replace(
            /\(\$\{await FileAttachment\(\s*"([^"]+)"\s*\)\.url\(\)\}\)/,
            (_, name) => `(${notebook.files.find((f) => f.name === name)!.url})`
          )
          .replace(
            /("?)\$\{await FileAttachment\(\s*"([^"]+)"\s*\)\.url\(\)\}\1/,
            (_, quote, name) =>
              '"' + notebook.files.find((f) => f.name === name)!.url + '"'
          )
          .replace(
            /\$\{await FileAttachment\(\s*"([^"]+)"\s*\)\.image\((\{[^}]+\})?\)\}/,
            (_, name, optsStr) => {
              const opts = eval(optsStr);
              return `<img src="${
                notebook.files.find((f) => f.name === name)!.url
              }" ${opts.width ? `width="${opts.width}"` : ""} ${
                opts.height ? `height="${opts.height}"` : ""
              } ${
                opts.style
                  ? `style="max-width: 640px; ${opts.style}"`
                  : 'style="max-width: 640px"'
              } />`;
            }
          )
          .replace(
            /(<p style="background: #fffced; box-sizing: border-box; padding: 10px 20px;">)(.+?)<\/p>/,
            (_, tag, content) => `${tag}${marked.parseInline(content)}</p>`
          )
          .replace(/\$\{buttons\(("[^"]+")\)\}/g, (_, arg) =>
            buttons(JSON.parse(arg))
          )
          .replace(/<br>\n([^\n])/, "<br>\n\n$1")
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
          .slice(1, -3)
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

// from https://observablehq.com/@observablehq/keys

const buttons = (() => {
  const shortwords = {
    Alt: "⌥opt",
    Tab: "⇥tab",
    Up: "↑",
    Down: "↓",
    Left: "←",
    Right: "→",
    Mod: "⌘cmd",
    Cmd: "⌘cmd",
    Ctrl: "⌃ctrl",
    Shift: "⇧shift",
    Enter: "↩︎return",
    Backspace: "⌫delete",
    Escape: "⎋esc",
  };
  const order = {
    Ctrl: -4,
    Alt: -3,
    Shift: -2,
    Mod: -1,
    Cmd: -1,
  };

  function remap(keyset: string, map = shortwords) {
    const keys = keyset.split("-");
    return keys
      .slice()
      .sort(
        (a, b) =>
          (order[a as keyof typeof order] || keys.indexOf(a)) -
          (order[b as keyof typeof order] || keys.indexOf(b))
      )
      .map((key) => (map && map[key as keyof typeof order]) || key);
  }

  return function buttons(keyset: string) {
    return remap(keyset)
      .map(
        (key) =>
          `<span style="font: 500 12px var(--sans-serif); margin: 0 4px; padding: 0 4px; border-radius: 0.25rem; box-shadow: 0 0 0 1px #dedede, 1px 1px 0 1px #e8e8e8;">${key.toLowerCase()}</span>`
      )
      .join("");
  };
})();
