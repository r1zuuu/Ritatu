# Ritatu Project Context

Last updated: 2026-06-06

## Current Project State

Ritatu is a React Native + Expo SDK 56 + TypeScript macro tracker. Fully local — no Firebase, no backend, no authentication server. All data in AsyncStorage.

### What is implemented

- Expo Router file-based navigation with custom BottomTabBar (3 tabs + FAB speed-dial)
- HomeScreen split into focused components under `src/screens/home/`
- DiaryView — daily log with meal sections, date navigation
- AddFoodSheet — product search with 3 tabs (search/recent/custom), 500ms debounce
- Open Food Facts search (CGI endpoint, name-only, pl + world parallel, Basic Auth, CORS-safe)
- Barcode scanner screen
- Photo analysis screen (GPT-4o mini vision, macro estimation per 100g)
- WeeklyScreen — bar chart, 7-day dots, macro averages, weekly insights (flags macros below 80% of goal)
- ProfileScreen — color-coded 2×2 goal tiles, settings list
- HistoryScreen — scrollable meal history by day
- Progress photos and weight tracking (MeasurementsView)
- Custom products (saved to AsyncStorage)
- Quick add (one-shot meal without product lookup)
- MacroConfirmSheet — confirm/edit AI analysis before saving
- EAS Build + EAS Update configured (branch: preview)

### Auth

Local only. Hardcoded: `stas` / `1234`. `LocalUser.uid = "stas"`.

## Product Rules

- Calories are never stored — always calculated: `protein * 4 + carbs * 4 + fat * 9`
- AI vision returns macros per 100g + estimated weight, never final calories
- User must confirm weight before saving any meal
- No micros, no subscriptions, no social features

## Macro colors

- kcal: `#FF6524` (orange, same as accent)
- protein: `#5BB8F5` (blue)
- carbs: `#E8B840` (amber)
- fat: `#B89CF0` (violet)
- over goal: `#FF4F6B` (red/danger)

## Environment Variables

```env
EXPO_PUBLIC_OPENAI_API_KEY=""
EXPO_PUBLIC_OPENAI_VISION_MODEL=""
EXPO_PUBLIC_API_BASE_URL=""
EXPO_PUBLIC_OFF_USERNAME=""
EXPO_PUBLIC_OFF_PASSWORD=""
```

`.env` is gitignored. Never commit secrets.

## Open Food Facts

- Search endpoint: `/cgi/search.pl?search_simple=1&action=process&json=1` — name-only search, avoids brand/tag false positives
- Barcode endpoint: `/api/v2/product/{barcode}.json`
- Parallel sources: `pl.openfoodfacts.org` + `world.openfoodfacts.org` + USDA, deduplicated by `code`
- Basic Auth via `EXPO_PUBLIC_OFF_*` env vars to avoid rate limiting
- Web platform: OFF fetches skipped (no CORS headers on OFF subdomains)

## OpenAI Vision

- Default model: `gpt-4o-mini`
- Two modes: direct API (key in env) or local proxy (`npm run api`)
- Returns JSON: `dish_name`, `estimated_weight_g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g`, `confidence`, `note`
- Prompt instructs model that liquid foods (smoothies, soups) have low per-100g values (60–130 kcal/100g)
- Refine flow: user can add context and re-analyze with the same photo

## EAS

- Project ID: `17100aa9-d04f-433e-9ff8-e1f2d85ec48e`
- Build profile: `preview` (internal distribution APK)
- Update branch: `preview`
- OTA update: JS-only changes → `eas update --branch preview --message "..."`
- Full rebuild required: native libs, icons, permissions, `app.config.js` native settings

## Development Preferences

- No new packages without explicit agreement
- No Firebase, no remote database
- Comments only for non-obvious logic
- All styles via `StyleSheet.create({})` — no styled-components
- `paddingHorizontal: 20` on all main screens (consistent safe margin)
- TypeScript strict — run `npx tsc --noEmit` before declaring a feature done
