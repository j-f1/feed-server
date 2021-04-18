// https://jsonfeed.org/version/1.1

declare global {
  const URL: typeof import("url").URL;
}

export interface JSONFeed {
  version:
    | "https://jsonfeed.org/version/1.1"
    | "https://jsonfeed.org/version/1";
  title: string;
  home_page_url?: string; // strongly recommended
  feed_url?: string; // strongly recommended
  description?: string;
  next_url?: string;
  icon?: string;
  favicon?: string;
  authors?: FeedAuthor[];
  /** @deprecated */ author?: FeedAuthor;
  language?: string;
  expired?: boolean;
  hubs?: { type: string; url: string }[]; // very optional
  items: FeedItem[];
}

export interface FeedAuthor {
  name?: string;
  url?: string;
  avatar?: string;
}

export type FeedItem = {
  id: string;
  url?: string;
  external_url?: string; // very optional
  title?: string;
  summary?: string;
  image?: string;
  banner_image?: string;
  date_published?: string; // RFC 3339 format
  date_modified?: string; // RFC 3339 format
  authors?: FeedAuthor[];
  author?: FeedAuthor;
  tags?: string[];
  language?: string;
  attachments?: FeedAttachment[];
} & ({ content_html: string } | { content_text: string });

export interface FeedAttachment {
  url: string;
  mime_type: string;
  title?: string;
  size_in_bytes?: number;
  duration_in_seconds?: number;
}
