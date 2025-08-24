// Di file: src/scripts/crawler/crawler.ts
import { promises as fs } from "fs";
import path from "path";
import { PlaywrightCrawler } from "crawlee";
import type { CheerioAPI } from "cheerio";
import { ScraperConfig } from "../config.js";
import { BeasiswaInfo } from "../../lib/constant.js";
import { extractOfficialLink } from "../Helper/helperCrawler.js";
import { supabase } from "../../lib/supabaseClient.js";

function sanitizeFilename(title: string): string {
  // 1. Ganti spasi dan karakter non-alfanumerik dengan strip (-)
  // 2. Hapus karakter strip berlebihan
  // 3. Batasi panjangnya agar tidak terlalu panjang
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Hapus semua selain huruf, angka, spasi, strip
    .replace(/\s+/g, "-") // Ganti spasi dengan strip
    .replace(/-+/g, "-") // Ganti strip berurutan menjadi satu
    .substring(0, 75); // Batasi panjangnya
  return sanitized || "tanpa-judul"; // Fallback jika judul kosong
}

export function createBeasiswaCrawler(config: ScraperConfig) {
  return new PlaywrightCrawler({
    maxRequestsPerCrawl: config.maxRequestsPerCrawl ?? 100,
    async requestHandler({ page, parseWithCheerio, request, enqueueLinks }) {
      try {
        console.log(`[${config.sourceName}] 🤖 Mengunjungi: ${request.url}`);
        await page.waitForSelector(config.contentSelector, { timeout: 15000 });

        const $ = await parseWithCheerio();

        // Proses ekstraksi data (tetap sama)
        const info: BeasiswaInfo = {
          url: request.url,
          judul: $(config.titleSelector).text().trim(),
          tags: $(config.tagsSelector)
            .map((_, el) => $(el).text().trim())
            .get(),
          deskripsi: $(config.contentSelector)
            .find("p")
            .first() // Ambil hanya paragraf pertama sebagai deskripsi utama
            .text()
            .replace("INDBeasiswa.com –", "")
            .trim()
            .split("\n"), // Memastikan hasilnya tetap array of string

          sumber: config.sourceName,
          link_pendaftaran: extractOfficialLink($ as CheerioAPI, request.url),
          deadline: null,
          persyaratan: [],
          benefit: [],
          kampus: [],
        };

        const specificData = config.extractData($ as CheerioAPI);
        Object.assign(info, specificData);

        // Cek jika data esensial ada sebelum menyimpan
        if (info.persyaratan.length > 0 || info.benefit.length > 0) {
          // --- BLOK PENYIMPANAN BARU KE SUPABASE ---
          if (process.env.NODE_ENV === "production") {
            console.log(
              `[${config.sourceName}] 💾 Menyiapkan data untuk ${info.judul.substring(0, 30)}...`,
            );

            // Kita gunakan 'upsert'. Ini akan INSERT jika data baru, atau UPDATE jika URL sudah ada.
            // Ini sangat efisien untuk mencegah duplikat!
            const { data: _, error } = await supabase
              .from("beasiswa") // Nama tabel Anda
              .upsert(
                {
                  url: info.url,
                  judul: info.judul,
                  link_pendaftaran: info.link_pendaftaran,
                  deadline: info.deadline,
                  tags: info.tags,
                  deskripsi: info.deskripsi,
                  persyaratan: info.persyaratan,
                  benefit: info.benefit,
                  kampus: info.kampus,
                },
                { onConflict: "url" }, // Jika terjadi konflik pada kolom 'url', lakukan update.
              );

            if (error) {
              console.error(
                `[${config.sourceName}] ❌ Gagal menyimpan ke Supabase: ${error.message}`,
              );
            } else {
              console.log(
                `[${config.sourceName}] ✔️ Data berhasil disimpan/diupdate di Supabase.`,
              );
            }
          } else {
            console.log(
              `[DEV] [${config.sourceName}] Menyimpan data untuk JSON : ${info.judul.substring(0, 30)}...`,
            );
            const fileName = `${sanitizeFilename(info.judul)}.JSON`;
            const outputDir = path.resolve("./storage/beasiswa");
            const outputFile = path.join(outputDir, fileName);

            try {
              await fs.mkdir(outputDir, { recursive: true });
              await fs.writeFile(
                outputFile,
                JSON.stringify(info, null, 2),
                "utf-8",
              );
              console.log(
                `[DEV] [${config.sourceName}] ✔️ Data berhasil disimpan ke ${outputFile}`,
              );
            } catch (writeError: any) {
              console.error(
                `[DEV] [${config.sourceName}] ❌ Gagal menyimpan ke file JSON: ${writeError.message}`,
              );
            }
          }
        } else {
          console.log(
            `⚠ [${config.sourceName}] Tidak cukup informasi di ${request.url}, skip.`,
          );
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(
            `❌ [${config.sourceName}] Gagal di ${request.url}: ${error.message}`,
          );
        }
      }

      await enqueueLinks({ globs: config.globs });
    },
  });
}
