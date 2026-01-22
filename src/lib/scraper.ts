import { load } from 'cheerio';

// Pomocná funkce pro očištění URL
export function normalizeDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch (e) {
    return '';
  }
}

function toAbsoluteUrl(baseUrl: string, maybeRelative: string): string {
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return maybeRelative;
  }
}

async function fetchViaJina(targetUrl: string): Promise<string | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;
    const response = await fetch(jinaUrl, {
      headers: {
        'User-Agent': 'EatMeBot/1.0',
        'X-Target-Selector': 'body'
      }
    });
    if (!response.ok) return null;
    const text = await response.text();
    console.log(`✅ [Scraper] Jina vrátila ${text.length} znaků pro ${targetUrl}.`);
    return text.substring(0, 50000);
  } catch (e: any) {
    console.error(`❌ [Scraper] Jina selhala pro ${targetUrl}: ${e.message}`);
    return null;
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
      const $ = load(html);
      
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
  return await fetchViaJina(url);
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
  const $ = load(html);
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
            if (name) mains.push({ cislo: 0, nazev: name, popis: '', cena_bez_polevky: price || 0, cena_s_polevkou: 0 });
          }
        }
      });
    });

    days.push({ den: dayName, polevky: soups, hlavni_chody: mains });
  });

  if (days.length === 0) return null;
  return { poledni_nabidka: days };
}

// Heuristika: menicka.cz iframe (např. Slunečnice)
async function extractMenickaIframeText(baseUrl: string, html: string): Promise<string | null> {
  const $ = load(html);
  
  // Zkusit classickou iframe s menicka.cz
  let iframeSrc = $('iframe[src*="menicka.cz"]').attr('src');
  
  // Pokud ne, zkusit data-src (lazy loading)
  if (!iframeSrc) {
    iframeSrc = $('iframe[data-src*="menicka.cz"]').attr('data-src');
  }
  
  // Pokud ne, zkusit všechny iframy a hledat v src
  if (!iframeSrc) {
    $('iframe').each((_, el) => {
      const src = $(el).attr('src') || '';
      if (src.includes('menicka.cz')) {
        iframeSrc = src;
        return false; // break
      }
    });
  }
  
  if (!iframeSrc) return null;
  const abs = toAbsoluteUrl(baseUrl, iframeSrc);
  console.log(`🔎 [Scraper] Nalezen menicka.cz iframe: ${abs}`);
  // Menicka obsah převedeme přes Jina na text
  return await fetchViaJina(abs);
}

// Heuristika: Excel/HTML tabulka jako u upalku.cz
function tryParseUpalkuExcelTable(html: string) {
  const $ = load(html);
  const table = $('table').first();
  if (!table || table.length === 0) return null;

  // Odhad, zda jde o takový formát: hledejte klíčová slova
  const pageText = $('body').text().toLowerCase();
  if (!pageText.includes('jídelní lístek')) return null;

  const rows = table.find('tr');
  const soups: string[] = [];
  const mains: any[] = [];
  let mode: 'none' | 'soups' | 'mains' = 'none';
  let dayName = '';
  const czechDays = ['Pondělí','Úterý','Středa','Čtvrtek','Pátek','Sobota','Neděle'];

  rows.each((_, tr) => {
    const $tr = $(tr);
    const tds = $tr.find('td');
    const texts = tds.map((i, td) => $(td).text().replace(/\s+/g, ' ').trim()).get();
    const line = texts.join(' ').trim();
    if (!line) return;

    // Zjistit den:
    for (const d of czechDays) {
      if (line.includes(d)) {
        dayName = d;
        break;
      }
    }

    if (/polévky/i.test(line) || /polevky/i.test(line)) {
      mode = 'soups';
      return;
    }
    if (/denní nabídka/i.test(line) || /denni nabidka/i.test(line)) {
      mode = 'mains';
      return;
    }

    if (mode === 'soups') {
      if (tds.length >= 2) {
        const name = texts[1];
        if (name) soups.push(name);
      }
      return;
    }

    if (mode === 'mains') {
      if (tds.length >= 2) {
        let name = texts[1];
        const priceText = texts[2] || '';
        const priceMatch = priceText.replace(/\u00a0/g, ' ').match(/(\d+)/);
        const price = priceMatch ? parseInt(priceMatch[1], 10) : 0;
        // Pokus o číslo jídla na začátku názvu
        let cislo = 0;
        const m = name.match(/^(\d+)\s+/);
        if (m) {
          cislo = parseInt(m[1], 10);
          name = name.replace(/^(\d+)\s+/, '');
        }
        mains.push({ cislo, nazev: name, popis: '', cena_bez_polevky: price, cena_s_polevkou: 0 });
      }
    }
  });

  if (soups.length === 0 && mains.length === 0) return null;
  if (!dayName) {
    // fallback na dnešní den
    const dayIdx = (new Date().getDay() + 6) % 7; // 0=Mon
    dayName = czechDays[dayIdx];
  }

  return {
    poledni_nabidka: [
      { den: dayName, polevky: soups, hlavni_chody: mains }
    ]
  };
}

