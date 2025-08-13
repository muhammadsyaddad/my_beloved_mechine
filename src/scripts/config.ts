// Di file: src/scripts/config.ts

import type { CheerioAPI } from "cheerio";
import { BeasiswaInfo } from "../lib/constant.js";

export interface ScraperConfig {
  sourceName: string;
  url: string;
  globs: string[];
  contentSelector: string;
  titleSelector: string;
  tagsSelector: string;
  maxRequestsPerCrawl?: number;
  extractData: ($: CheerioAPI) => Partial<BeasiswaInfo>;
}

export const indbeasiswaConfig: ScraperConfig = {
  sourceName: "indbeasiswa",
  url: "https://indbeasiswa.com/beasiswa-unggulan/",
  globs: ["**/beasiswa-*"],
  maxRequestsPerCrawl: 100,
  contentSelector: ".entry-content",
  titleSelector: "h1.post-title",
  tagsSelector: "span.post-category a",
  extractData: ($) => {
    const content = $(".entry-content");
    const info: Partial<BeasiswaInfo> = {
      persyaratan: [],
      benefit: [],
      kampus: [],
      link_pendaftaran: null,
      deadline: null,
    };

    const linkKeywords = [
      "info pendaftaran",
      "official website",
      "situs resmi",
      "laman resmi",
      "pendaftaran online",
      "informasi selengkapnya",
    ];
    content.find("b, strong").each((_, element) => {
      const boldText = $(element).text().toLowerCase().trim();
      for (const keyword of linkKeywords) {
        if (boldText.startsWith(keyword)) {
          const linkElement = $(element).nextAll("a").first();
          if (linkElement.length > 0) {
            const url = linkElement.attr("href");
            if (url) {
              info.link_pendaftaran = url;
              return false;
            }
          }
        }
      }
    });

    const stopSelector = "h2, h3, #post-related, .social";
    content.find("h2, h3").each((_, heading) => {
      const headingText = $(heading).text().trim().toLowerCase();
      const sectionContent = $(heading).nextUntil(stopSelector);
      const items = sectionContent
        .find("li")
        .map((_, li) => $(li).text().trim())
        .get();
      if (/persyaratan|kriteria|berkas/.test(headingText))
        info.persyaratan?.push(...items);
      if (/cakupan|benefit|fasilitas/.test(headingText))
        info.benefit?.push(...items);
      if (/kampus mitra/.test(headingText)) info.kampus?.push(...items);
      if (/deadline|batas akhir|pendaftaran/.test(headingText)) {
        const match = $(heading)
          .text()
          .match(/:\s*(.*)/);
        if (match && match[1]) {
          info.deadline = match[1].trim();
        }
      }
    });

    if (!info.deadline) {
      const judul = $("h1.post-title").text();
      const deadlineMatch = judul.match(/\(Deadline:\s*(.*?)\)/i);
      if (deadlineMatch && deadlineMatch[1]) {
        info.deadline = deadlineMatch[1].trim();
      }
    }
    return info;
  },
};

export const beasiswakitaConfig: ScraperConfig = {
  sourceName: "beasiswakita",
  url: "https://www.beasiswakita.com/",
  maxRequestsPerCrawl: 100,
  globs: ["https://www.beasiswakita.com/20*/*/*.html"],
  contentSelector: ".post-body.entry-content",
  titleSelector: "h3.post-title.entry-title",
  tagsSelector: ".breadcrumb-bwrap a[rel='tag']",
  extractData: ($) => {
    const info: Partial<BeasiswaInfo> = {
      persyaratan: [],
      benefit: [],
      deadline: null,
    };
    const content = $(".post-body.entry-content");
    content.find("h2, h3, b").each((_, heading) => {
      const headingText = $(heading).text().trim().toLowerCase();
      const itemsList = $(heading)
        .next("ul")
        .find("li")
        .map((_, li) => $(li).text().trim())
        .get();
      if (itemsList.length > 0) {
        if (/persyaratan|kriteria|berkas/.test(headingText)) {
          info.persyaratan?.push(...itemsList);
        }
        if (/cakupan|benefit|fasilitas|keuntungan/.test(headingText)) {
          info.benefit?.push(...itemsList);
        }
      }
      if (/deadline|batas akhir|pendaftaran/.test(headingText)) {
        const match = $(heading)
          .text()
          .match(/:\s*(.*)/);
        if (match && match[1]) {
          info.deadline = match[1].trim();
        }
      }
    });
    return info;
  },
};
