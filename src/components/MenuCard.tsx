"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Calendar } from "lucide-react";

interface Dish {
  cislo?: number;
  nazev: string;
  popis?: string;
  cena_bez_polevky?: number;
  cena_s_polevkou?: number;
}

interface DailyMenu {
  den: string;
  polevky: string[];
  hlavni_chody: Dish[];
}

interface Props {
  restaurantName: string;
  menuData: { poledni_nabidka: DailyMenu[] };
  fullUrl?: string;
}

export default function MenuCard({ restaurantName, menuData, fullUrl }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [todayMenu, setTodayMenu] = useState<DailyMenu | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  
  // Zjistíme dnešní den hned při startu
  useEffect(() => {
    const days = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
    const todayName = days[new Date().getDay()]; // Např. "Středa"

    if (menuData?.poledni_nabidka) {
      // Najdeme menu, které má v názvu dnešní den (ignorujeme velikost písmen)
      const foundIndex = menuData.poledni_nabidka.findIndex((d) => 
        d.den && d.den.toLowerCase().includes(todayName.toLowerCase())
      );
      if (foundIndex !== -1) {
        setTodayMenu(menuData.poledni_nabidka[foundIndex]);
        setSelectedDayIndex(foundIndex);
      }
    }
  }, [menuData]);

  // Funkce pro vykreslení jídel jednoho dne
  const renderDishes = (day: DailyMenu) => (
    <div className="space-y-3">
       {/* Polévky */}
       {day.polevky?.length > 0 && (
        <div className="text-sm text-gray-500 italic border-b border-gray-100 pb-2 mb-2">
          🥣 {day.polevky.join(", ")}
        </div>
      )}
      
      {/* Hlavní chody */}
      {day.hlavni_chody?.map((jidlo, idx) => (
        <div key={idx} className="border-b border-gray-100 pb-3 last:border-0 group">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-gray-900 block break-words">
                {jidlo.cislo ? `${jidlo.cislo}. ` : ""}
                {jidlo.nazev}
              </span>
              {jidlo.popis && (
                <span className="text-gray-600 text-xs block mt-1 line-clamp-2">{jidlo.popis}</span>
              )}
            </div>
            <div className="whitespace-nowrap font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg text-sm flex-shrink-0">
              {jidlo.cena_bez_polevky || jidlo.cena_s_polevkou ? `${jidlo.cena_bez_polevky || jidlo.cena_s_polevkou} Kč` : "—"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
      {/* Hlavička - Vždy viditelná */}
      <div 
        className="p-4 bg-white border-b border-gray-100 flex justify-between items-start cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <h3 className="font-bold text-lg text-gray-900 leading-tight mb-1">{restaurantName}</h3>
          
          {/* Indikátor dneška */}
          {todayMenu ? (
             <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                Dnes: {todayMenu.hlavni_chody.length} jídel
             </div>
          ) : (
             <span className="text-xs text-gray-400">Dnes zavřeno / nenalezeno</span>
          )}
        </div>

        <div className="flex gap-1">
            {fullUrl && (
                <a href={fullUrl} target="_blank" rel="noreferrer" onClick={(e)=>e.stopPropagation()} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Otevřít web restaurace">
                    <ExternalLink size={18} />
                </a>
            )}
            <div className={`p-1.5 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                <ChevronDown size={20} />
            </div>
        </div>
      </div>

      {/* OBSAH */}
      <div className="flex-1 bg-white">
        
        {/* VARIANTA A: Zavřeno = Ukazujeme VYBRANÝ DEN s navigací */}
        {!isOpen && menuData.poledni_nabidka && menuData.poledni_nabidka.length > 0 && (
            <div className="p-4 animate-in fade-in">
                {/* Navigace dnů */}
                {menuData.poledni_nabidka.length > 1 && (
                  <div className="flex gap-1 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                    {menuData.poledni_nabidka.map((day, idx) => {
                      const isToday = todayMenu && day.den === todayMenu.den;
                      const isSelected = idx === selectedDayIndex;
                      return (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDayIndex(idx);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-sm"
                              : isToday
                              ? "bg-green-50 text-green-700 hover:bg-green-100"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {day.den.split(' ')[0]} {isToday && "•"}
                        </button>
                      );
                    })}
                  </div>
                )}
                
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    {menuData.poledni_nabidka[selectedDayIndex]?.den}
                    {todayMenu && menuData.poledni_nabidka[selectedDayIndex]?.den === todayMenu.den && " (Dnes)"}
                </h4>
                {menuData.poledni_nabidka[selectedDayIndex] && renderDishes(menuData.poledni_nabidka[selectedDayIndex])}
            </div>
        )}

        {/* VARIANTA B: Otevřeno = Ukazujeme VŠECHNY DNY */}
        {isOpen && (
            <div className="p-4 space-y-6 animate-in slide-in-from-top-2">
                {menuData.poledni_nabidka?.map((day, i) => {
                    // Je to dnešek?
                    const isToday = todayMenu && day.den === todayMenu.den;
                    return (
                        <div key={i} className={isToday ? "bg-blue-50/50 -m-2 p-2 rounded-lg border border-blue-100" : ""}>
                            <h4 className={`text-sm font-bold mb-3 ${isToday ? "text-blue-700" : "text-gray-900"}`}>
                                {day.den} {isToday && "(Dnes)"}
                            </h4>
                            {renderDishes(day)}
                        </div>
                    );
                })}
                {(!menuData.poledni_nabidka || menuData.poledni_nabidka.length === 0) && (
                    <p className="text-center text-gray-400 text-sm italic">Menu není k dispozici.</p>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
