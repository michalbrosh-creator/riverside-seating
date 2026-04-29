import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.replace(/\s/g, "");

export const SUPABASE_ENABLED = !!(url && key);

export const supabase = SUPABASE_ENABLED ? createClient(url, key) : null;
