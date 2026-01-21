"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, ArrowUpDown, Eye, EyeOff, X, Settings, Plus, Loader2, Trash2 } from "lucide-react";
import Cookies from "js-cookie";

interface Restaurant {
  id: string;
  name: string;
  domain: string;
  created_at: string;
}

interface Props {
  onUpdate: () => void;
}

export default function RestaurantManager({ onUpdate }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "alphabet">("newest");
  const [myList, setMyList] = useState<string[]>([]);
  
  // Stavy pro přidávání nové restaurace
  const [newUrl, setNewUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addStatus, setAddStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 1. Načtení dat (Všech restaurací z DB + Cookies)
  const loadData = async () => {
    // A) Cookies
    const cookieData = Cookies.get("my_restaurants");
    const savedIds = cookieData ? JSON.parse(cookieData) : [];
    setMyList(savedIds);

    // B) Databáze
    const { data } = await supabase
      .from("restaurants")
      .select("*")
      .order("created_at", { ascending: false });
    
    setRestaurants(data || []);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Funkce: Přidat restauraci
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    setIsAdding(true);
    setAddStatus({ type: null, msg: '' });

    try {
      const res = await fetch('/api/restaurants/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Chyba serveru');

      setAddStatus({ type: 'success', msg: 'Restaurace přidána!' });
      setNewUrl("");
      loadData(); // Obnovit seznam
      
      // Automaticky přidat do "mých" sledovaných
      if (data.restaurantId) {
         const newList = [...myList, data.restaurantId];
         setMyList(newList);
         Cookies.set("my_restaurants", JSON.stringify(newList), { expires: 365 });
         onUpdate();
      }

    } catch (err: any) {
      setAddStatus({ type: 'error', msg: err.message });
    } finally {
      setIsAdding(false);
    }
  };

  // Funkce: Smazat restauraci
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Aby se neklikl řádek (přepnutí oka)
    if (!confirm("Opravdu smazat tuto restauraci?")) return;

    setDeletingId(id);
    try {
      await fetch("/api/restaurants/delete", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      loadData();
      onUpdate();
    } catch (e) {
      alert("Chyba při mazání");
    } finally {
      setDeletingId(null);
    }
  };

  // 2. Logika přepínání (Přidat/Odebrat z mých)
  const toggleRestaurant = (id: string) => {
    let newList;
    if (myList.includes(id)) {
      newList = myList.filter((item) => item !== id); // Odebrat
    } else {
      newList = [...myList, id]; // Přidat
    }
    
    setMyList(newList);
    Cookies.set("my_restaurants", JSON.stringify(newList), { expires: 365 });
    onUpdate(); // Řekneme hlavní stránce, ať se obnoví
  };

  const filteredRestaurants = restaurants
    .filter((r) => 
      r.name?.toLowerCase().includes(search.toLowerCase()) || 
      r.domain.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === "alphabet") return (a.name || "").localeCompare(b.name || "");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <div className="flex justify-center">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 text-sm font-bold text-white bg-black px-6 py-3 rounded-full hover:bg-gray-800 transition-all shadow-lg hover:scale-105"
        >
          <Settings size={18} />
          Spravovat restaurace
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Hlavička */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">Správa restaurací</h3>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-2 hover:bg-gray-200 rounded-full"
                title="Zavřít"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              
              {/* 1. SEKCE: PŘIDÁNÍ NOVÉ */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <form onSubmit={handleAdd} className="flex gap-2">
                    <input 
                        type="url" 
                        placeholder="https://restaurace.cz/menu"
                        className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-400"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        required
                    />
                    <button 
                        type="submit" 
                        disabled={isAdding}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2 whitespace-nowrap"
                    >
                        {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Přidat
                    </button>
                </form>
                {addStatus.msg && (
                    <p className={`text-xs mt-2 ${addStatus.type === 'success' ? 'text-green-600 font-medium' : 'text-red-500'}`}>
                        {addStatus.msg}
                    </p>
                )}
              </div>

              {/* 2. SEKCE: FILTRY */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Hledat v seznamu..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none text-gray-800"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* 3. SEKCE: SEZNAM */}
              <div className="space-y-1 min-h-[200px]">
                {filteredRestaurants.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Žádná restaurace nenalezena.
                  </div>
                ) : (
                  filteredRestaurants.map((rest) => {
                    const isSelected = myList.includes(rest.id);
                    return (
                      <div 
                        key={rest.id} 
                        className={`group flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer border ${
                          isSelected ? "bg-white border-blue-200 shadow-sm" : "hover:bg-gray-50 border-transparent"
                        }`}
                        onClick={() => toggleRestaurant(rest.id)}
                      >
                        <div className="overflow-hidden flex-1 mr-2">
                          <div className={`font-bold text-sm ${isSelected ? "text-blue-700" : "text-gray-800"}`}>
                            {rest.name}
                          </div>
                          <div className="text-xs text-gray-600 truncate font-mono mt-0.5">
                            {rest.domain}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {/* Tlačítko Smazat (viditelné jen na hover nebo mobilu) */}
                            <button
                                onClick={(e) => handleDelete(rest.id, e)}
                                className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Smazat z databáze"
                            >
                                {deletingId === rest.id ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16} />}
                            </button>

                            {/* Tlačítko Oko */}
                            <button
                            className={`p-2 rounded-full transition-all flex-shrink-0 ${
                                isSelected 
                                ? "bg-blue-100 text-blue-700" 
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            }`}
                            >
                            {isSelected ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
            
            <div className="p-3 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-500">
              Co má <span className="text-blue-600 font-bold">modré oko</span>, to uvidíš na hlavní stránce.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
