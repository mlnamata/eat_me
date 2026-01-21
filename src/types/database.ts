// Database types for Supabase

export interface Restaurant {
  id: string; // uuid
  domain: string; // e.g., "sladovnicka.cz"
  full_url: string;
  name: string;
  created_at: string; // timestamp
}

export interface DailyMenu {
  id: string; // uuid
  restaurant_id: string; // uuid (FK)
  week_start: string; // date (Monday of the week)
  data: MenuData;
  created_at: string; // timestamp
  restaurants?: Restaurant; // Optional nested restaurant data from JOIN
}

export interface MenuData {
  poledni_nabidka: DayMenu[];
}

export interface DayMenu {
  den: string; // e.g., "Pondělí"
  polevky: string[];
  hlavni_chody: MainDish[];
}

export interface MainDish {
  cislo: number;
  nazev: string;
  popis: string;
  cena_bez_polevky: number;
  cena_s_polevkou: number;
}

// API Response Types
export interface AddRestaurantResponse {
  success: boolean;
  restaurantId?: string;
  error?: string;
}

export interface MenusResponse {
  success: boolean;
  menus?: DailyMenu[];
  error?: string;
}
