import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Kontrola jen pro vývoj, aby tě to trklo, kdyby něco chybělo
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL nebo Anon Key chybí. Aplikace možná nebude fungovat správně.');
}

// Klientská verze (pro čtení) - vždy dostupná
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// Admin verze (pro zápis - jen na serveru v API routes)
export const getSupabaseAdmin = () => {
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY - this should only be used on server side');
  }
  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey
  );
};
