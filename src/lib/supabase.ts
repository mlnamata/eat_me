// Supabase inicializace pro pristupy k databazi
import { createClient } from '@supabase/supabase-js';

// Nacteni konfiguracnich promennych
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Kontrola dostupnosti kljuce pri vyvoji
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Upozorneni: Supabase URL nebo Anon Key chybi. Aplikace muze nefungovat spravne.');
}

// Klientska verze - pouziva se na stranu klienta pro cteni dat
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// Admin verze - pouziva se pouze na serveru pro zapis a administraci
export const getSupabaseAdmin = () => {
  if (!supabaseServiceRoleKey) {
    throw new Error('Chyba: SUPABASE_SERVICE_ROLE_KEY chybi - toto ma byt pouzito jen na serveru');
  }
  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey
  );
};

