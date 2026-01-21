# 🍽️ Eat Me - Lunch Menu Agregátor

Moderní webová aplikace pro automatické zobrazení denních menu z vybraných restaurací. Využívá AI pro extrakci menu z webových stránek restaurací.

## ✨ Hlavní funkce

- **Automatický scraping menu** - AI-powered extrakce jídelních lístků z webů restaurací
- **Personalizace pomocí cookies** - Trvalé uložení vybraných restaurací (365 dní)
- **Responzivní 2-sloupcový layout** - Optimalizováno pro desktop i mobil
- **Collapsible menu karty** - Defaultně zobrazují pouze dnešní menu
- **Správa restaurací** - Přidávání, mazání a přepínání viditelnosti restaurací
- **Automatické CRON aktualizace** - Denní obnovení menu (pondělí-pátek v 5:00)
- **Real-time indikátor** - Zelený pulsující bod u dnešního menu

## 🛠️ Technologie

- **Next.js 16.1.4** - App Router s Turbopack
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Supabase** - PostgreSQL databáze
- **Groq Cloud AI** - LLaMA 3.3 70B pro extrakci menu
- **Cheerio** - HTML parsing
- **js-cookie** - Cookie management
- **Lucide React** - Moderní ikony

## 📦 Instalace

```bash
# Naklonovat repozitář
git clone https://github.com/your-username/eat_me.git
cd eat_me

# Nainstalovat závislosti
npm install

# Spustit development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## ⚙️ Konfigurace

Vytvoř `.env.local` soubor v kořenovém adresáři:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Groq AI
GROQ_API_KEY=your_groq_api_key
```

### Databázové schéma

```sql
-- Tabulka restaurací
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  full_url TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabulka denních menu
CREATE TABLE daily_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 Deployment na Vercel

1. Push do GitHub repozitáře
2. Import projektu na [Vercel](https://vercel.com)
3. Nastav environment variables
4. Deploy!

CRON job se automaticky aktivuje pomocí `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/update",
      "schedule": "0 5 * * 1-5"
    }
  ]
}
```

## 📖 Použití

### Přidání restaurace

1. Klikni na "Spravovat restaurace"
2. Vlož URL menu stránky restaurace
3. Klikni "Přidat"
4. AI automaticky stáhne a zpracuje menu

### Zobrazení menu

- **Zavřená karta** - Zobrazí pouze dnešní menu
- **Otevřená karta** - Zobrazí celý týden
- **Zelený indikátor** - Označuje dnešní den

### Správa viditelnosti

- **Modré oko** - Restaurace je viditelná na hlavní stránce
- **Šedé oko** - Restaurace je skrytá
- **Trash ikona** - Smazat restauraci z databáze

## 🔧 API Endpointy

### POST `/api/restaurants/add`
Přidá novou restauraci a stáhne menu

### DELETE `/api/restaurants/delete`
Smaže restauraci z databáze

### GET `/api/cron/refresh-menus`
CRON endpoint pro automatické obnovení všech menu

## 📂 Struktura projektu

```
eat_me/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── cron/
│   │   │   │   └── refresh-menus/
│   │   │   └── restaurants/
│   │   │       ├── add/
│   │   │       └── delete/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── MenuCard.tsx
│   │   └── RestaurantManager.tsx
│   ├── lib/
│   │   ├── scraper.ts
│   │   └── supabase.ts
│   └── types/
│       └── database.ts
├── vercel.json
├── package.json
└── tsconfig.json
```

## 🤖 AI Scraping

AI scraper používá LLaMA 3.3 70B model s precizními instrukcemi:

- Ignoruje statické/stálé menu
- Hledá pouze denní/týdenní nabídky
- Extrahuje název dne, polévky, hlavní chody a ceny
- Vrací strukturovaný JSON formát

## 📝 Formát menu JSON

```json
{
  "poledni_nabidka": [
    {
      "den": "Pondělí",
      "polevky": ["Gulášová"],
      "hlavni_chody": [
        {
          "cislo": 1,
          "nazev": "Kuřecí řízek",
          "popis": "s bramborovou kaší",
          "cena_bez_polevky": 140,
          "cena_s_polevkou": 150
        }
      ]
    }
  ]
}
```

## 🎨 Design Features

- **Modální dialog** - Overlay s blur efektem
- **Hover animace** - Smooth transitions na všech interaktivních prvcích
- **Loading states** - Skeleton screens a spinner animace
- **Responsive grid** - 1 sloupec mobile, 2 sloupce desktop
- **Accessibility** - ARIA labels a keyboard navigation

## 🐛 Známé limity

- Scraper funguje nejlépe na českých stránkách s jasnou strukturou
- Některé restaurace mohou mít nestandardní formát menu
- CRON job na Vercel Hobby plánu má timeout 60 sekund

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## 📄 Licence

MIT

## 👨‍💻 Autor

Matyáš Mlnařík

---

**Vytvořeno s ❤️ pro lepší obědy**

