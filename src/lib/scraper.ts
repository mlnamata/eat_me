// Scraper pro ziskavani denniho menu z webovych stranek
import { load } from 'cheerio';

// Normalizace domeny - odstraneni www. a ziskani hostname
export function normalizeDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch (e) {
    return '';
  }
}

// Prevod relativniho URL na absolutni
function toAbsoluteUrl(baseUrl: string, maybeRelative: string): string {
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return maybeRelative;
  }
}

// Ziskani obsahu pomoci Jina Reader API - pro komplexni nebo blokovane stranky
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
    console.log(`Jina uspesne nactla ${text.length} znaku pro ${targetUrl}`);
    return text.substring(0, 50000);
  } catch (e: any) {
    console.error(`Chyba pri Jina nacteni ${targetUrl}: ${e.message}`);
    return null;
  }
}

// Nacteni obsahu stranky - dvoustupnovy pristup
// Stupen 1: Pokus o primy fetch - rychly a je-li dostupny
// Stupen 2: Fallback na Jina Reader - pro JS-heavy/chranene stranky
async function fetchPageContent(url: string): Promise<string | null> {
  // Stupen 1: Pokus o rychly primy fetch
  try {
    console.log(`Prubekam primy fetch: ${url}`);
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
      
      // Odstranime nepotrebne prvky
      $('script, style, nav, footer, iframe, svg, head, meta, link, form, noscript, .cookie-banner, #cookie-law-info-bar').remove();
      
      let text = $('body').text().replace(/\s+/g, ' ').trim();
      
      // Pokud je text dostatecne dlouhy, pouzijeme ho
      if (text.length > 500) {
        return text.substring(0, 25000);
      }
    }
  } catch (e) {
    console.warn("Primy fetch selhal, pouzivam Jinu.");
  }

  // Stupen 2: Jina Reader pro slozite stranky
  return await fetchViaJina(url);
}

// Pomocny primy fetch HTML - bez Jina - pro strukturovany parsing
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

