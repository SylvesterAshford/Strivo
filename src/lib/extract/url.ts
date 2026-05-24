import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export interface UrlExtractionResult {
  title: string;
  content: string;
  byline: string | null;
  siteName: string | null;
  publishedTime: string | null;
}

export async function extractUrl(url: string): Promise<UrlExtractionResult> {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; LatticeBot/1.0)",
    },
  });

  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) {
    throw new Error("Readability could not extract article content");
  }

  return {
    title: article.title?.trim() || url,
    content: article.textContent?.trim() || "",
    byline: article.byline?.trim() || null,
    siteName: article.siteName?.trim() || null,
    publishedTime: article.publishedTime || null,
  };
}
