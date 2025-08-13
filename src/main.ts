import { createBeasiswaCrawler } from "./scripts/crawler/crawler.js";
import { indbeasiswaConfig, beasiswakitaConfig } from "./scripts/config.js";
async function main() {
  // console.log("🚀 Memulai crawler untuk indbeasiswa.com...");
  // const crawler1 = createBeasiswaCrawler(indbeasiswaConfig);
  // await crawler1.run([indbeasiswaConfig.url]);
  // console.log("✅ Crawler indbeasiswa.com selesai.");

  console.log("\n🚀 Memulai crawler untuk beasiswakita.com...");
  const crawler2 = createBeasiswaCrawler(beasiswakitaConfig);
  await crawler2.run([beasiswakitaConfig.url]);
  console.log("✅ Crawler beasiswakita.com selesai.");
}

main();
