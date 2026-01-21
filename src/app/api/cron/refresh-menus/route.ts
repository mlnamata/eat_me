import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { scrapeMenuWithAI } from "@/lib/scraper";

// Vercel CRON: Nastavíme timeout na 60 sekund (max pro Hobby tier)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * CRON ENDPOINT PRO AUTOMATICKÉ OBNOVENÍ MENU VŠECH RESTAURACÍ
 * 
 * Použití v Vercel CRON:
 *   - Frekvence: např. denně 6:00 ráno
 *   - Path: /api/cron/refresh-menus
 * 
 * Logika:
 *   1. Načteme všechny restaurace z DB
 *   2. Pro každou zavoláme scraper AI
 *   3. Pokud dostaneme nové menu:
 *      - Smažeme staré menu pro daný týden
 *      - Vložíme nové
 *   4. Vracíme statistiku úspěšnosti
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    console.log("🔄 CRON: Spouštím refresh všech menu...");

    // 1. Načteme všechny restaurace
    const { data: restaurants, error: fetchError } = await supabase
      .from("restaurants")
      .select("*");

    if (fetchError) {
      console.error("❌ CRON: Chyba při načítání restaurací:", fetchError);
      return NextResponse.json(
        { success: false, message: "Nepodařilo se načíst restaurace" },
        { status: 500 }
      );
    }

    if (!restaurants || restaurants.length === 0) {
      console.log("⚠️ CRON: Žádné restaurace k aktualizaci");
      return NextResponse.json({
        success: true,
        message: "Žádné restaurace k aktualizaci",
        stats: { total: 0, updated: 0, failed: 0, skipped: 0 },
      });
    }

    console.log(`📋 CRON: Nalezeno ${restaurants.length} restaurací`);

    // 2. Procházíme každou restauraci a refreshujeme menu
    const stats = {
      total: restaurants.length,
      updated: 0,
      failed: 0,
      skipped: 0,
    };

    for (const restaurant of restaurants) {
      console.log(`🔍 CRON: Zpracovávám ${restaurant.name} (${restaurant.full_url})`);

      try {
        // Scrapujeme menu
        const menuData = await scrapeMenuWithAI(restaurant.full_url);

        if (!menuData) {
          console.log(`⚠️ CRON: Menu nenalezeno pro ${restaurant.name}`);
          stats.skipped++;
          continue;
        }

        // Spočítáme začátek týdne (pondělí)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Neděle = -6, jinak posun na pondělí
        const monday = new Date(now);
        monday.setDate(now.getDate() + diff);
        monday.setHours(0, 0, 0, 0);

        // 3. Smažeme staré menu pro tento týden
        const { error: deleteError } = await supabase
          .from("daily_menus")
          .delete()
          .match({ restaurant_id: restaurant.id, week_start: monday.toISOString().split("T")[0] });

        if (deleteError) {
          console.error(`❌ CRON: Chyba při mazání starého menu pro ${restaurant.name}:`, deleteError);
          stats.failed++;
          continue;
        }

        // 4. Vložíme nové menu
        const { error: insertError } = await supabase
          .from("daily_menus")
          .insert({
            restaurant_id: restaurant.id,
            week_start: monday.toISOString().split("T")[0],
            data: menuData,
          });

        if (insertError) {
          console.error(`❌ CRON: Chyba při vkládání nového menu pro ${restaurant.name}:`, insertError);
          stats.failed++;
          continue;
        }

        console.log(`✅ CRON: Menu aktualizováno pro ${restaurant.name}`);
        stats.updated++;

      } catch (err) {
        console.error(`🔥 CRON: Kritická chyba při zpracování ${restaurant.name}:`, err);
        stats.failed++;
      }
    }

    console.log("🎉 CRON: Refresh dokončen");
    console.log(`📊 Statistika: Celkem ${stats.total}, Aktualizováno ${stats.updated}, Selhalo ${stats.failed}, Přeskočeno ${stats.skipped}`);

    return NextResponse.json({
      success: true,
      message: `Refresh dokončen: ${stats.updated}/${stats.total} restaurací aktualizováno`,
      stats,
    });

  } catch (error) {
    console.error("🔥 CRON: Fatální chyba:", error);
    return NextResponse.json(
      { success: false, message: "Kritická chyba při refreshi menu" },
      { status: 500 }
    );
  }
}
