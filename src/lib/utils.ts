// Pomocne funkce pro praci s restauracemi a menu

/**
 * Ziskani domeny z celeho URL
 * @param url - Cele URL (napr. "https://sladovnicka.cz/denni-menu")
 * @returns Domena (napr. "sladovnicka.cz")
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    throw new Error("Neplatne URL");
  }
}

/**
 * Ziskani pondelí aktualni tydne
 * @returns ISO datumovy retezec (YYYY-MM-DD)
 */
export function getWeekStart(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Oprava pro neděli
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split("T")[0];
}

/**
 * Ziskani nazvu restaurace z URL - fallback pokud neni poskytnut
 * @param url - Cele URL
 * @returns Ziskany nazev nebo domena
 */
export function extractRestaurantName(url: string): string {
  const domain = extractDomain(url);
  return domain.replace("www.", "").split(".")[0];
}
