"use client";

// Komponenta pro zobrazeni denniho menu restaurace
import { useState, useEffect } from "react";
import { ChevronDown, ExternalLink, Trash2 } from "lucide-react";
// Struktura jednoho jidla
interface Dish {
  cislo?: number;
  nazev: string;
  popis?: string;
  cena_bez_polevky?: number;
  cena_s_polevkou?: number;
}

// Struktura denniho menu
interface DailyMenu {
  den: string;
  polevky: string[];
  hlavni_chody: Dish[];
}

// Props pro komponentu
interface Props {
  restaurantName: string;
  menuData: { poledni_nabidka: DailyMenu[] };
  fullUrl?: string;
  onRemove?: () => void;
}

export default function MenuCard({ restaurantName, menuData, fullUrl, onRemove }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [todayMenu, setTodayMenu] = useState<DailyMenu | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  useEffect(() => {
    const days = ["nedele", "pondeli", "utery", "streda", "ctvrtek", "patek", "sobota"];
    const todayName = days[new Date().getDay()];

    if (menuData?.poledni_nabidka) {
      const foundIndex = menuData.poledni_nabidka.findIndex((d) => {
        if (!d.den) return false;
        const dayNormalized = d.den.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z]/g, "");
        return dayNormalized.includes(todayName) || todayName.includes(dayNormalized);
      });
      if (foundIndex !== -1) {
        setTodayMenu(menuData.poledni_nabidka[foundIndex]);
        setSelectedDayIndex(foundIndex);
      } else if (menuData.poledni_nabidka.length > 0) {
        // Pokud dnesni den neni, zobraz prvni dostupny
        setTodayMenu(menuData.poledni_nabidka[0]);
        setSelectedDayIndex(0);
      }
    }
  }, [menuData]);

  useEffect(() => {
    const selectedDay = menuData.poledni_nabidka?.[selectedDayIndex];
    if (selectedDay && selectedDay.hlavni_chody?.length > 8 && !isOpen) {
      setIsOpen(true);
    }
  }, [menuData, selectedDayIndex, isOpen]);

  const renderDishes = (day: DailyMenu) => (
    <div className="space-y-3">
       {/* Seznam polevek */}
       {day.polevky?.length > 0 && (
        <div className="text-sm text-gray-500 italic border-b border-gray-100 pb-2 mb-2">
          Polevky: {day.polevky.join(", ")}
        </div>
      )}
      
      {/* Hlavni chody s cenama */}
      {day.hlavni_chody?.map((jidlo, idx) => (
        <div key={idx} className="border-b border-gray-100 pb-2 last:border-0 group">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-gray-900 block break-words">
                {jidlo.cislo ? `${jidlo.cislo}. ` : ""}
                {jidlo.nazev}
              </span>
              {jidlo.popis && (
                <span className="text-gray-600 text-xs block mt-1 line-clamp-2">{jidlo.popis}</span>
              )}
            </div>
            {/* Cena v ramecku */}
            <div className="whitespace-nowrap font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg text-sm flex-shrink-0">
              {jidlo.cena_bez_polevky || jidlo.cena_s_polevkou ? `${jidlo.cena_bez_polevky || jidlo.cena_s_polevkou} Kc` : "—"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
      {/* Hlavicka karty - vyzdy viditlna, klikatelna */}
      <div 
        className="p-4 bg-white border-b border-gray-100 flex justify-between items-start cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <h3 className="font-bold text-base text-gray-900 leading-tight mb-0.5">{restaurantName}</h3>
          
          {/* Indikator co je dnes dostupne */}
          {todayMenu ? (
             <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                Dnes: {todayMenu.hlavni_chody.length} jidel
             </div>
          ) : (
             <span className="text-xs text-gray-400">Dnes zavreno / nenalezeno</span>
          )}
        </div>

        <div className="flex gap-0.5">
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Odebrat tuto restauraci z přehledu"
            >
              <Trash2 size={16} />
            </button>
          )}
          {fullUrl && (
            <a
              href={fullUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Otevrit web restaurace"
            >
              <ExternalLink size={16} />
            </a>
          )}
          <div className={`p-1 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
            <ChevronDown size={18} />
          </div>
        </div>
      </div>

      {/* Telo karty - menu jidel */}
      <div className="flex-1 bg-white">
        
        {/* Zavreta karta - ukazujeme vybrany den s navigaci */}
        {!isOpen && menuData.poledni_nabidka && menuData.poledni_nabidka.length > 0 && (
          <div className="p-3 animate-in fade-in">
            {menuData.poledni_nabidka.length > 1 && (
              <div className="flex gap-1 mb-2 overflow-x-auto pb-1 scrollbar-hide">
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
                      className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-all ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm"
                          : isToday
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {day.den.split(" ")[0]} {isToday && "•"}
                    </button>
                  );
                })}
              </div>
            )}

            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
              {menuData.poledni_nabidka[selectedDayIndex]?.den}
              {todayMenu && menuData.poledni_nabidka[selectedDayIndex]?.den === todayMenu.den && " (Dnes)"}
            </h4>

            {(() => {
              const day = menuData.poledni_nabidka[selectedDayIndex];
              const tooMany = day?.hlavni_chody?.length > 8;
              const visible = tooMany ? { ...day, hlavni_chody: day.hlavni_chody.slice(0, 8) } : day;
              return (
                <>
                  {visible && renderDishes(visible)}
                  {tooMany && (
                    <div className="mt-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                      Zobrazuji prvních 8 jídel. Karta se otevre, protoze menu je dlouhé.
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* VARIANTA B: Otevřeno = Ukazujeme VŠECHNY DNY */}
        {isOpen && (
          <div className="p-3 space-y-3 animate-in slide-in-from-top-2">
                {menuData.poledni_nabidka?.map((day, i) => {
                    // Je to dnešek?
                    const isToday = todayMenu && day.den === todayMenu.den;
                    return (
                        <div key={i} className={isToday ? "bg-blue-50/50 -m-1.5 p-1.5 rounded border border-blue-100" : ""}>
                            <h4 className={`text-sm font-bold mb-2 ${isToday ? "text-blue-700" : "text-gray-900"}`}>
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
