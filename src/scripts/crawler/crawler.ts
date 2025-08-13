// Di file: src/scripts/crawler/crawler.ts

import { PlaywrightCrawler } from "crawlee";
import { ScraperConfig } from "../config.js";
import { BeasiswaInfo } from "../../lib/constant.js";
import { extractOfficialLink } from "../Helper/helperCrawler.js";
import { supabase } from "../../lib/supabaseClient.js"; // <-- IMPORT BARU

export function createBeasiswaCrawler(config: ScraperConfig) {
  return new PlaywrightCrawler({
    maxRequestsPerCrawl: config.maxRequestsPerCrawl ?? 300,
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
          deskripsi: [
            $("div[style*='text-align: justify']").first().text().trim(),
          ],
          sumber: config.sourceName,
          link_pendaftaran: extractOfficialLink($, request.url),
          deadline: null,
          persyaratan: [],
          benefit: [],
          kampus: [],
        };

        const specificData = config.extractData($);
        Object.assign(info, specificData);

        // Cek jika data esensial ada sebelum menyimpan
        if (info.persyaratan.length > 0 || info.benefit.length > 0) {
          // --- BLOK PENYIMPANAN BARU KE SUPABASE ---
          console.log(
            `[${config.sourceName}] 💾 Menyiapkan data untuk ${info.judul.substring(0, 30)}...`,
          );

          // Kita gunakan 'upsert'. Ini akan INSERT jika data baru, atau UPDATE jika URL sudah ada.
          // Ini sangat efisien untuk mencegah duplikat!
          const { data, error } = await supabase
            .from("beasiswa") // Nama tabel Anda
            .upsert(
              {
                // Mapping dari objek 'info' ke kolom tabel Anda
                url: info.url,
                judul: info.judul,
                link_pendaftaran: info.link_pendaftaran,
                deadline: info.deadline,
                tags: info.tags,
                deskripsi: info.deskripsi,
                persyaratan: info.persyaratan,
                benefit: info.benefit,
                kampus: info.kampus,
                // 'created_at' & 'judul_deskripsi_fts' akan diurus oleh Postgres
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
