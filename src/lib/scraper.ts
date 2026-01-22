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

// 1. ZÍSKÁNÍ TEXTU (DVOJFÁZOVÉ)
async function fetchPageContent(url: string): Promise<string | null> {
  // FÁZE A: Klasický rychlý fetch (pro jednoduché weby)
  try {
    console.log(`⚡ [Scraper] Zkouším rychlý fetch: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      next: { revalidate: 0 }
    });
    
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Odstraníme balast
      $('script, style, nav, footer, iframe, svg, head, meta, link, form, noscript, .cookie-banner, #cookie-law-info-bar').remove();
      
      let text = $('body').text().replace(/\s+/g, ' ').trim();
      
      // Pokud máme dostatek textu, vrátíme ho
      if (text.length > 500) {
        return text.substring(0, 25000);
      }
    }
  } catch (e) {
    console.warn("⚠️ Rychlý fetch selhal, jdu na hloubkový.");
  }

  // FÁZE B: Hloubkový fetch přes Jina Reader (pro složité weby / JS / blokace)
  try {
    console.log(`🐢 [Scraper] Spouštím HLOUBKOVÝ scrape (Jina Reader): ${url}`);
    // Jina Reader převede web na Markdown vhodný pro LLM
    const jinaUrl = `https://r.jina.ai/${url}`;
    
    const response = await fetch(jinaUrl, {
      headers: {
        'User-Agent': 'EatMeBot/1.0',
        'X-Target-Selector': 'body' // Říkáme, ať se soustředí na obsah
      }
    });

    if (!response.ok) throw new Error(`Jina error: ${response.status}`);
    
    const text = await response.text();
    console.log(`✅ [Scraper] Jina vrátila ${text.length} znaků.`);
    return text.substring(0, 40000); // Jina vrací kvalitní text, můžeme vzít víc

  } catch (e: any) {
    console.error(`❌ [Scraper] I hloubkový scrape selhal: ${e.message}`);
    return null;
  }
}

// Pomocný rychlý fetch HTML (bez Jina) pro strukturovaný parsing
async function fetchPageHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      next: { revalidate: 0 }
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

// Pokus o strukturovaný parsing pro weby s jasným markupem (např. usalzmannu)
function tryParseStructuredMenu(html: string) {
  const $ = cheerio.load(html);
  const hasDaily = $('.daily-menu').length > 0;
  if (!hasDaily) return null;

  // Seznam dnů z tabů (indexované podle obsahu)
  const dayLabels: string[] = [];
  $('.daily-menu-tab__list .daily-menu-tab__item .daily-menu-tab__day').each((_, el) => {
    const day = $(el).text().trim();
    if (day) dayLabels.push(day);
  });

  const days: any[] = [];
  $('#daily-menu-content-list .daily-menu-content__content').each((i, content) => {
    const dayName = dayLabels[i] || `Den ${i + 1}`;
    const soups: string[] = [];
    const mains: any[] = [];

    $(content).find('.daily-menu-content__item').each((_, item) => {
      const section = $(item).find('.daily-menu-content__heading').text().trim().toLowerCase();
      const rows = $(item).find('table tbody tr');
      rows.each((__, tr) => {
        const tds = $(tr).find('td');
        if (tds.length >= 2) {
          const name = $(tds[1]).text().replace(/\s+/g, ' ').trim();
          const priceText = tds.length >= 3 ? $(tds[2]).text() : '';
          const priceMatch = priceText.replace(/\u00a0/g, ' ').match(/(\d+)[\s]*Kč/i);
          const price = priceMatch ? parseInt(priceMatch[1], 10) : 0;

          if (section.includes('polév') || section.includes('polev')) {
            if (name) soups.push(name);
          } else {
            if (name) mains.push({ nazev: name, cena_bez_polevky: price || 0 });
          }
        }
      });
    });

    days.push({ den: dayName, polevky: soups, hlavni_chody: mains });
  });

  if (days.length === 0) return null;
  return { poledni_nabidka: days };
}

// HLAVNÍ FUNKCE
export async function scrapeMenuWithAI(url: string) {
  // 0) Zkusíme rychlý strukturovaný parsing, pokud stránky mají jasný markup
  const html = await fetchPageHtml(url);
  if (html) {
    const structured = tryParseStructuredMenu(html);
    if (structured && structured.poledni_nabidka?.length) {
      console.log(`✅ [Scraper] Strukturovaný parsing úspěšný (bez AI). Dní: ${structured.poledni_nabidka.length}`);
      return structured;
    }
  }

  const rawText = await fetchPageContent(url);

  if (!rawText || rawText.length < 100) {
    console.error("❌ [Scraper] Nepodařilo se získat text stránky.");
    return null;
  }

  console.log(`🤖 [Scraper] Posílám data do Groq AI...`);

  try {
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Nejsilnější model
        messages: [
          {
            role: "system",
            content: `Jsi špičkový AI asistent pro extrakci jídelních lístků. Tvým úkolem je pochopit i špatně formátovaný text a najít v něm polední menu.
            
            Dnešní datum (pro kontext): ${new Date().toLocaleDateString('cs-CZ')}
            
            INSTRUKCE:
            1. Hledej sekce jako "Polední menu", "Denní nabídka", "Menu na týden", "Lunch menu".
            2. Pokud vidíš data (např. 22.1. nebo Pondělí), přiřaď jídla správně ke dnům.
            3. Ignoruj stálý lístek (burgery, pizzy), pokud to není v sekci denního menu.
            4. Pokud je menu v podivném formátu (tabulky rozpadlé do textu), pokus se to logicky poskládat.
            5. Důležité: Pokud jídlo nemá uvedenou cenu, nevadí, dej tam 0.
            
            VÝSTUPNÍ FORMÁT (JSON):
            {
              "poledni_nabidka": [
                {
                  "den": "Pondělí", 
                  "polevky": ["Zelňačka"], 
                  "hlavni_chody": [
                     {"cislo": 1, "nazev": "Guláš s pěti", "popis": "", "cena_bez_polevky": 150, "cena_s_polevkou": 0}
                  ]
                }
              ]
            }
            
            Pokud menu nenajdeš, vrať: {"poledni_nabidka": []}`
          },
          { role: "user", content: `Zde je obsah webu:\n\n${rawText}` }
        ],
        temperature: 0.2 // Trochu kreativity povolíme, aby si poradil s chybami v textu
      })
    });

    const aiData = await aiResponse.json();

    if (aiData.error) {
        console.error("❌ CHYBA GROQ API:", aiData.error);
        return null;
    }

    // Čištění JSONu
    let content = aiData.choices[0].message.content;
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
        content = content.substring(start, end + 1);
    }

    const parsed = JSON.parse(content);
    
    // Validace - pokud AI vrátila prázdno, logujeme to
    if (!parsed.poledni_nabidka || parsed.poledni_nabidka.length === 0) {
        console.warn("⚠️ AI nenašla v textu žádné menu.");
    } else {
        console.log(`✅ [Scraper] Menu nalezeno! Dní: ${parsed.poledni_nabidka.length}`);
    }
    
    return parsed;

  } catch (e: any) {
    console.error(`❌ [Scraper] Chyba při zpracování: ${e.message}`);
    return null;
  }
}
