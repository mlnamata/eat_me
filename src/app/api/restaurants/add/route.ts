import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase'; // Nutné použít Admin verzi pro zápis!
import { scrapeMenuWithAI, normalizeDomain } from '@/lib/scraper';

export async function POST(request: Request) {
  console.log("🚀 API: Start procesu přidávání restaurace");

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'Chybí URL' }, { status: 400 });
    }

    // 1. Zjistíme doménu a připravíme restauraci
    const domain = normalizeDomain(url);
    
    // Zkusíme najít existující restauraci
    const { data: existing } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('domain', domain)
      .single();

    let restaurantId = existing?.id;

    // Pokud neexistuje, vytvoříme ji
    if (!existing) {
      console.log(`🆕 Vytvářím novou restauraci: ${domain}`);
      const { data: newRestaurant, error: createError } = await supabaseAdmin
        .from('restaurants')
        .insert({
          domain,
          full_url: url,
          name: domain // Dočasné jméno
        })
        .select()
        .single();

      if (createError) throw createError;
      restaurantId = newRestaurant.id;
    }

    // 2. SPUSTÍME SCRAPER (Získání dat z AI)
    console.log(`🤖 Volám AI Scraper pro: ${url}`);
    const menuData = await scrapeMenuWithAI(url);

    // 3. ULOŽENÍ DO DATABÁZE (TOTO JE TA ČÁST, CO TO ULOŽÍ)
    if (menuData && menuData.poledni_nabidka && menuData.poledni_nabidka.length > 0) {
        
        console.log("💾 Data z AI získána, připravuji uložení do DB...");

        // Výpočet data pondělí pro aktuální týden (aby se to dobře řadilo)
        const today = new Date();
        const day = today.getDay() || 7; // Neděle je 0, chceme 7
        if (day !== 1) today.setHours(-24 * (day - 1));
        const mondayStr = today.toISOString().split('T')[0];

        // --- ZDE PROBÍHÁ ZÁPIS DO TABULKY DAILY_MENUS ---
        const { error: insertError } = await supabaseAdmin
            .from('daily_menus')
            .insert({
                restaurant_id: restaurantId, // Vazba na restauraci
                week_start: mondayStr,       // Datum
                data: menuData               // Samotný JSON s jídlem
            });

        if (insertError) {
            console.error("❌ Chyba při ukládání menu:", insertError);
            // I když se nepovedlo menu, restaurace je vytvořená, takže vrátíme success s varováním
        } else {
            console.log("✅ Menu úspěšně uloženo do tabulky daily_menus!");
        }

    } else {
        console.warn("⚠️ Scraper vrátil prázdná data, do DB nic neukládám.");
    }

    return NextResponse.json({ 
      success: true, 
      restaurantId, 
      menuSaved: !!menuData 
    });

  } catch (error: any) {
    console.error('🔥 Kritická chyba v API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
