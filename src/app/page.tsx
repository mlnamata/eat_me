"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Cookies from "js-cookie";
import MenuCard from "@/components/MenuCard";
import RestaurantManager from "@/components/RestaurantManager";
import { RefreshCw, Info, GripVertical } from "lucide-react";
import Image from "next/image";

export default function Home() {
  // Seznamy menu a stav nacitani
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantOrder, setRestaurantOrder] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isDragUnlocked, setIsDragUnlocked] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Funkce nacitajici menu z databaze
  const fetchData = async () => {
    setLoading(true);
    
    // Nacteni ID vybranych restauraci z prohlizecovych cookies
    const cookieData = Cookies.get("my_restaurants");
    const myIds: string[] = cookieData ? JSON.parse(cookieData) : [];
    setRestaurantOrder(myIds);

    // Sestrojeni databazoveho dotazu
    let query = supabase
      .from("daily_menus")
      .select(`
        *,
        restaurants (id, name, full_url)
      `)
      .order("created_at", { ascending: false });

    // Filtrujeme menu - jen pro vybrane restaurace pokud uzivatel neco vybral
    if (myIds.length > 0) {
      query = query.in("restaurant_id", myIds);
    }

    // Nacitame azs do 1000 polozek aby se zobrazilo vse
    const { data, error } = await query.limit(1000);

    if (error) {
      console.error("Chyba pri nacteni z databaze:", error);
    } else {
      const orderedMenus = (data || []).slice().sort((a, b) => {
        const orderIndex = (id: string) => {
          const idx = myIds.indexOf(id);
          return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
        };

        const aIdx = orderIndex(a.restaurant_id);
        const bIdx = orderIndex(b.restaurant_id);

        if (aIdx === bIdx) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return aIdx - bIdx;
      });

      setMenus(orderedMenus);
    }
    setLoading(false);
  };

  // Pri prvnim nacteni stranky si nacitame data
  useEffect(() => {
    fetchData();
  }, []);

  // Sezazeni menu podle aktualniho poradi ID v cookies
  // Pro kazdou restauraci vybereme pouze nejnovejsi menu
  const orderedMenus = useMemo(() => {
    const orderMap = new Map(restaurantOrder.map((id, idx) => [id, idx]));

    // Seskupeni menu podle restaurant_id a vyber nejnovejsiho
    const latestMenusByRestaurant = new Map<string, any>();
    menus.forEach((menu) => {
      const existing = latestMenusByRestaurant.get(menu.restaurant_id);
      if (!existing || new Date(menu.created_at).getTime() > new Date(existing.created_at).getTime()) {
        latestMenusByRestaurant.set(menu.restaurant_id, menu);
      }
    });

    // Prevedeni na pole a serazeni podle poradi v cookies
    return Array.from(latestMenusByRestaurant.values()).sort((a, b) => {
      const aIdx = orderMap.has(a.restaurant_id)
        ? (orderMap.get(a.restaurant_id) as number)
        : Number.MAX_SAFE_INTEGER;
      const bIdx = orderMap.has(b.restaurant_id)
        ? (orderMap.get(b.restaurant_id) as number)
        : Number.MAX_SAFE_INTEGER;

      if (aIdx === bIdx) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return aIdx - bIdx;
    });
  }, [menus, restaurantOrder]);

  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleDragEnter = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;

    setRestaurantOrder((prev) => {
      const next = [...prev];
      const fromIndex = next.indexOf(draggingId);
      const toIndex = next.indexOf(targetId);

      if (fromIndex === -1 || toIndex === -1) return prev;

      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, draggingId);
      Cookies.set("my_restaurants", JSON.stringify(next), { expires: 365 });
      return next;
    });
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleRemoveCard = (restaurantId: string) => {
    setRestaurantOrder((prev) => {
      const next = prev.filter((id) => id !== restaurantId);
      Cookies.set("my_restaurants", JSON.stringify(next), { expires: 365 });
      return next;
    });

    setMenus((prev) => prev.filter((item) => item.restaurant_id !== restaurantId));
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Hlavicka aplikace s logem */}
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

        <p className="text-gray-500">Tvuj osobni prehled poledni nabidky</p>
      </div>

      {/* Sekce pro spravu restauraci a obnovu dat */}
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Komponenta pro pridavani a mazani restauraci */}
        <RestaurantManager onUpdate={fetchData} />

      </div>

      {/* Zobrazeni menu - dvousloupcova souprava na desktopu */}
      <div className="max-w-6xl mx-auto mt-8">
        <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-xl font-bold text-gray-800">Moje menu ({menus.length})</h2>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setShowInfoModal(true)} 
                className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 text-gray-600 transition-all"
                title="Jak funguje aplikace"
              >
                <Info size={16} />
              </button>
              <button 
                type="button" 
                onClick={() => setIsDragUnlocked(!isDragUnlocked)} 
                className={`p-2 border rounded-full transition-all ${
                  isDragUnlocked 
                    ? "bg-blue-500 border-blue-600 text-white hover:bg-blue-600" 
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
                title={isDragUnlocked ? "Zamknout přesouvání" : "Odemknout přesouvání"}
              >
                <GripVertical size={16} />
              </button>
              <button type="button" onClick={fetchData} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 text-gray-600 transition-all" title="Obnovit data">
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
        </div>
        <p className="text-sm text-gray-500 px-2 mb-4">{isDragUnlocked ? "✓ Přesouvání odemčeno - táhni karty pro změnu pořadí" : "Karty můžeš přesouvat po kliknutí na ikonu zámku vedle tlačítka obnovit"}</p>

        {loading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (<div key={i} className="h-40 bg-white rounded-xl animate-pulse"></div>))}
           </div>
        ) : menus.length > 0 ? (
          <div className="columns-1 md:columns-2" style={{ columnGap: "0.75rem" }}>
            {orderedMenus.map((item) => (
              <div
                key={item.id}
                draggable={isDragUnlocked}
                onDragStart={() => isDragUnlocked && handleDragStart(item.restaurant_id)}
                onDragEnter={() => isDragUnlocked && handleDragEnter(item.restaurant_id)}
                onDragOver={(e) => isDragUnlocked && e.preventDefault()}
                onDragEnd={handleDragEnd}
                className={`relative group mb-3 ${draggingId === item.restaurant_id ? "opacity-60" : ""}`}
                style={{ breakInside: "avoid" }}
              >
                {isDragUnlocked && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center text-gray-500 text-xs bg-white/70 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-white/90 shadow-sm">
                      <GripVertical size={14} />
                      Pretahni pro presun
                    </div>
                  </div>
                )}
                <MenuCard
                  restaurantName={item.restaurants?.name || "Neznámá"}
                  fullUrl={item.restaurants?.full_url}
                  menuData={item.data}
                  onRemove={() => handleRemoveCard(item.restaurant_id)}
                />
              </div>
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

      {/* Zapatí */}
      <footer className="mt-12 mb-4 text-center text-gray-500 text-sm">
        <p>
          Developt by MaMl pro nejlepší společnost na světě {" "}
          <a
            href="https://ceskysoftware.cz/cs/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
           Český software s.r.o. 
          </a>
        </p>
      </footer>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowInfoModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Info className="text-blue-500" size={28} />
                Jak funguje Eat Me
              </h2>
              <button
                onClick={() => setShowInfoModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Zavřít"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-gray-700 leading-relaxed">
                  <strong className="text-blue-700">Eat Me</strong> je tvůj osobní přehled poledních nabídek z vybraných restaurací. 
                  Všechna data se automaticky aktualizují každý den.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-lg text-gray-900 border-b pb-2">🎯 Hlavní funkce</h3>
                
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">1</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Přidávání restaurací</h4>
                      <p className="text-sm text-gray-600">Klikni na "Přidat restauraci" a vlož URL z podporovaných restaurací. Systém automaticky načte menu.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">2</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Automatická aktualizace</h4>
                      <p className="text-sm text-gray-600">Menu se aktualizují automaticky každý den. Můžeš také manuálně obnovit data pomocí tlačítka ↻ (refresh).</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">3</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Přesouvání karet</h4>
                      <p className="text-sm text-gray-600">Klikni na ikonu <GripVertical className="inline" size={14} /> (zámek) pro odemčení režimu přesouvání. Pak můžeš karty táhnout a měnit jejich pořadí. Pořadí se uloží do cookies.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold">4</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Mazání restaurací</h4>
                      <p className="text-sm text-gray-600">Na každé kartě najdeš ikonu koše 🗑️, kterou můžeš restauraci odstranit ze svého přehledu.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold">5</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Navigace mezi dny</h4>
                      <p className="text-sm text-gray-600">Pokud restaurace má menu na více dní, můžeš přepínat mezi dny pomocí tlačítek v horní části karty.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold">6</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Automatické rozbalení</h4>
                      <p className="text-sm text-gray-600">Karty s více než 8 jídly se automaticky rozbalí. Karty s méně jídly můžeš rozbalit kliknutím na ně.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-lg text-gray-900 border-b pb-2">💡 Tipy</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span><strong>Dnes:</strong> Karty automaticky zobrazují dnešní menu, pokud je k dispozici</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span><strong>Cookies:</strong> Tvé preference (pořadí, vybrané restaurace) se ukládají do cookies na 365 dní</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span><strong>Externí odkaz:</strong> Kliknutím na ikonu 🔗 otevřeš webovou stránku restaurace v novém okně</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span><strong>Responzivní design:</strong> Aplikace funguje na telefonu i počítači - na mobilu 1 sloupec, na desktopu 2 sloupce</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
                <p className="text-center text-gray-700">
                  <strong>Dobrou chuť! 🍽️</strong>
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl">
              <button
                onClick={() => setShowInfoModal(false)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Rozumím, zavřít
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
