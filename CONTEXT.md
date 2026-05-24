# Ritatu Project Context

Last updated: 2026-05-24

## Current Project State

Ritatu is a React Native + Expo + TypeScript macro tracker converted from the original Flutter plan.

Implemented MVP areas:
- Expo Router app structure in `app/`.
- Core nutrition calculations in `src/core/macroCalculator.ts`.
- Firebase config/auth/firestore services in `src/services/` and `src/data/`.
- Providers for auth, user profile, and meals in `src/providers/`.
- Screens for login, onboarding, home, add meal, barcode scan, photo scan, manual entry, profile, and history in `src/screens/`.
- Shared UI components in `src/components/`.
- Daily meals cache through AsyncStorage.
- Slice 1 scanner/UI polish started: Open Food Facts v2 lookup, improved barcode scanner states, accessibility labels/hints, warm orange accent palette.
- `PRODUCT.md` and `DESIGN.md` now exist for future `impeccable` UI work.

Verification that was passing after implementation:
- `npx tsc --noEmit`
- Metro bundle request: `http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false`

Dev server was started with:

```sh
npm start -- --port 8081
```

## Important Product Rules

- Calories are never stored. They are always calculated from macros:
  `protein * 4 + carbs * 4 + fat * 9`.
- AI never returns final calories. AI returns dish name, macros per 100 g, and estimated weight.
- User must always confirm/edit weight before saving any meal.
- Macro colors:
  - kcal: `#378ADD`
  - protein: `#639922`
  - carbs: `#BA7517`
  - fat: `#E24B4A`
  - over goal: red `#E24B4A`
- No micros, subscriptions, social features, or custom product database.

## Firestore Shape

Current practical implementation:
- User profile document: `users/{uid}`
- Meals collection: `meals/{mealId}` with `userId`

Meal day query:
- `userId == uid`
- `timestamp >= startOfDay`
- `timestamp < endOfDay`
- `orderBy(timestamp, desc)`

Note: the original plan wrote `users/{uid}/profile`, but Firestore document paths need an even number of path segments. `users/{uid}` is the current profile document.

## Environment Variables

Set these before testing real auth/API flows:

```sh
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_API_BASE_URL=
```

## Open Food Facts API Notes

Before doing any new barcode scanning feature, read or re-check the official docs:
- Main API docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
- API cheatsheet: https://openfoodfacts.github.io/openfoodfacts-server/api/ref-cheatsheet/
- Barcode scanning guide: https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/scanning-barcodes/

