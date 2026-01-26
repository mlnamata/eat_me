"use client";

// Komponenta pro pridani nove restaurace
import { useState } from "react";
import { Plus } from "lucide-react";

interface AddRestaurantProps {
  onAdded?: () => void;
}

export default function AddRestaurant({ onAdded }: AddRestaurantProps) {
  // Stav pro URL, loading a zpravy
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Obsluzna funkce pri odeslani formulare
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/restaurants/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`Chyba: ${data.error || data.message}`);
        return;
      }

      setMessage(`Restaurace pridana! (ID: ${data.restaurantId})`);
      setUrl("");
      onAdded?.();
    } catch (error) {
      setMessage(`Chyba: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      <h2 className="font-bold text-lg mb-4">Pridat restauraci</h2>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="url"
          placeholder="example.com/menu"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={loading || !url.includes(".")}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition"
        >
          <Plus size={16} />
          {loading ? "Pridavam..." : "Pridat"}
        </button>
      </form>

      {message && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
          {message}
        </div>
      )}
    </div>
  );
}
