// di file helperCrawler.ts

import type { CheerioAPI, Element } from "cheerio";

export function extractOfficialLink(
  $: CheerioAPI,
  currentUrl: string,
): string | null {
  const currentHostname = new URL(currentUrl).hostname;
  const prioritizedKeywords = [
    ["website resmi", "official website", "laman resmi"],
    [
      "pendaftaran",
      "daftar di sini",
      "apply here",
      "register now",
      "official link",
    ],
    ["klik di sini", "link berikut", "tautan ini", "unduh di sini"],
  ];
  let foundLink: string | null = null;
  for (const keywordList of prioritizedKeywords) {
    $("a").each((_: number, element: Element) => {
      const linkElement = $(element);
      const linkText = linkElement.text().toLowerCase().trim();
      const linkUrl = linkElement.attr("href");
      if (!linkUrl) {
        return;
      }
      try {
        const absoluteUrl = new URL(linkUrl, currentUrl).href;
        const linkHostname = new URL(absoluteUrl).hostname;
        if (linkHostname.includes(currentHostname)) {
          return;
        }
        for (const keyword of keywordList) {
          if (linkText.includes(keyword)) {
            foundLink = absoluteUrl;
            console.log(
              `✔ Ditemukan link: ${foundLink} (keyword: "${keyword}")`,
            );
            return false;
          }
        }
      } catch (e) {
        // Abaikan URL tidak valid
      }
    });
    if (foundLink) {
      break;
    }
  }
  if (!foundLink) {
    console.log("⚠ Link pendaftaran resmi tidak ditemukan.");
  }
  return foundLink;
}