Key rules from the docs:
- Current stable API version is v2.
- Product lookup should use:
  `GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
- Limit response payload with `fields`, for example:
  `fields=code,product_name,nutriments`
- Open Food Facts asks clients to set a custom User-Agent identifying the app.
- Read product queries do not need authentication.
- Rate limits matter:
  - product reads: 15 requests/min/IP
  - search reads: 10 requests/min/IP
- Do not build search-as-you-type against Open Food Facts search endpoints.
- For scanned EAN/UPC values, do not hand-normalize aggressively. OFF server normalizes common barcode forms; validate only when needed.
- Barcode scan UX should include:
  - clear viewfinder/instructions,
  - loading state immediately after scan,
  - manual fallback,
  - graceful product-not-found state,
  - clear network/server error messages.

Current implementation file:
- `src/services/openFoodFactsService.ts`

Current barcode behavior:
- Uses API v2 product lookup with `fields=code,product_name,nutriments,image_front_url`.
- Returns separate `found`, `not_found`, `incomplete`, and `network_error` states.
- Sends `User-Agent` from fetch headers. Browser targets may block this; keep backend/proxy in mind for production.
- Scanner screen keeps users in flow and offers retry/manual entry instead of abrupt redirect.

## OpenAI Vision Notes

Current implementation file:
- `src/services/gptVisionService.ts`

Keep the original product rule:
- GPT returns JSON only.
- It returns dish name, estimated weight, confidence, macros per 100 g, and note.
- The app calculates calories and always shows `MacroConfirmSheet`.
- React Native must not contain an OpenAI API key.
- `OPENAI_API_KEY` belongs only on the backend/proxy.
- The app calls `POST {EXPO_PUBLIC_API_BASE_URL}/analyze-meal-photo` with `{ imageBase64, mimeType }`.
- Expected backend response can be either the `VisionMealResult` JSON directly or `{ "result": VisionMealResult }`.

## Development Preferences

- Keep files complete and small.
- No new packages unless the user agrees.
- Prefer existing components/providers over adding new architecture.
- Comments only for non-obvious logic.
- User prefers fast implementation; tests are skipped for now, but TypeScript verification should be run before claiming completion.
- For UI animation, micro-interactions, polish, or visual redesign, use the `impeccable` skill before changing UI files.
- When `impeccable` applies, follow its motion rules: do not animate layout properties, use ease-out quart/quint/expo style motion, avoid bounce/elastic effects, and run its required preflight for real UI implementation work.

## Local Skills Worth Using

Use these installed skills when relevant:
- `impeccable`: UI polish, visual direction, color, layout, animation, micro-interactions.
- `make-interfaces-feel-better`: smaller UI details such as spacing, touch feedback, cards, shadows, typography, empty states.
- `react-best-practices`: React/React Native component structure, rendering performance, hooks, memoization, data flow.
- `accessibility`: accessibility pass before shipping UI screens, especially forms, scanner, onboarding, and sheets.
- `api-design`: any backend/proxy/API design, especially if OpenAI or Open Food Facts calls move behind a server.
- `openai-docs`: before changing OpenAI model usage, Vision request shape, structured outputs, or prompt strategy.
- `security-review`: auth, Firestore rules, env/secrets, OpenAI key exposure, user data access.
- `debug-like-expert`: stubborn runtime issues, Firebase auth problems, Expo camera/scanner failures.
- `lint`: formatting/linting pass when a linter is added.
- `review`: code review stance before PR/commit.
- `verify-before-complete`: before saying a feature is done; always produce fresh verification evidence.

## Visual Direction Notes

Color inspiration requested from https://www.rayzacher.pl/en, lightly adapted, not copied 1:1.

Observed palette:
- warm orange accent: `#E59B5B`
- orange hover/highlight: `#FCB26F`
- muted warm tan: `#B78B65`
- paper cream: `#F5F0E8`
- near-black warm base: `#070604`
- card dark: `#11100C`

Ritatu direction:
- Keep Ritatu mostly bright, clean, food-tracker friendly.
- Use the orange as a restrained accent for primary actions, scan/photo moments, focus states, and selected controls.
- Keep macro semantic colors stable: kcal blue, protein green, carbs yellow/orange, fat red.
- Avoid turning the whole app into the dark portfolio palette. The inspiration is warmth and orange accent energy, not a full dark site clone.
- If implementing visual changes, use `impeccable` first and consider adding proper `PRODUCT.md` / `DESIGN.md` so the skill has stable project context.

## Manual Setup Checklist

You need to configure these by hand:
- Firebase project in the Firebase Console.
- Web app in Firebase project, then copy Firebase web config into env variables.
- Enable Firebase Authentication.
- Enable Google provider in Firebase Auth.
- Configure OAuth consent screen / Google Cloud credentials if Google Sign-In requires it.
- Create Firestore database.
- Add Firestore indexes if the day meals query asks for one in the console.
- Add Firestore security rules before any real user testing.
- Create an OpenAI API key.
- Keep the OpenAI API key only in backend/proxy env as `OPENAI_API_KEY`; never expose it as `EXPO_PUBLIC_*`.
- Provide `EXPO_PUBLIC_API_BASE_URL` to the mobile app once the proxy exists.
- Register/fill Open Food Facts API usage form before serious usage and use a custom app User-Agent when improving barcode requests.
