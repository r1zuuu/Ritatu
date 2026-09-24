# Ritatu Project Context

Last updated: 2026-09-24

## Current Project State

Ritatu is a React Native + Expo SDK 56 + TypeScript macro tracker. Fully local: no backend, no accounts, all data in AsyncStorage. Architecture details live in `CLAUDE.md`; this file keeps product and operational context.

### What is implemented

- Four real tabs (Dziennik / Tydzień / Pomiary / Profil) with a sliding pill and a FAB speed-dial (Wyszukaj / Skanuj kod / Zdjęcie AI)
- Diary with a week strip, meal sections and a day that every add path respects
- Product search: local DB and custom products first, Open Food Facts (Poland first, then world) below
- Barcode scanner, meal photo analysis (Gemini 3.1 Flash-Lite), quick kcal entries, custom products
- Week stats with history, goal line, streak; a five-week days calendar in Pomiary
- Optional kcal floor: days under it are "nieliczone" (out of averages, goal stats and streaks)
- Weigh-ins (one per day, history with undo) and progress photos stored in app documents
- Toasts for every save, undo for deletes, CSV export of meals and days
- Onboarding that doubles as "edit my data" from Profile

### Auth

None. `useAuth()` returns a constant user with `uid: "user"`; every storage key depends on it.

## Product Rules

- Label energy (`kcalPer100g`) wins when present; otherwise kcal = protein*4 + carbs*4 + fat*9
- AI returns ingredients with grams and macros; totals are summed in code
- The user confirms weight (or kcal) before saving any meal
- No micros, no subscriptions, no social features

## Macro colors

- kcal: `#FF6524` (orange, same as accent)
- protein: `#5BB8F5` (blue)
- carbs: `#E8B840` (amber)
- fat: `#B89CF0` (violet)
- over goal: `#FF4F6B` (red/danger)

## Environment Variables

```env
EXPO_PUBLIC_GEMINI_API_KEY=""
EXPO_PUBLIC_OFF_USERNAME=""
EXPO_PUBLIC_OFF_PASSWORD=""
```

`.env` is gitignored. Never commit secrets. Keys created in AI Studio since mid-2026 use the `AQ.` format and go in the `x-goog-api-key` header.

## Open Food Facts

- Search: `search.openfoodfacts.org/search` (search-a-licious); the old `/cgi/search.pl` returns 503
- No diacritic folding on the OFF side ("losos" finds nothing), so local matching folds diacritics itself
- Two parallel queries (Poland-filtered and global), merged Poland-first, deduplicated by `code`
- Barcode: `world.openfoodfacts.org/api/v2/product/{barcode}.json`
- Web platform: search skipped (no CORS headers)

## Vision

- Model: `gemini-3.1-flash-lite` (2026 benchmark of 3229 meal photos: near-best calorie accuracy, best ingredient recognition, about the same per-photo cost as GPT-5.6 Luna)
- REST `generateContent` with `responseSchema`; Polish names; refine re-analyses with the user's edited ingredients

## EAS

- Project ID: `17100aa9-d04f-433e-9ff8-e1f2d85ec48e`
- Build profile: `preview` (internal distribution APK)
- Update branch: `preview`
- OTA update: JS-only changes → `eas update --branch preview --message "..."`
- Full rebuild required: native libs, icons, permissions, `app.config.js` native settings (`runtimeVersion` follows the app version)

## Development Preferences

- No new packages without explicit agreement
- No Firebase, no remote database
- Comments only for non-obvious logic
- All styles via `StyleSheet.create({})` — no styled-components
- `paddingHorizontal: 20` on all main screens (consistent safe margin)
- TypeScript strict — run `npx tsc --noEmit` before declaring a feature done
