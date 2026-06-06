# Ritatu

Prywatna aplikacja do śledzenia makroskładników na Androida, zbudowana w Expo i React Native. Loguj posiłki wyszukując produkty w bazie Open Food Facts, skanując kody kreskowe lub używając analizy zdjęć opartej na GPT-4o mini. Wszystkie dane przechowywane są lokalnie na urządzeniu bez backendu, bez konta.

## Dlaczego?
Aplikacje takie jak fitatu czy yazio niestety nie posiadają dobrego modelu Ai do analizy posiłków, a za ich modele trzeba jeszcze płacić. Ritatu stworzyłem dlatego żeby pokazać w jak krótkim czasie można się spiąć i przy pomocy Claude stworzyć aplikację, która nawet pod niektórymi względami jest lepsza od tych płatnych. Dodatkowo, wszystkie dane są przechowywane lokalnie, więc nie musisz się martwić o prywatność swoich danych żywieniowych.

## Funkcje

- Dzienny dziennik makro z podziałem na posiłki (śniadanie, obiad, kolacja, przekąska)
- Wyszukiwanie produktów przez Open Food Facts (polska i światowa baza)
- Skaner kodów kreskowych
- Analiza zdjęć z AI — sfotografuj posiłek i otrzymaj szacunkowe makro
- Statystyki tygodniowe z wykresem słupkowym, serią dni i wskazówkami makro
- Własne produkty i ostatnio używane
- Śledzenie wagi i zdjęcia postępu
- W pełni offline — dane w AsyncStorage

## Stack technologiczny

- Expo SDK 56 / React Native 0.85 / React 19
- Expo Router (nawigacja plikowa)
- react-native-reanimated 4 (New Architecture)
- AsyncStorage (bez Firebase, bez zewnętrznej bazy danych)
- OpenAI GPT-4o mini (opcjonalne, do analizy zdjęć)
- Open Food Facts API

---

## Konfiguracja

### Wymagania

