# Konfiguracja Supabase dla Tempo Cmolas

Projekt zapisuje dane CMS w Supabase przez trasy API Next.js:

- `tempo_cms_documents` przechowuje wspólne dokumenty CMS: produkty, kategorie, ustawienia strony, menu, slider, mecze, galerię, sponsorów, kadrę, tabelę ligową, kontakt i konta admina/moderatora,
- `tempo_orders` przechowuje zamówienia,
- Supabase Storage przechowuje zdjęcia, herby, logotypy, banery i grafiki produktów.

`localStorage` zostaje tylko jako cache i awaryjny backup, nie jako główne źródło danych.

## 1. Utwórz projekt Supabase

1. Wejdź na https://supabase.com.
2. Utwórz nowy projekt.
3. W `Project Settings -> API` skopiuj:
   - Project URL,
   - service_role key.

Nie publikuj `service_role key` w kodzie ani w zmiennych `NEXT_PUBLIC_*`.

## 2. Utwórz tabele

W Supabase otwórz `SQL Editor` i uruchom:

```sql
create table if not exists public.tempo_cms_documents (
  site_id text not null default 'tempo-cmolas',
  key text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (site_id, key)
);

create table if not exists public.tempo_orders (
  site_id text not null default 'tempo-cmolas',
  id text not null,
  status text not null default 'nowe',
  total numeric not null default 0,
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb,
  primary key (site_id, id)
);

alter table public.tempo_cms_documents enable row level security;
alter table public.tempo_orders enable row level security;
```

Projekt używa po stronie serwera `SUPABASE_SERVICE_ROLE_KEY`, więc RLS może pozostać bez publicznych polityk. Dane nie są zapisywane bezpośrednio z przeglądarki do tabel.

## 3. Utwórz bucket na zdjęcia

W Supabase otwórz `Storage` i utwórz bucket:

```text
cms
```

Ustaw bucket jako publiczny, żeby zdjęcia mogły wyświetlać się na stronie.

Możesz też utworzyć go SQL-em:

```sql
insert into storage.buckets (id, name, public)
values ('cms', 'cms', true)
on conflict (id) do update set public = true;
```

## 4. Dodaj zmienne środowiskowe

Lokalnie utwórz plik `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SITE_ID=tempo-cmolas
SUPABASE_STORAGE_BUCKET=cms
ADMIN_LOGIN=admin
ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD
ADMIN_SESSION_SECRET=CHANGE_ME_LONG_RANDOM_SECRET
ADMIN_SESSION_TTL_SECONDS=7200
```

W Vercel dodaj te same zmienne w:

```text
Project Settings -> Environment Variables
```

## 5. Uruchom projekt

```bash
npm install
npm run dev
```

Panel admina:

```text
http://localhost:3000/admin
```

Strona publiczna:

```text
http://localhost:3000
```

## 6. Jak działa zapis

- panel admina zapisuje produkty, kategorie, ustawienia i treści do Supabase,
- formularz zamówienia zapisuje zamówienie do Supabase,
- upload zdjęć optymalizuje obraz w przeglądarce, a potem wysyła go do Supabase Storage,
- strona publiczna odczytuje dane z Supabase i zapisuje kopię w localStorage jako cache,
- jeśli Supabase nie jest skonfigurowane, projekt działa lokalnie na cache/defaultach, ale pokaże komunikat o trybie lokalnym.

## 7. Migracja istniejących danych

Jeśli masz dane tylko w localStorage:

1. Wejdź do panelu admina na komputerze, gdzie dane są widoczne.
2. Skonfiguruj `.env.local` i uruchom projekt.
3. Otwórz panel admina.
4. Kliknij `Zapisz` w sekcjach, które chcesz przenieść, albo użyj eksportu/importu JSON jako backupu.

Po zapisie dane będą wspólne dla komputerów i telefonów.
