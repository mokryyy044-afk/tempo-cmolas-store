# Tempo Cmolas Store

Nowoczesny sklep i strona klubowa KS Tempo Cmolas zbudowana w React, Next.js i Tailwind CSS.

## Co zawiera projekt

- publiczna strona klubu: strona glowna, sklep, kategorie, mecze, kadra, galeria, kontakt,
- koszyk i finalizacja zamowienia z zapisem do Supabase,
- panel admina pod adresem `/admin`,
- logowanie admina i moderatora,
- CMS z backendem Supabase: produkty, kategorie, zamowienia, menu, tresci strony, kolory, herb, galeria, sponsorzy, kadra, mecze i kontakt,
- upload zdjec z kompresja po stronie przegladarki i zapisem do Supabase Storage,
- responsywny layout dla telefonu, tabletu i desktopu.

## Uruchomienie w VS Code na MacBooku

1. Otworz folder projektu w VS Code.
2. Otworz terminal w VS Code.
3. Uruchom:

```bash
npm install
npm run dev
```

Strona bedzie dostepna lokalnie pod adresem:

```text
http://localhost:3000
```

Panel admina:

```text
http://localhost:3000/admin
```

Logowanie admina:

```text
http://localhost:3000/admin/login
```

Jesli port 3000 jest zajety, uruchom:

```bash
PORT=3001 npm run dev
```

i wejdz na:

```text
http://localhost:3001
```

Login admina obsluguje backendowa sesja HTTP-only. Dane logowania ustaw w `.env.local` jako `ADMIN_LOGIN` i `ADMIN_PASSWORD`.

## Szybkie uruchomienie na Macu

Mozesz tez kliknac plik `URUCHOM_LOKALNIE.command`. Otworzy terminal, zainstaluje zaleznosci i wystartuje projekt.

## Sprawdzenie srodowiska

```bash
npm run doctor
```

Ten skrypt sprawdza wersje Node.js, npm i dostepnosc portu.

## Podglad statyczny

Po zbudowaniu projektu mozna wlaczyc statyczny podglad:

```bash
npm run build
npm run preview
```

## Build produkcyjny

```bash
npm run build
```

Projekt korzysta z tras API Next.js do zapisu w Supabase, dlatego najprostsze wdrozenie jest na Vercel. Ustaw:

- build command: `npm run build`
- Node.js: aktualna wersja LTS
- zmienne srodowiskowe z pliku `.env.example`

Szczegoly konfiguracji bazy i Storage sa w pliku `SUPABASE_SETUP.md`.

## Uwaga o danych

Glownym zrodlem danych jest Supabase. localStorage zostaje tylko jako cache/backup, zeby strona mogla pokazac ostatnio pobrane dane, gdy backend jest chwilowo niedostepny.
