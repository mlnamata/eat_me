// Auto-generated Supabase types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          domain: string;
          full_url: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          domain: string;
          full_url: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          domain?: string;
          full_url?: string;
          name?: string;
          created_at?: string;
        };
      };
      daily_menus: {
        Row: {
          id: string;
          restaurant_id: string;
          week_start: string;
          data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          week_start: string;
          data: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          week_start?: string;
          data?: Json;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