// Pokus o strukturovany parsing pro stranky s jasnym markupem (napr. usalzmannu)
function tryParseStructuredMenu(html: string) {
  const $ = load(html);
  const hasDaily = $('.daily-menu').length > 0;
  if (!hasDaily) return null;

  // Seznam dnu z tabu - indexovano podle obsahu
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
          const priceMatch = priceText.replace(/\u00a0/g, ' ').match(/(\d+)[\s]*Kc/i);
          const price = priceMatch ? parseInt(priceMatch[1], 10) : 0;

          // Rozdeleni na polevky a hlavni chody
          if (section.includes('polev') || section.includes('polev')) {
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

// Ziskavani menu z menicka.cz iframe - napr. Slunecnice
async function extractMenickaIframeText(baseUrl: string, html: string): Promise<string | null> {
  const $ = load(html);
  
  // Pokus najit iframe s menicka.cz
  let iframeSrc = $('iframe[src*="menicka.cz"]').attr('src');
  
  // Pokud ne, zkusit data-src - pro lazy loading
  if (!iframeSrc) {
    iframeSrc = $('iframe[data-src*="menicka.cz"]').attr('data-src');
  }
  
  // Pokud ne, zkusit vse iframy a hledat menicka.cz
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
  // Menicka obsah prevedeme pres Jinu na text
  return await fetchViaJina(abs);
}

// Heuristika: Excel/HTML tabulka jako u upalku.cz
function tryParseUpalkuExcelTable(html: string) {
  const $ = load(html);
  const table = $('table').first();
  if (!table || table.length === 0) return null;

  // Odhad zda jde o spravny format - hledame klicova slova
  const pageText = $('body').text().toLowerCase();
  if (!pageText.includes('jidelni listek')) return null;

  const rows = table.find('tr');
  const soups: string[] = [];
  const mains: any[] = [];
  let mode: 'none' | 'soups' | 'mains' = 'none';
  let dayName = '';
  const czechDays = ['Pondeli','Utery','Streda','Ctvrtek','Patek','Sobota','Nedele'];

  rows.each((_, tr) => {
    const $tr = $(tr);
    const tds = $tr.find('td');
    const texts = tds.map((i, td) => $(td).text().replace(/\s+/g, ' ').trim()).get();
    const line = texts.join(' ').trim();
    if (!line) return;

    // Zjisteni dne:
    for (const d of czechDays) {
      if (line.includes(d)) {
        dayName = d;
        break;
      }
    }

    // Hledame sekci s polevkami
    if (/polevky/i.test(line) || /polevky/i.test(line)) {
      mode = 'soups';
      return;
    }
    // Hledame sekci s denni nabidkou
    if (/denni nabidka/i.test(line) || /denni nabidka/i.test(line)) {
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
        // Pokus o cislo jidla na zacatku nazvu
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
    // fallback na dnesni den
    const dayIdx = (new Date().getDay() + 6) % 7; // 0=Pondeli
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
      return false; // ukonceni iterace
    }
    // Fallback - posledni PDF pokud nic lepsiho nenajdeme
    if (!best) best = toAbsoluteUrl(baseUrl, href);
  });
  return best;
}

// HLAVNI FUNKCE PRO SKRAPOVANI MENU
export async function scrapeMenuWithAI(url: string) {
  // Stupen 0: Pokus o rychly strukturovany parsing bez AI
  const html = await fetchPageHtml(url);
  if (html) {
    const structured = tryParseStructuredMenu(html);
    if (structured && structured.poledni_nabidka?.length) {
      console.log(`Strukturovany parsing uspesny bez AI. Pocet dnu: ${structured.poledni_nabidka.length}`);
      return structured;
    }

    // Pokus o Excel/HTML tabulku formatu
    const upalku = tryParseUpalkuExcelTable(html);
    if (upalku) {
      console.log('Rozpoznan Excel/HTML format denni nabidky.');
      return upalku;
    }

    // Pokus o menicka.cz iframe
    const menickaText = await extractMenickaIframeText(url, html);
    if (menickaText && menickaText.length > 100) {
      console.log('Nalezen menicka.cz iframe, pouziji jeho obsah.');
      return await extractWithAI(menickaText);
    }

    // Pokus o PDF odkaz s menu
    const pdfUrl = findPdfMenuUrl(url, html);
    if (pdfUrl) {
      console.log(`Nalezen PDF odkaz na menu: ${pdfUrl}`);
      const pdfText = await fetchViaJina(pdfUrl);
      if (pdfText && pdfText.length > 100) {
        return await extractWithAI(pdfText);
      }
    }
  }

  const rawText = await fetchPageContent(url);

  if (!rawText || rawText.length < 100) {
    console.error("Nepodařilo se získat text stranky.");
    return null;
  }

  return await extractWithAI(rawText);
}

// Funkce pro extrakci menu pres AI - pouziva Groq API
async function extractWithAI(sourceText: string) {
  console.log(`Posílam data do Groq AI...`);
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
            content: `Jsi spicovy AI asistent pro extrakci jidelniho listu. Vyzva je pochopit i spatne formatovany text a najit v nem poledni menu.

Dnesmni datum (pro kontext): ${new Date().toLocaleDateString('cs-CZ')}

POKYNY:
1. Hledej sekce jako "Polední menu", "Denní nabídka", "Menu na týden", "Lunch menu".
2. Pokud vides data (napr. 22.1. nebo Pondeli), priradi jidla spravne ke dnum.
3. Ignoruj staly listek (burgery, pizzy), pokud to neni v sekci denniho menu.
4. Pokud je menu v podivnem formatu (tabulky rozpadlé do textu), pokus se to logicky poskladat.
5. Dulezite: Pokud jidlo nema uvedenou cenu, nevadi, dej tam 0.

VYSTUPNI FORMAT (JSON):
{
  "poledni_nabidka": [
    {
      "den": "Pondeli",
      "polevky": ["Zelnacka"],
      "hlavni_chody": [
        {"cislo": 1, "nazev": "Gulas s peti", "popis": "", "cena_bez_polevky": 150, "cena_s_polevkou": 0}
      ]
    }
  ]
}

Pokud menu nenajdes, vrat: {"poledni_nabidka": []}`
          },
          { role: 'user', content: `Zde je obsah webu/zdroje:\n\n${sourceText}` }
        ],
        temperature: 0.1
      })
    });

    const aiData = await aiResponse.json();

    if (aiData.error) {
      console.error('CHYBA Groq API:', aiData.error);
      return null;
    }

    // Cisteni a extrahovani JSON
    let content = aiData.choices?.[0]?.message?.content || '';
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      content = content.substring(start, end + 1);
    }

    const parsed = JSON.parse(content);

    if (!parsed.poledni_nabidka || parsed.poledni_nabidka.length === 0) {
      console.warn('AI nenasla v textu zadne menu.');
    } else {
      console.log(`Menu nalezeno! Pocet dnu: ${parsed.poledni_nabidka.length}`);
    }

    return parsed;
  } catch (e: any) {
    console.error(`Chyba pri zpracovani: ${e.message}`);
    return null;
  }
}
