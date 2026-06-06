# Ritatu — Plan zmian

Ostatnia aktualizacja: 2026-06-03

## Status ogólny

| Chunk | Temat | Status |
|-------|-------|--------|
| 1 | Photo AI Flow | ✅ Gotowe |
| 2 | Tab Navigation + Weekly Stats | ✅ Gotowe |
| 2b | Speed Dial FAB + Section Picker + Edit Meal | ✅ Gotowe |
| 3 | UI Polish + Animacje | ⬜ Do zrobienia |
| 4 | Quick wins: settings icon + History redesign | ⬜ Do zrobienia |
| 5 | Refactor HomeScreen (1852 linii → komponenty) | ⬜ Do zrobienia |

---

## Chunk 1 — Photo AI Flow ✅

- [x] 1.1 Pole "Tytuł posiłku" przed kamerą/galerią
- [x] 1.2 Tytuł jako kontekst do promptu GPT
- [x] 1.3 Dokładniejsze szacowanie gramów
- [x] 1.4 Przycisk "Popraw z AI" w MacroConfirmSheet
- [x] 1.5 Re-analiza z tym samym zdjęciem + komentarzem (`refineMealAnalysis`)
- [x] UX redesign PhotoScanScreen (3-fazowy flow: idle → ready → analyzing → done)

---

## Chunk 2 — Tab Navigation + Weekly Stats ✅

- [x] 2.1 Custom `BottomTabBar` z Speed Dial FAB
- [x] 2.2 Taby: Dziennik · Tydzień · [+FAB] · Historia · Profil
- [x] 2.3 `WeeklyScreen` — 7 kolumn z paskami i statusem dnia
- [x] 2.4 Kolumna: % celu kalorii, ✓ jeśli cel spełniony
- [x] 2.5 Nagłówek: "Ten tydzień" + zakres dat
- [x] 2.6 Przyszłe dni wyszarzone
- [x] 2.7 HomeScreen: chip switcher Dziennik/Pomiary (bez BottomNav)

## Chunk 2b — Speed Dial + Edit Meal ✅

- [x] `src/core/section.ts` — `getSectionByTime()`
- [x] FAB → 3 opcje (Szukaj/Skaner/Zdjęcie) z auto-section
- [x] MacroConfirmSheet: section picker chips + tryb edycji
- [x] Tap na posiłku → edit sheet (zmiana wagi, usuwanie)

---

## Chunk 3 — UI Polish + Animacje

**Pliki:** `package.json`, komponenty, `src/theme/colors.ts`

- [x] 3.1 Nowa paleta: warm dark `#111009` (nie zimny `#0A0A0E`), warm off-white tekst
- [x] 3.2 Protein ≠ orange — teraz `#5BB8F5` (Apple-like blue), carbs=amber, fat=violet
- [x] 3.3 Barlow 300 Light zainstalowany — `typography.stat` + `typography.statMd`
- [x] 3.4 Barlow dla uppercase labels: eyebrows, DAY_LABELS (PN/WT/ŚR...), date sub-labels
- [x] 3.5 WeeklyScreen: today bar = orange, past = warm white 55%, met = green — kalendarze estetyka
- [x] 3.6 Section colors nowe: Śniadanie=amber, Obiad=blue, Kolacja=violet, Przekąska=green
- [x] 3.7 Spring transitions — `react-native-reanimated` 4.x zainstalowany, Sheet spring in/out, BottomTabBar dial `SlideInDown` stagger + `FadeOut`
- [x] 3.8 Safe area + `TAB_BAR_HEIGHT=68` padding: DiaryView, MeasurementsView, HistoryScreen, WeeklyScreen

---

## Chunk 4 — Quick Wins

**Pliki:** `src/screens/HomeScreen.tsx`, `src/screens/HistoryScreen.tsx`

