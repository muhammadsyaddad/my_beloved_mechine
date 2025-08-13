// Di file: src/lib/supabaseClient.ts

import { createClient } from "@supabase/supabase-js";
import "dotenv/config"; // Memuat variabel dari .env

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be defined in .env file");
}

// Buat satu instance client dan ekspor untuk digunakan di bagian lain aplikasi
export const supabase = createClient(supabaseUrl, supabaseKey);
