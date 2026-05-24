# Graph Report - .  (2026-05-24)

## Corpus Check
- Corpus is ~28,835 words - fits in a single context window. You may not need a graph.

## Summary
- 346 nodes · 610 edges · 26 communities (19 shown, 7 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `Codebase Map` - 43 edges
2. `colors` - 18 edges
3. `expo` - 11 edges
4. `useAuth()` - 11 edges
5. `useMeals()` - 11 edges
6. `Screens Collection` - 10 edges
7. `Button()` - 9 edges
8. `Screen()` - 9 edges
9. `round()` - 9 edges
10. `useUserProfile()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Firebase Services` --references--> `src/services/firebase.ts`  [INFERRED]
  CONTEXT.md → .gsd/CODEBASE.md
- `Screens Collection` --references--> `src/screens/LoginScreen.tsx`  [INFERRED]
  CONTEXT.md → .gsd/CODEBASE.md
- `Screens Collection` --references--> `src/screens/OnboardingScreen.tsx`  [INFERRED]
  CONTEXT.md → .gsd/CODEBASE.md
- `Screens Collection` --references--> `src/screens/HomeScreen.tsx`  [INFERRED]
  CONTEXT.md → .gsd/CODEBASE.md
- `Screens Collection` --references--> `src/screens/AddMealScreen.tsx`  [INFERRED]
  CONTEXT.md → .gsd/CODEBASE.md

## Hyperedges (group relationships)
- **Ritatu Core Technology Stack** — context_ritatu_app, codebase_firebase_service, codebase_macro_calculator_file, codebase_off_service_file, codebase_gpt_vision_service_file [INFERRED 0.95]
- **Meal Logging Flow** — codebase_add_meal_screen, codebase_barcode_scan_screen, codebase_photo_scan_screen, codebase_manual_entry_screen, codebase_macro_confirm_sheet, codebase_meal_repository [INFERRED 0.85]
- **Provider Layer** — codebase_auth_provider, codebase_meals_provider, codebase_user_profile_provider, codebase_firebase_service [INFERRED 0.85]
- **Ritatu Design System** — design_palette, design_motion_rules, design_components, codebase_colors_theme, codebase_spacing_theme [INFERRED 0.85]

## Communities (26 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (37): Button(), ButtonProps, styles, MacroConfirmSheet(), MacroConfirmSheetProps, styles, toNumber(), Screen() (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (55): app/add-meal/barcode.tsx, app/add-meal/index.tsx, app/add-meal/manual.tsx, app/add-meal/photo.tsx, src/screens/AddMealScreen.tsx, app/history.tsx, app/home.tsx, app/index.tsx (+47 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (40): MealCard(), sourceLabel, styles, ItemProps, NutritionBar(), NutritionBarProps, ProgressItem(), styles (+32 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (30): IndexRoute(), env, extra, ExtraConfig, isApiConfigured, isFirebaseConfigured, isGoogleAuthConfigured, profileFromDoc() (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (29): dependencies, expo, expo-auth-session, expo-camera, expo-constants, expo-image-picker, expo-router, expo-status-bar (+21 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (19): endOfDay(), startOfDay(), toDateKey(), summarizeMeals(), addMeal(), cacheKey(), cacheMealsForDay(), dayQuery() (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (19): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (15): src/theme/colors.ts, Impeccable UI Skill, Macro Semantic Colors, openFoodFactsService.ts, Open Food Facts API v2 Integration, Ritatu Project Context, Visual Direction and Color Palette, Ritatu UI Component Guidelines (+7 more)

### Community 8 - "Community 8"
Cohesion: 0.38
Nodes (7): 3D Glossy / Glassmorphism Style, App Icon, Blue Color Scheme, Brand Identity, Chevron / Upward Arrow Shape, Light Blue Background, Mobile App

### Community 9 - "Community 9"
Cohesion: 0.50
Nodes (5): Android Icon Background, Android Adaptive Icon, Concentric Circles, Light Blue Background, Safe Zone / Keyline Grid

### Community 10 - "Community 10"
Cohesion: 0.40
Nodes (4): activeQueuePhase, pendingGateId, verifiedApprovalGates, verifiedDepthMilestones

### Community 11 - "Community 11"
Cohesion: 0.50
Nodes (5): App Branding Asset, Concentric Circles Motif, Grid Background Pattern, Minimal Monochrome Design Style, Splash Screen Icon

### Community 12 - "Community 12"
Cohesion: 0.67
Nodes (4): Android Adaptive Icon Foreground Layer, Android Icon Foreground - App Logo Mark, Blue Gradient Brand Color, Upward Chevron / Caret Shape

### Community 13 - "Community 13"
Cohesion: 0.67
Nodes (4): Android Adaptive Icon Monochrome Layer, Android Monochrome App Icon, App Brandmark / Logo Mark, Upward Chevron / Caret Shape

### Community 14 - "Community 14"
Cohesion: 0.67
Nodes (4): App Favicon Icon, Brand Blue Color, Expo Mobile App, Letter A / Navigation Arrow Symbol

### Community 15 - "Community 15"
Cohesion: 0.50
Nodes (3): compilerOptions, strict, extends

## Knowledge Gaps
- **121 isolated node(s):** `firebaseConfig`, `name`, `slug`, `version`, `orientation` (+116 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Codebase Map` connect `Community 1` to `Community 7`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `colors` connect `Community 0` to `Community 2`, `Community 3`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `Ritatu App` connect `Community 1` to `Community 7`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `firebaseConfig`, `name`, `slug` to the rest of the system?**
  _130 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08181818181818182 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.057912457912457915 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07312925170068027 - nodes in this community are weakly interconnected._