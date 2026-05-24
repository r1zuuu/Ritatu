# Codebase Map

Generated: 2026-05-24T15:50:30Z | Files: 56 | Described: 0/56
<!-- gsd:codebase-meta {"generatedAt":"2026-05-24T15:50:30Z","fingerprint":"c8bae3dbc316bd464011e521ea0dcc4f9b3a15eb","fileCount":56,"truncated":false} -->

### (root)/
- `.env`
- `.gitignore`
- `AGENTS.md`
- `app.config.js`
- `app.json`
- `CLAUDE.md`
- `CONTEXT.md`
- `DESIGN.md`
- `LICENSE`
- `package-lock.json`
- `package.json`
- `PRODUCT.md`
- `tsconfig.json`

### app/
- `app/_layout.tsx`
- `app/+native-intent.ts`
- `app/history.tsx`
- `app/home.tsx`
- `app/index.tsx`
- `app/login.tsx`
- `app/onboarding.tsx`
- `app/profile.tsx`

### app/add-meal/
- `app/add-meal/barcode.tsx`
- `app/add-meal/index.tsx`
- `app/add-meal/manual.tsx`
- `app/add-meal/photo.tsx`

### src/components/
- `src/components/Button.tsx`
- `src/components/MacroConfirmSheet.tsx`
- `src/components/MealCard.tsx`
- `src/components/NutritionBar.tsx`
- `src/components/Screen.tsx`
- `src/components/SegmentedControl.tsx`
- `src/components/TextField.tsx`

### src/config/
- `src/config/env.ts`

### src/core/
- `src/core/date.ts`
- `src/core/macroCalculator.ts`

### src/data/
- `src/data/mealRepository.ts`
- `src/data/serializers.ts`
- `src/data/types.ts`
- `src/data/userRepository.ts`

### src/providers/
- `src/providers/AuthProvider.tsx`
- `src/providers/MealsProvider.tsx`
- `src/providers/UserProfileProvider.tsx`

### src/screens/
- `src/screens/AddMealScreen.tsx`
- `src/screens/BarcodeScanScreen.tsx`
- `src/screens/HistoryScreen.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/LoginScreen.tsx`
- `src/screens/ManualEntryScreen.tsx`
- `src/screens/OnboardingScreen.tsx`
- `src/screens/PhotoScanScreen.tsx`
- `src/screens/ProfileScreen.tsx`

### src/services/
- `src/services/firebase.ts`
- `src/services/gptVisionService.ts`
- `src/services/openFoodFactsService.ts`

### src/theme/
- `src/theme/colors.ts`
- `src/theme/spacing.ts`
