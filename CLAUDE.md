# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **CRITICAL**: Expo APIs change between SDK versions. Always read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any Expo code. The project targets **Expo SDK 56**, React Native 0.85, React 19.

## Commands

```bash
npm start          # Start Expo dev server (Metro bundler)
npm run android    # Build and run on Android device/emulator
npm run web        # Start in browser (OFF search disabled — CORS)
npm run api        # Start local OpenAI proxy (scripts/openai-proxy.mjs)
eas build --platform android --profile preview   # Build APK via EAS
eas update --branch preview --message "..."      # OTA JS update
```

Environment variables (set in `.env`, never commit this file):
- `EXPO_PUBLIC_OPENAI_API_KEY` — OpenAI key for vision analysis
- `EXPO_PUBLIC_OPENAI_VISION_MODEL` — override model (default: gpt-4o-mini)
- `EXPO_PUBLIC_API_BASE_URL` — base URL for local OpenAI proxy
- `EXPO_PUBLIC_OFF_USERNAME` / `EXPO_PUBLIC_OFF_PASSWORD` — Open Food Facts Basic Auth (avoids rate limiting on pl.openfoodfacts.org)

## Architecture

### Routing
Expo Router with file-based routing. Files in `app/` are thin re-exports; all logic lives in `src/screens/`.

- `app/_layout.tsx` — root Stack layout, loads fonts, mounts providers: `AuthProvider → UserProfileProvider → MealsProvider`. Tab screens use `animation: "none"` to avoid slide overlap.
- `app/index.tsx` — redirect logic (login vs home)
- `app/home.tsx` → `src/screens/home/HomeScreen.tsx`
- `app/weekly.tsx` → `src/screens/WeeklyScreen.tsx`
- `app/profile.tsx` → `src/screens/ProfileScreen.tsx`
- `app/history.tsx` → `src/screens/HistoryScreen.tsx`
- `app/add-meal/barcode.tsx`, `photo.tsx`, `manual.tsx` → their screen counterparts

### Navigation
Custom `BottomTabBar` component (not Expo Router tabs). Renders 3 equal tabs (Dziennik / Tydzień / Profil) plus a floating FAB in the bottom-right corner that opens a speed-dial with Skaner / Zdjęcie options. Tab switching uses `router.replace()`.

### Data storage
**No Firebase.** Everything is `AsyncStorage` only. Storage keys follow `ritatu:<domain>:<uid>:<dateKey>` pattern.
- `src/data/mealRepository.ts` — CRUD for `MealEntry[]` per day
- `src/data/userRepository.ts` — user profile with macro goals
- `src/data/developerRepository.ts` — dev settings, `CUSTOM_PRODUCTS_KEY`, `WEIGHTS_KEY`
- `src/data/progressPhotoRepository.ts` — progress photo metadata

### Auth
Local-only. `src/providers/AuthProvider.tsx` stores a boolean flag in AsyncStorage. Hardcoded credentials: `stas` / `1234`. `LocalUser.uid = "stas"` is the key used for all storage.

### Core data model
`MealEntry` (and `MealDraft`) stores macros **per 100 g** plus `weightG`. Actual macros are computed via:

```ts
calculateMealMacros(meal, meal.weightG)  // src/core/macroCalculator.ts
```

### HomeScreen structure
The monolith has been split. `src/screens/HomeScreen.tsx` re-exports from `src/screens/home/`:
- `HomeScreen.tsx` — orchestrator (~350 lines), manages all state
- `DiaryView.tsx` — daily log with meal sections
- `AddFoodSheet.tsx` — search sheet (search/recent/custom tabs), 500ms debounce
- `FoodDetailSheet.tsx` — amount picker before saving
- `CreateCustomSheet.tsx` — create custom products
- `MeasurementsView.tsx` — weight chart + progress photos
- `QuickAddSheet.tsx`, `AddProgressPhotoSheet.tsx`, `FormField.tsx`
- `types.ts` — `FoodItem` display type (distinct from `MealDraft`)
- `foodDb.ts` — local fallback food database

### External services

**Open Food Facts** (`src/services/openFoodFactsService.ts`):
- Search: `/cgi/search.pl?search_simple=1` — searches by product name only (avoids brand/tag false matches)
- Parallel fetch: `pl.openfoodfacts.org` + `world.openfoodfacts.org` + USDA, deduplicated by `code`
- Basic Auth via `offHeaders()` using env credentials
- Web platform: OFF fetches skipped (no CORS headers) — USDA only
- Barcode lookup: `/api/v2/product/{barcode}.json` on world subdomain

**GPT Vision** (`src/services/gptVisionService.ts`):
- Returns `dish_name`, `estimated_weight_g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g`, `confidence`, `note`
- Two modes: direct OpenAI API (key in env) or local proxy (`EXPO_PUBLIC_API_BASE_URL`)
- Prompt explicitly instructs model that liquid foods have low per-100g macros

### Theme
- `src/theme/colors.ts` — warm dark palette (`background: "#111009"`)
- `src/theme/typography.ts` — Inter family + Barlow_300Light for uppercase labels only
- `src/theme/sharedStyles.ts` — shared pressed/disabled/cta styles
- All styles via `StyleSheet.create({})` inline — no styled-components
- Fonts loaded in `app/_layout.tsx`: Inter 400/500/600/700, Barlow 300, MaterialSymbols_200ExtraLight

### Screen padding convention
All main screens use `paddingHorizontal: 20`. Screens with `<Screen padded={false}>` manage their own padding; screens using `<Screen>` (padded=true default) get `padding: 20` from the component — do not add extra horizontal padding on top.
