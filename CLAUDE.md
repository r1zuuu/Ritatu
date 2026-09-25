# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **CRITICAL**: Expo APIs change between SDK versions. Always read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any Expo code. The project targets **Expo SDK 56**, React Native 0.85, React 19.

## Commands

```bash
npm start          # Start Expo dev server (Metro bundler)
npm run android    # Build and run on Android device/emulator
npm run web        # Start in browser (OFF search disabled — CORS)
npx tsc --noEmit   # Typecheck (there is no test suite or linter)
eas build --platform android --profile preview   # Build APK via EAS (needed after native deps change)
eas update --branch preview --message "..."      # OTA JS update
```

`runtimeVersion.policy = "appVersion"`: an OTA update only reaches builds with the same `version` in `app.config.js`. Adding a native module means bumping the version and a new build.

Environment variables (set in `.env`, never commit this file; `EXPO_PUBLIC_*` values are inlined into the bundle at build/update time):
- `EXPO_PUBLIC_GEMINI_API_KEY` — Google AI Studio key (new `AQ.` format) for meal photo analysis
- `EXPO_PUBLIC_OFF_USERNAME` / `EXPO_PUBLIC_OFF_PASSWORD` — Open Food Facts Basic Auth (avoids rate limiting)

## Architecture

### Routing
Expo Router with file-based routing. Files in `app/` are thin re-exports; all logic lives in `src/screens/`.

- `app/_layout.tsx` — root Stack, loads fonts, mounts `UserProfileProvider → ToastProvider → MealsProvider`.
- `app/index.tsx` — redirect: onboarding until `profile.onboardingDone`, then `/home`.
- `app/(tabs)/_layout.tsx` — expo-router `Tabs` (from `expo-router/js-tabs`) with the custom `BottomTabBar` as `tabBar`. Tabs: `home` (Dziennik), `weekly` (Tydzień), `measurements` (Pomiary), `profile` (Profil). Screens stay mounted; they reload data in `useFocusEffect`.
- `app/onboarding.tsx` — first run; `?edit=1` opens it from Profile to edit body data (cancel + back).
- `app/add-meal/barcode.tsx`, `photo.tsx` — pushed on the root Stack; after saving they `router.back()`.

### Navigation
`src/components/BottomTabBar.tsx`: 4 tabs with one sliding pill (always painted, fixed radius) plus a floating FAB whose speed-dial offers Wyszukaj / Skanuj kod / Zdjęcie AI. `/home?add=<Section>` opens the diary search sheet. Scrollable tab screens pad their content by `FAB_CLEARANCE`.

### Data storage
**No backend.** Everything is `AsyncStorage`. Meal keys follow `ritatu:meals:<uid>:<YYYY-MM-DD>`.
- `src/data/mealRepository.ts` — `MealEntry[]` per day; `getDayTotals(uid, dates)` reads many days in one `multiGet`
- `src/data/userRepository.ts` — user profile with macro goals and optional `minCountedKcal`
- `src/data/weightRepository.ts` — weigh-ins (ISO dates, one per day)
- `src/data/progressPhotoRepository.ts` — progress photo metadata; files are copied into `Paths.document/progress-photos`
- `src/data/developerRepository.ts` — dev settings, `CUSTOM_PRODUCTS_KEY`, `WEIGHTS_KEY`, demo seed
- `src/data/csvExport.ts` — meals / days CSV export
- `src/data/favoritesRepository.ts` — favorites (`FoodItem[]` keyed by barcode or normalized name, with the usual `defaultAmount`) and the `useFavorites()` hook; hearts live in `FoodDetailSheet` and `MacroConfirmSheet`, favorites list first in `AddFoodSheet` and in its Ulubione tab

### Auth
None: the app is local and single-user. `useAuth()` returns a constant `LocalUser` with `uid: "user"`; every storage key uses it, so it must never change.

### Core data model
`MealEntry` (and `MealDraft`) stores macros **per 100 g** plus `weightG`, and optional `kcalPer100g` (label energy; otherwise 4/4/9). Actual values: `calculateMealMacros(meal, meal.weightG)` in `src/core/macroCalculator.ts`.

