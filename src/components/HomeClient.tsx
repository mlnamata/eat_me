"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { AddRestaurantInput } from "./AddRestaurantInput";
import MenuCard from "./MenuCard";
import { Loader2 } from "lucide-react";
import { DailyMenu } from "@/types/database";

const RESTAURANTS_COOKIE_KEY = "my_restaurants";

export function HomeClient() {
  const [restaurantIds, setRestaurantIds] = useState<string[]>([]);
  const [menus, setMenus] = useState<DailyMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load restaurant IDs from cookies
  useEffect(() => {
    const stored = Cookies.get(RESTAURANTS_COOKIE_KEY);
    if (stored) {
      try {
        setRestaurantIds(JSON.parse(stored));
      } catch {
        setRestaurantIds([]);
      }
    }
    setLoading(false);
  }, []);

  // Fetch menus when restaurant IDs change
  useEffect(() => {
    if (restaurantIds.length === 0) {
      setMenus([]);
      return;
    }

    const fetchMenus = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/menus/list?ids=${restaurantIds.join(",")}`
        );
        const data = await response.json();

        if (!data.success) {
          setError(data.error || "Failed to fetch menus");
          return;
        }

        setMenus(data.menus || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchMenus();
  }, [restaurantIds]);

  const handleRestaurantAdded = () => {
    // Refresh the list from cookies
    const stored = Cookies.get(RESTAURANTS_COOKIE_KEY);
    if (stored) {
      try {
        const ids = JSON.parse(stored);
        setRestaurantIds(ids);
      } catch {
        setRestaurantIds([]);
      }
    }
  };

  // Welcome state
  if (restaurantIds.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-2xl mx-auto px-4 py-20">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🍽️ Lunch Menu Aggregator
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Keep track of daily lunch menus from your favorite restaurants in
              one place.
            </p>

            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Get Started
              </h2>
              <p className="text-gray-600 mb-6">
                Add your first restaurant to start viewing lunch menus.
              </p>
              <AddRestaurantInput onRestaurantAdded={handleRestaurantAdded} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header with Add Button */}
        <div className="mb-8">
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Today's Lunch Menus
              </h1>
              <p className="text-gray-600">
                {restaurantIds.length} restaurant
                {restaurantIds.length !== 1 ? "s" : ""} tracked
              </p>
            </div>
            <AddRestaurantInput onRestaurantAdded={handleRestaurantAdded} />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Loading menus...</span>
          </div>
        ) : menus.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">
              No menus available for this week yet.
            </p>
          </div>
        ) : (
          /* Grid of Menu Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menus.map((menu) => (
              <MenuCard
                key={menu.id}
                restaurantName={
                  (menu.restaurants as any)?.name || "Unknown"
                }
                menuData={menu.data as any}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
