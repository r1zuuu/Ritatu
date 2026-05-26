# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **CRITICAL**: Expo APIs change between SDK versions. Always read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any Expo code. The project targets **Expo SDK 56**, React Native 0.85, React 19.

## Commands

```bash
npm start          # Start Expo dev server (opens Metro bundler)
npm run android    # Build and run on Android device/emulator
npm run ios        # Build and run on iOS simulator
npm run web        # Start in browser
npm run api        # Start local OpenAI proxy (scripts/openai-proxy.mjs) — required for AI photo analysis
```

Environment variables (set in `.env`, read through `src/config/env.ts` via `expo-constants`):
- `EXPO_PUBLIC_API_BASE_URL` — base URL for the OpenAI proxy
- `EXPO_PUBLIC_OPENAI_API_KEY` / `OPENAI_API_KEY` — OpenAI key for vision
- `EXPO_PUBLIC_OPENAI_VISION_MODEL` — vision model name

## Architecture

### Routing
Expo Router with file-based routing. Files in `app/` map to routes:
- `app/_layout.tsx` — root layout, mounts providers: `AuthProvider → UserProfileProvider → MealsProvider`
- `app/index.tsx` — redirect logic (login vs home)
- `app/home.tsx` → `src/screens/HomeScreen.tsx`
- `app/add-meal/index.tsx`, `barcode.tsx`, `manual.tsx`, `photo.tsx` → their screen counterparts

Screen logic lives in `src/screens/`; `app/` files are thin re-exports.

### Data storage
**No Firebase.** Everything is `AsyncStorage` only. Storage keys follow `ritatu:<domain>:<uid>:<dateKey>` pattern. Key repositories:
- `src/data/mealRepository.ts` — CRUD for `MealEntry[]` per day, stored as JSON
- `src/data/userRepository.ts` — user profile
- `src/data/developerRepository.ts` — developer settings + `CUSTOM_PRODUCTS_KEY`, `WEIGHTS_KEY`
- `src/data/progressPhotoRepository.ts` — progress photo metadata + file persistence

### Auth
Local-only. `src/providers/AuthProvider.tsx` stores a boolean flag in AsyncStorage. Hardcoded credentials: `stas` / `1234`. `LocalUser.uid = "stas"` is the key used for all meal storage.

### Core data model
`MealEntry` (and `MealDraft`) stores macros **per 100 g** (`proteinPer100g`, `carbsPer100g`, `fatPer100g`) plus `weightG` (the actual eaten weight). Actual macros are always computed via:

```ts
calculateMealMacros(meal, meal.weightG)  // src/core/macroCalculator.ts
```

The macro calculator multiplies per-100g values by `weightG / 100`. This means a `weightG` of 320 with `proteinPer100g = 30` yields 96g protein.

### HomeScreen
`src/screens/HomeScreen.tsx` is a large self-contained monolith (~1500 lines). It owns:
- `DiaryView` — daily log with sections (Śniadanie / Obiad / Kolacja / Przekąska)
- `AddFoodSheet` — search sheet with tabs (search/recent/custom), queries Open Food Facts on 500ms debounce
- `FoodDetailSheet` — amount picker before confirming add
- `CreateCustomSheet` — creates custom products (saved to `CUSTOM_PRODUCTS_KEY`)
- `MeasurementsView` — weight trend chart + progress photos

`FoodItem` (home-screen display type) is distinct from `MealDraft` (save format). Key flag: `per100: boolean` — if true, `amount` is in grams; if false, `amount` is a count of portions and `weightG` is stored as `amount * 100`.

### External services
- `src/services/openFoodFactsService.ts` — barcode lookup (`lookupProductByBarcode`) and name search (`searchProductsByName`) against `pl.openfoodfacts.org`
- `src/services/gptVisionService.ts` — OpenAI vision for photo meal analysis, calls the local proxy

### Theme
Flat token files: `src/theme/colors.ts`, `src/theme/typography.ts`, `src/theme/spacing.ts`. No styled-components or CSS-in-JS — all styles are `StyleSheet.create({})` inline in each file.
