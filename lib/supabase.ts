import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Sin variables de entorno el panel funciona en modo demo (simulador local). */
export const supabase: SupabaseClient | null = url && clave ? createClient(url, clave) : null;