- [x] 4.1 Usunąć ikonkę zębatki (settings) z headera HomeScreen — Profil jest już w BottomTabBar
- [x] 4.2 Redesign HistoryScreen:
  - Usunąć `borderLeftWidth` na mealRow (zakazane side-stripe)
  - Przepisać mealRow na czysty layout bez "dekoracyjnych" borderów
  - Lepszy kontrast dnia z posiłkami — może timeline lub inne podejście
  - Wyraźniejszy tytuł dnia, sekcja makro skondensowana

---

## Chunk 5 — Refactor HomeScreen

**Cel:** rozbić 1852-liniowy monolith na komponenty i hooks, jak zrobiłby to senior developer.

**Struktura docelowa:**

```
src/screens/home/
  HomeScreen.tsx          # orchestrator — tylko stan, provider, render
  DiaryView.tsx           # lista sekcji z MealCard, SectionHeader
  MeasurementsView.tsx    # pomiary + progress photos
  AddFoodSheet.tsx        # wyszukiwarka (tabs: search/recent/custom)
  FoodDetailSheet.tsx     # amount picker przed dodaniem
  CreateCustomSheet.tsx   # tworzenie produktu custom
  MealCard.tsx            # pojedynczy wiersz posiłku

src/hooks/
  useDiary.ts             # logika ładowania/zapisywania posiłków na dany dzień
  useFoodSearch.ts        # debounce, OFF fetch, custom produkty

src/screens/home/index.ts # re-export HomeScreen
```

**Zasady:**

- Każdy plik max ~200–300 linii
- Logika danych w hooks (`useDiary`, `useFoodSearch`)
- Komponenty tylko UI + props
- Stałe (SECTIONS itp.) już w `src/core/section.ts` — nie duplikować
- Typy z `src/data/types.ts` — nie przepisywać

**Zadania:**

- [x] 5.1 `src/core/numberFormat.ts` — `parseDecimal`, `formatDecimal`
- [x] 5.2 `src/core/date.ts` — dodany `dateWithOffset`
- [x] 5.3 `src/theme/sharedStyles.ts` — `sh.pressed`, `sh.disabled`, `sh.cta`, `sh.ctaText`
- [x] 5.4 `src/components/Sheet.tsx` — reużywalny bottom sheet
- [x] 5.5 `src/components/IconButton.tsx` — reużywalny icon button
- [x] 5.6 `src/screens/home/types.ts` — typ `FoodItem`
- [x] 5.7 `src/screens/home/foodDb.ts` — stała `FOOD_DB`
- [x] 5.8 `src/screens/home/FormField.tsx` — pole formularza (wspólne dla Quick/Create)
- [x] 5.9 `src/screens/home/DiaryView.tsx` (~230 linii)
- [x] 5.10 `src/screens/home/AddFoodSheet.tsx` (~220 linii)
- [x] 5.11 `src/screens/home/FoodDetailSheet.tsx` (~140 linii)
- [x] 5.12 `src/screens/home/MeasurementsView.tsx` (~260 linii)
- [x] 5.13 `src/screens/home/AddWeightSheet.tsx` (~65 linii)
- [x] 5.14 `src/screens/home/AddProgressPhotoSheet.tsx` (~115 linii)
- [x] 5.15 `src/screens/home/QuickAddSheet.tsx` (~70 linii)
- [x] 5.16 `src/screens/home/CreateCustomSheet.tsx` (~65 linii)
- [x] 5.17 `src/screens/home/HomeScreen.tsx` — orchestrator ~230 linii
- [x] 5.18 `src/screens/HomeScreen.tsx` — re-export (backward compat)

---

## Notatki techniczne

- Expo Router `~56.2.6` — routing przez `app/` folder
- `react-native-reanimated` NIE ma w `package.json` — dodać przez `npx expo install`
- `MacroConfirmSheet` przyjmuje `onRefine`, `onDelete`, `editingMealId`
- `getSectionByTime()` zwraca Section na podstawie aktualnej godziny
- `useSafeAreaInsets()` zamiast React Native `SafeAreaView` gdy potrzeba custom paddingu
