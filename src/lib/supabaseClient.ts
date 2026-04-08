import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigError = isSupabaseConfigured
  ? ""
  : "Faltan variables VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY en Vercel.";

const fallbackUrl = "https://example.supabase.co";
const fallbackAnonKey = "public-anon-key";

if (!isSupabaseConfigured) {
  console.error(supabaseConfigError);
}

export const supabase = createClient(supabaseUrl || fallbackUrl, supabaseAnonKey || fallbackAnonKey);
