import { scrapeMenuWithAI } from './src/lib/scraper.ts';

const tests = [
  { name: 'Slunecnice (menicka iframe)', url: 'https://www.slunecniceplzen.cz/denni-menu' },
  { name: 'U Palku (Excel tabulka)', url: 'https://upalku.cz/jidelni-listek' },
  { name: 'Rango (PDF)', url: 'https://rango.cz' }
];

console.log('Test scraperu s novymi heuristikami\n');

for (const test of tests) {
  console.log('\n' + '='.repeat(60));
  console.log('Test: ' + test.name);
  console.log('URL: ' + test.url);
  console.log('='.repeat(60));
  
  try {
    const result = await scrapeMenuWithAI(test.url);
    
    if (result && result.poledni_nabidka && result.poledni_nabidka.length > 0) {
      console.log('USPECH! Nalezeno ' + result.poledni_nabidka.length + ' dnu');
      result.poledni_nabidka.forEach((day, i) => {
        console.log('\n  Den ' + (i + 1) + ': ' + day.den);
        console.log('  Polevky: ' + (day.polevky?.length || 0));
        console.log('  Hlavni chody: ' + (day.hlavni_chody?.length || 0));
        if (day.hlavni_chody && day.hlavni_chody.length > 0) {
          day.hlavni_chody.slice(0, 2).forEach(dish => {
            console.log('    - ' + dish.nazev + ' (' + dish.cena_bez_polevky + ' Kc)');
          });
        }
      });
    } else {
      console.log('Menu nenalezeno');
    }
  } catch (error) {
    console.error('CHYBA: ' + error.message);
  }
}

console.log('\n' + '='.repeat(60));
console.log('Test dokoncen');