- Node.js 18 lub nowszy
- Konto na [Expo](https://expo.dev) (bezpłatne)
- EAS CLI: `npm install -g eas-cli`
- Urządzenie Android lub emulator

### 1. Sklonuj repozytorium

```bash
git clone <adres-repo>
cd ritatu
npm install
```

### 2. Skonfiguruj zmienne środowiskowe

Utwórz plik `.env` w głównym katalogu projektu. Skopiuj poniższy szablon i uzupełnij wartości.

```env
# Wymagane do analizy zdjęć przez AI
EXPO_PUBLIC_OPENAI_API_KEY="sk-..."

# Opcjonalne — nadpisuje domyślny model (gpt-4o-mini)
EXPO_PUBLIC_OPENAI_VISION_MODEL=""

# Opcjonalne — adres lokalnego proxy (scripts/openai-proxy.mjs)
EXPO_PUBLIC_API_BASE_URL=""

# Opcjonalne — dane logowania Open Food Facts
# Przyspiesza wyszukiwanie na pl.openfoodfacts.org i pozwala uniknąć limitu zapytań.
# Bezpłatne konto: https://world.openfoodfacts.org
EXPO_PUBLIC_OFF_USERNAME=""
EXPO_PUBLIC_OFF_PASSWORD=""
```

Żadna z tych zmiennych nie jest wymagana do uruchomienia aplikacji. Bez `EXPO_PUBLIC_OPENAI_API_KEY` funkcja analizy zdjęć jest wyłączona. Bez danych OFF wyszukiwanie działa, ale może być ograniczone przez limit zapytań na polskim subdomenie.

### 3. Połącz z własnym projektem Expo

Jeśli chcesz korzystać z EAS Update (aktualizacje JS over-the-air), musisz połączyć projekt z własnym kontem Expo:

```bash
eas login
eas init --id <twoje-project-id>
```

Jeśli nie potrzebujesz OTA updates, usuń blok `updates` z `app.config.js`.

### 4. Uruchom w trybie deweloperskim

Uruchom Metro bundler:

```bash
npm start
```

Naciśnij `a`, żeby otworzyć aplikację na podłączonym urządzeniu Android lub emulatorze. Na urządzeniu musi być włączone debugowanie USB (Ustawienia → Opcje programisty → Debugowanie USB).

Aby uruchomić bezpośrednio z natywnym buildem:

```bash
npm run android
```

Ta metoda wymaga lokalnie zainstalowanego Android SDK. Expo Go nie obsługuje wszystkich bibliotek używanych w tym projekcie.

---

## Budowanie APK

Projekt używa EAS Build do tworzenia plików APK na Androida. Buildy są wykonywane w chmurze Expo — nie potrzebujesz Android Studio ani lokalnego SDK.

### 1. Zaloguj się do EAS

```bash
eas login
```

### 2. Zbuduj APK

```bash
eas build --platform android --profile preview
```

Profil `preview` tworzy APK do dystrybucji wewnętrznej (niepodpisany do Play Store). Czas budowania to około 10–15 minut.

### 3. Zainstaluj na urządzeniu

Po zakończeniu builda EAS udostępnia link do pobrania i kod QR. Możesz:

- Otworzyć link bezpośrednio na telefonie w przeglądarce i dotknąć Instaluj
- Zeskanować kod QR wyświetlony w terminalu lub na expo.dev

Przed instalacją włącz instalację z nieznanych źródeł na swoim urządzeniu:
Ustawienia → Aplikacje → (twoja przeglądarka) → Instaluj nieznane aplikacje → Zezwól.

---

## Aktualizacje over-the-air

Po zainstalowaniu APK zmiany tylko w kodzie JavaScript można wgrać bez przebudowywania:

```bash
eas update --branch preview --message "opis zmiany"
```

Zabij aplikację na telefonie i otwórz ponownie, żeby pobrać aktualizację. Pełny rebuild APK jest wymagany tylko gdy:

- Dodajesz lub usuwasz natywne biblioteki
- Zmieniasz ikony, uprawnienia lub natywne ustawienia w `app.config.js`

---

## Analiza zdjęć przez AI

Funkcja analizy zdjęć wysyła zdjęcie w formacie base64 do API OpenAI i zwraca szacunkowe makro. Dostępne dwa tryby:

**Bezpośrednie API** — ustaw `EXPO_PUBLIC_OPENAI_API_KEY` w `.env`. Zapytania są wysyłane bezpośrednio z urządzenia. Klucz API wbudowany w aplikację mobilną jest widoczny dla osoby, która zdekompiluje APK. Odpowiednie do użytku prywatnego.

**Lokalne proxy** — uruchom dołączony serwer proxy i ustaw `EXPO_PUBLIC_API_BASE_URL` na jego adres:

```bash
npm run api
```

Proxy działa domyślnie na porcie 3000 i przekazuje zapytania do OpenAI używając klucza po stronie serwera. Zalecane, jeśli nie chcesz umieszczać klucza na urządzeniu.

---

## Struktura projektu

```
app/                  Trasy Expo Router (cienkie re-eksporty)
src/
  components/         Współdzielone komponenty UI
  core/               Czysta logika (kalkulator makro, narzędzia dat)
  data/               Repozytoria AsyncStorage
  providers/          React context (auth, posiłki, profil użytkownika)
  screens/            Komponenty ekranów i podkomponentów
    home/             HomeScreen podzielony na osobne pliki
  services/           Klienty zewnętrznych API (OpenFoodFacts, OpenAI)
  theme/              Tokeny kolorów, typografia, współdzielone style
scripts/
  openai-proxy.mjs    Lokalny serwer proxy dla OpenAI
assets/               Ikony aplikacji i ekran powitalny
```

---

## Logowanie

Logowanie jest tylko lokalne. Domyślne dane: `login` / `1234`. Aby je zmienić, edytuj `src/providers/AuthProvider.tsx`.

---

## Licencja

MIT
