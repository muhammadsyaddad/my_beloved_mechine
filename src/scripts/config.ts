import * as cheerio from "cheerio";
import { BeasiswaInfo } from "../lib/constant.js"; // Kita akan buat file ini di langkah berikutnya

// Interface untuk mendefinisikan "resep" scraper
export interface ScraperConfig {
  sourceName: string;
  url: string;
  globs: string[];
  contentSelector: string;
  titleSelector: string;
  tagsSelector: string;
  maxRequestsPerCrawl?: number;
  extractData: ($: cheerio.CheerioAPI) => Partial<BeasiswaInfo>;
}

// Konfigurasi untuk situs pertama (indbeasiswa.com)
// Di file: src/scripts/config.ts
// Di file: src/scripts/config.ts

// Di file: src/scripts/config.ts

// Konfigurasi untuk situs pertama (indbeasiswa.com)
export const indbeasiswaConfig: ScraperConfig = {
  sourceName: "indbeasiswa",
  url: "https://indbeasiswa.com/beasiswa-unggulan/",
  globs: ["**/beasiswa-*"],
  maxRequestsPerCrawl: 500,
  contentSelector: ".entry-content",
  titleSelector: "h1.post-title",
  tagsSelector: "span.post-category a",
  extractData: ($) => {
    const content = $(".entry-content");
    const info: Partial<BeasiswaInfo> = {
      persyaratan: [],
      benefit: [],
      kampus: [],
      link_pendaftaran: null, // Mulai dengan null, akan ditimpa jika ditemukan
      deadline: null, // Mulai dengan null, akan ditimpa jika ditemukan
    };

    // --- TAHAP 1: EKSTRAKSI LINK PENDAFTARAN (METODE KONTEKSTUAL) ---
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
        // Kita gunakan .startsWith() agar lebih akurat, misal: "Info Pendaftaran:"
        if (boldText.startsWith(keyword)) {
          // Cari link <a> pertama yang muncul setelah elemen tebal ini
          const linkElement = $(element).nextAll("a").first();
          if (linkElement.length > 0) {
            const url = linkElement.attr("href");
            if (url) {
              info.link_pendaftaran = url;
              return false; // Hentikan loop .each() karena link sudah ditemukan
            }
          }
        }
      }
    });

    // --- TAHAP 2: EKSTRAKSI DATA DARI HEADING (H2, H3) ---
    const stopSelector = "h2, h3, #post-related, .social";
    content.find("h2, h3").each((_, heading) => {
      const headingText = $(heading).text().trim().toLowerCase();
      const sectionContent = $(heading).nextUntil(stopSelector);

      // Ekstrak list untuk persyaratan, benefit, dll.
      const items = sectionContent
        .find("li")
        .map((_, li) => $(li).text().trim())
        .get();
      if (/persyaratan|kriteria|berkas/.test(headingText))
        info.persyaratan?.push(...items);
      if (/cakupan|benefit|fasilitas/.test(headingText))
        info.benefit?.push(...items);
      if (/kampus mitra/.test(headingText)) info.kampus?.push(...items);

      // Cari deadline dari dalam konten (Prioritas 1)
      if (/deadline|batas akhir|pendaftaran/.test(headingText)) {
        // Mencocokkan format "Kata Kunci: Tanggal"
        const match = $(heading)
          .text()
          .match(/:\s*(.*)/);
        if (match && match[1]) {
          info.deadline = match[1].trim();
        }
      }
    });

    // --- TAHAP 3: FALLBACK UNTUK MENCARI DEADLINE DARI JUDUL ---
    // Ini hanya berjalan jika `info.deadline` masih null setelah Tahap 2
    if (!info.deadline) {
      const judul = $("h1.post-title").text();
      // Regex untuk mencari "(Deadline: TANGGAL)" di dalam judul
      const deadlineMatch = judul.match(/\(Deadline:\s*(.*?)\)/i);
      if (deadlineMatch && deadlineMatch[1]) {
        info.deadline = deadlineMatch[1].trim();
      }
    }

    // Kembalikan semua data yang berhasil diekstrak
    return info;
  },
};
// Konfigurasi untuk situs KEDUA (beasiswakita.com)
export const beasiswakitaConfig: ScraperConfig = {
  sourceName: "beasiswakita",
  url: "https://www.beasiswakita.com/",
  maxRequestsPerCrawl: 300,
  // 1. Pola URL dibuat lebih spesifik
  // Ini hanya akan cocok dengan URL artikel beasiswa berdasarkan pola tahun/bulan.
  globs: ["https://www.beasiswakita.com/20*/*/*.html"],

  contentSelector: ".post-body.entry-content",
  titleSelector: "h3.post-title.entry-title",
  tagsSelector: ".breadcrumb-bwrap a[rel='tag']",

  extractData: ($) => {
    const info: Partial<BeasiswaInfo> = {
      persyaratan: [],
      benefit: [], // Tambahkan benefit agar konsisten
      deadline: null,
    };

    const content = $(".post-body.entry-content");

    // 2. Logika ekstraksi yang lebih kuat dan terfokus
    // Kita cari heading (h2, h3, b), lalu ambil list (ul) setelahnya.
    content.find("h2, h3, b").each((_, heading) => {
      const headingText = $(heading).text().trim().toLowerCase();

      // Cari list <ul> yang merupakan "saudara" langsung setelah heading
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

      // 3. Logika deadline yang lebih spesifik
      // Hanya cari deadline jika teks heading mengandung kata "deadline" atau "batas"
      if (/deadline|batas akhir|pendaftaran/.test(headingText)) {
        // Mencocokkan format "Kata Kunci: Tanggal"
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
