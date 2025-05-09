// /Users/carl/Library/Application Support/Claude/maestro/maestro/src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Hämta URL och anon-nyckel från miljövariabler
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Kontrollera att variablerna är satta
if (!supabaseUrl) {
  throw new Error("Supabase URL saknas. Se till att NEXT_PUBLIC_SUPABASE_URL är satt i din .env.local fil.");
}
if (!supabaseAnonKey) {
  throw new Error("Supabase anon-nyckel saknas. Se till att NEXT_PUBLIC_SUPABASE_ANON_KEY är satt i din .env.local fil.");
}

// Skapa och exportera Supabase-klienten
export const supabase = createClient(supabaseUrl, supabaseAnonKey);