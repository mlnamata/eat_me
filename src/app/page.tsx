"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Cookies from "js-cookie";
import MenuCard from "@/components/MenuCard";
import RestaurantManager from "@/components/RestaurantManager";
import { Utensils, RefreshCw, Info } from "lucide-react";
import Image from "next/image";

export default function Home() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Načteme oblíbené z cookies
    const cookieData = Cookies.get("my_restaurants");
    const myIds: string[] = cookieData ? JSON.parse(cookieData) : [];

    // 2. Sestavíme dotaz do DB
    let query = supabase
      .from("daily_menus")
      .select(`
        *,
        restaurants (id, name, full_url)
      `)
      .order("created_at", { ascending: false });

    // Pokud nemáme žádné oblíbené, stáhni vše (nebo nic, záleží na logice, dáme vše pro start)
    // Ale správná logika Dashboardu je: Pokud mám cookies, ukaž jen ty. 
    if (myIds.length > 0) {
      query = query.in("restaurant_id", myIds);
    } else {
        // Fallback: Když uživatel nemá vybráno nic, nic nezobrazíme a vyzveme ho k výběru
        setMenus([]);
        setLoading(false);
        return;
    }

    const { data, error } = await query;

    if (error) {
      console.error("Chyba DB:", error);
    } else {
      setMenus(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Hlavička */}
      <div className="max-w-4xl mx-auto text-center mb-8 mt-4">
        <div className="flex items-center justify-center gap-4 mb-3">
          <Image 
            src="/eatme_logo.png" 
            alt="Eat Me Logo" 
            width={200} 
            height={200}
            className="w-40 h-40 md:w-52 md:h-52 object-contain"
            priority
          />
        </div>

        <p className="text-gray-500">Tvůj osobní přehled poledních menu</p>
      </div>

      {/* Sekce pro ovládání */}
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Všechno je teď v tomto jednom tlačítku: */}
        <RestaurantManager onUpdate={fetchData} />

      </div>

      {/* 3. Výpis Menu - TADY JE ZMĚNA PRO 2 KARTY VEDLE SEBE */}
      <div className="max-w-6xl mx-auto mt-8">
        <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-xl font-bold text-gray-800">Moje menu ({menus.length})</h2>
            <button type="button" onClick={fetchData} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 text-gray-600 transition-all" title="Obnovit menu">
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
        </div>

        {loading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (<div key={i} className="h-40 bg-white rounded-xl animate-pulse"></div>))}
           </div>
        ) : menus.length > 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
             {menus.map((item) => (
              <MenuCard
                key={item.id}
                restaurantName={item.restaurants?.name || "Neznámá"}
                fullUrl={item.restaurants?.full_url}
                menuData={item.data}
              />
             ))}
           </div>
        ) : (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                <Info size={24} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Žádné vybrané restaurace</h3>
            <p className="text-gray-500 mb-4">Klikni na tlačítko výše a nastav si, co chceš jíst.</p>
          </div>
        )}
      </div>
    </main>
  );
}