// Heuristika: odkazy na PDF s denním/poledním menu (např. Rango)
function findPdfMenuUrl(baseUrl: string, html: string): string | null {
  const $ = load(html);
  let best: string | null = null;
  $('a[href$=".pdf"]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const text = $(a).text().toLowerCase();
    if (/denn/i.test(href) || /poledn/i.test(href) || /denn/i.test(text) || /poledn/i.test(text)) {
      best = toAbsoluteUrl(baseUrl, href);
      return false; // break
    }
    // Otherwise keep last PDF as fallback if nothing smarter found
    if (!best) best = toAbsoluteUrl(baseUrl, href);
  });
  return best;
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

    // 0a) Upalku-like excel tabulka
    const upalku = tryParseUpalkuExcelTable(html);
    if (upalku) {
      console.log('✅ [Scraper] Rozpoznán excel/HTML formát denní nabídky (u Pálků).');
      return upalku;
    }

    // 0b) Menicka.cz iframe
    const menickaText = await extractMenickaIframeText(url, html);
    if (menickaText && menickaText.length > 100) {
      console.log('✅ [Scraper] Nalezen menicka.cz iframe, použiji jeho obsah.');
      return await extractWithAI(menickaText);
    }

    // 0c) PDF menu odkaz
    const pdfUrl = findPdfMenuUrl(url, html);
    if (pdfUrl) {
      console.log(`🔗 [Scraper] Nalezen PDF odkaz s menu: ${pdfUrl}`);
      const pdfText = await fetchViaJina(pdfUrl);
      if (pdfText && pdfText.length > 100) {
        return await extractWithAI(pdfText);
      }
    }
  }

  const rawText = await fetchPageContent(url);

  if (!rawText || rawText.length < 100) {
    console.error("❌ [Scraper] Nepodařilo se získat text stránky.");
    return null;
  }

  return await extractWithAI(rawText);
}

async function extractWithAI(sourceText: string) {
  console.log(`🤖 [Scraper] Posílám data do Groq AI...`);
  try {
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
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
          { role: 'user', content: `Zde je obsah webu/zdroje:\n\n${sourceText}` }
        ],
        temperature: 0.1
      })
    });

    const aiData = await aiResponse.json();

    if (aiData.error) {
      console.error('❌ CHYBA GROQ API:', aiData.error);
      return null;
    }

    // Čištění JSONu
    let content = aiData.choices?.[0]?.message?.content || '';
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      content = content.substring(start, end + 1);
    }

    const parsed = JSON.parse(content);

    if (!parsed.poledni_nabidka || parsed.poledni_nabidka.length === 0) {
      console.warn('⚠️ AI nenašla v textu žádné menu.');
    } else {
      console.log(`✅ [Scraper] Menu nalezeno! Dní: ${parsed.poledni_nabidka.length}`);
    }

    return parsed;
  } catch (e: any) {
    console.error(`❌ [Scraper] Chyba při zpracování: ${e.message}`);
    return null;
  }
}
