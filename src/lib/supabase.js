import { createClient } from "@supabase/supabase-js";

export const SUPABASE_ENABLED = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

console.log("[supabase] URL:", import.meta.env.VITE_SUPABASE_URL, "| KEY starts:", import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 20));

export const supabase = SUPABASE_ENABLED
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  : null;
