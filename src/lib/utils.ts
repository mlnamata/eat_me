// Utility functions for working with restaurants and menus

/**
 * Extract domain from a full URL
 * @param url - Full URL (e.g., "https://sladovnicka.cz/denni-menu")
 * @returns Domain (e.g., "sladovnicka.cz")
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    throw new Error("Invalid URL");
  }
}

/**
 * Get the Monday of the current week
 * @returns ISO date string (YYYY-MM-DD)
 */
export function getWeekStart(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split("T")[0];
}

/**
 * Get restaurant name from URL (fallback if not provided)
 * @param url - Full URL
 * @returns Extracted name or domain
 */
export function extractRestaurantName(url: string): string {
  const domain = extractDomain(url);
  return domain.replace("www.", "").split(".")[0];
}
