// di file helperCrawler.ts

import type { CheerioAPI, Element } from "cheerio";

/**
 * Mengekstrak link pendaftaran resmi dari halaman yang di-parse oleh Cheerio.
 * @param {CheerioAPI} $ - Instance Cheerio dari halaman tersebut.
 * @param {string} currentUrl - URL halaman yang sedang di-crawl.
 * @returns {string | null} URL pendaftaran resmi atau null jika tidak ditemukan.
 */
export function extractOfficialLink(
  $: CheerioAPI,
  currentUrl: string,
): string | null {
  // 1. Dapatkan hostname dari URL saat ini untuk filter link internal.
  // Kita tidak bisa pakai 'window.location', jadi kita pakai URL dari request.
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

  // Variabel untuk menyimpan link yang kita temukan.
  let foundLink: string | null = null;

  // 2. Iterasi melalui setiap tingkat prioritas keyword.
  for (const keywordList of prioritizedKeywords) {
    // 3. Cari semua link <a> di dalam dokumen.
    $("a").each((index: number, element: Element) => {
      const linkElement = $(element);
      const linkText = linkElement.text().toLowerCase().trim();

      // Ambil href menggunakan .attr(), bukan .href
      const linkUrl = linkElement.attr("href");

      if (!linkUrl) {
        return; // Lanjut ke link berikutnya jika tidak ada href
      }

      try {
        // Gabungkan URL relatif (misal: /pendaftaran) dengan URL basis
        const absoluteUrl = new URL(linkUrl, currentUrl).href;
        const linkHostname = new URL(absoluteUrl).hostname;

        // 4. Cek apakah link ini eksternal
        if (linkHostname.includes(currentHostname)) {
          return; // Skip jika ini link internal
        }

        // 5. Cek apakah teks link mengandung keyword
        for (const keyword of keywordList) {
          if (linkText.includes(keyword)) {
            foundLink = absoluteUrl;
            console.log(
              `✔ Ditemukan link: ${foundLink} (keyword: "${keyword}")`,
            );
            return false; // Hentikan loop .each() karena kita sudah menemukan link
          }
        }
      } catch (e) {
        // URL tidak valid, abaikan dan lanjut
      }
    });

    // Jika kita sudah menemukan link di level prioritas ini, hentikan pencarian lebih lanjut.
    if (foundLink) {
      break;
    }
  }

  if (!foundLink) {
    console.log("⚠ Link pendaftaran resmi tidak ditemukan.");
  }

  return foundLink;
}
