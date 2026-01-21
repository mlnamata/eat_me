import * as cheerio from 'cheerio';

// Pomocná funkce pro očištění URL
export function normalizeDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch (e) {
    return '';
  }
}

// Hlavní funkce scraperu
export async function scrapeMenuWithAI(url: string) {
  console.log(`🔍 [Scraper] Začínám zpracovávat: ${url}`);

  try {
    // 1. STÁŽENÍ HTML (Tváříme se jako běžný prohlížeč Chrome)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8'
      },
      next: { revalidate: 0 } // Neukládat do cache, chceme čerstvá data
    });
    
    if (!response.ok) throw new Error(`Web vrátil chybu: ${response.status}`);
    const html = await response.text();

    // 2. ČIŠTĚNÍ HTML (Odstraníme reklamy, skripty a zbytečnosti)
    const $ = cheerio.load(html);
    $('script, style, nav, footer, iframe, svg, img, head, meta, link, form, noscript').remove();
    
    // Získáme čistý text, ale zachováme strukturu
    let rawText = $('body').text();
    // Odstraníme vícenásobné mezery a ořízneme na max 25 000 znaků (limit AI)
    rawText = rawText.replace(/\s+/g, ' ').substring(0, 25000);

    console.log(`🤖 [Scraper] Posílám ${rawText.length} znaků do Groq AI...`);

    // 3. POSLÁNÍ DO GROQ AI
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Velmi výkonný model
        messages: [
          {
            role: "system",
            content: `Jsi specialista na čtení jídelních lístků. 
            Tvým úkolem je v textu najít AKTUÁLNÍ POLEDNÍ MENU a vrátit ho jako čistý JSON.
            
            Pravidla:
            1. Ignoruj stálý jídelní lístek, nápoje, kontakty a omáčku okolo.
            2. Pokud menu nenajdeš, vrať: {"poledni_nabidka": []}
            3. NEVYMÝŠLEJ SI. Pokud tam jídlo není, nepiš ho tam.
            
            Výstupní formát JSON:
            {
              "poledni_nabidka": [
                {
                  "den": "Pondělí", 
                  "polevky": ["Název polévky"], 
                  "hlavni_chody": [
                     {"cislo": 1, "nazev": "Název jídla", "popis": "příloha", "cena_bez_polevky": 150, "cena_s_polevkou": 0}
                  ]
                }
              ]
            }`
          },
          { role: "user", content: `Zde je text stránky:\n\n${rawText}` }
        ],
        temperature: 0.1 // Nízká teplota = menší kreativita, větší přesnost
      })
    });

    const aiData = await aiResponse.json();

    if (aiData.error) {
        console.error("❌ CHYBA GROQ API:", aiData.error);
        return null;
    }

    // 4. ZPRACOVÁNÍ ODPOVĚDI (Ošetření proti chybám v JSONu)
    let content = aiData.choices[0].message.content;
    
    // Odstraníme "```json" a "```" pokud to tam AI napsala
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Najdeme začátek '{' a konec '}', abychom zahodili případný text okolo
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
        content = content.substring(start, end + 1);
    }

    const parsed = JSON.parse(content);
    console.log(`✅ [Scraper] Úspěch! Nalezeno dní: ${parsed.poledni_nabidka?.length || 0}`);
    
    return parsed;

  } catch (e: any) {
    console.error(`❌ [Scraper] Chyba: ${e.message}`);
    return null;
  }
}