The day the diary shows lives in `MealsProvider` (`dateOffset`, `selectedDate`), and `useMeals().addMeal` saves to it, so every add path (search, scanner, photo, FAB) lands on the selected day and shows a confirmation toast.

Shared rules in `macroCalculator.ts`: `goalStatus(kcal, goal)` (met = 90–110%) and `isDayCounted(kcal, minKcal)` (days under the optional floor are "nieliczone": out of averages, goal stats and streaks). Week view, calendar and CSV all use them.

### Screens
- `src/screens/home/` — Dziennik: `HomeScreen` (state, sheets), `DiaryView` (date header, week strip, sections), `AddFoodSheet` (search/recent/custom), `FoodDetailSheet`, `QuickAddSheet` (szybkie kcal), `CreateCustomSheet`, `MeasurementsView`, `DaysCalendar`, `AddWeightSheet`, `AddProgressPhotoSheet`, `foodDb.ts` (local food DB), `types.ts` (`FoodItem`)
- `src/screens/MeasurementsScreen.tsx` — Pomiary tab state (weights, photos)
- `src/screens/WeeklyScreen.tsx` — week stats with week-by-week navigation
- `src/screens/ProfileScreen.tsx` — body data, goals, kcal floor, CSV export, collapsed dev tools
- `src/components/MacroConfirmSheet.tsx` — confirm/edit a meal (photo ingredients, weight, or quick kcal)

There is no manual per-100 g entry; unknown products go through search, scanning, quick kcal or a custom product.

### Search (`AddFoodSheet` + `src/core/search.ts`)
Local results (custom products + `FOOD_DB`) always come first; Open Food Facts results are appended below and never reorder them. Matching folds Polish diacritics (`ł` explicitly) and tolerates inflection. Remote results are tagged with their query; superseded requests are aborted.

### External services

**Open Food Facts** (`src/services/openFoodFactsService.ts`):
- Search: search-a-licious (`search.openfoodfacts.org/search`), two parallel queries — filtered to `countries_tags:"en:poland"` and global — merged Poland-first, deduplicated by `code`, 8 s timeout
- Barcode lookup: `world.openfoodfacts.org/api/v2/product/{barcode}.json`, keeps label kcal
- Web: search skipped (no CORS headers)

**Vision** (`src/services/visionService.ts`):
- Gemini `gemini-3.1-flash-lite` via REST `generateContent`, key in `x-goog-api-key`, structured JSON via `responseSchema`
- Returns per-ingredient `items` (name, weight_g, protein_g, carbs_g, fat_g), `confidence`, `note`; totals are summed in code
- User-facing errors are short Polish messages; details go to `console.warn`

### Theme and UI
- `src/theme/colors.ts` — warm dark palette. `muted` is the floor for readable text (≥4.5:1 on every surface); `dangerA`/`greenA` tints, `scrim`
- `src/theme/typography.ts` — Inter for all UI text (`display`, `title`, `headline`, `section`, `body`, `caption`, `label`, `micro` ≥ 11 px); Barlow Light only for short uppercase eyebrows (`stat`)
- `src/theme/layout.ts` — `radius` (incl. `control: 14`), `space`, `shadow`
- One control per job: `Button`, `FormField`, `SegmentedControl`, `Sheet` (use `height="fit"` for content-sized sheets), `Toast` (`useToast()`, optional undo action)
- Charts: `react-native-gifted-charts` on `react-native-svg` (`src/screens/home/WeightChart.tsx`, trend from `src/core/weightTrend.ts`); the diary calorie ring is plain SVG animated with reanimated `useAnimatedProps`
- Meal photos are scaled to 1280 px with `expo-image-manipulator` before they are sent to the model
- All styles via `StyleSheet.create({})`; animate transforms/opacity only

### Screen padding convention
Main screens use `paddingHorizontal: 20` (`space.xl`). Screens with `<Screen padded={false}>` manage their own padding; screens using `<Screen>` (padded default) get `padding: 20` — do not add extra horizontal padding on top. Tab screens use `noBottomInset` and pad scroll content with `FAB_CLEARANCE`.
