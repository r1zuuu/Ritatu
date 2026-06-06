# Ritatu Design

## Direction

Warm dark mode. Inspired by Apple Health / Nike Running aesthetics — precise, minimal, data-forward. Not aggressively black; background has a brown undertone. Orange accent used sparingly for primary actions only.

## Palette

```ts
background: "#111009"   // warm dark — brown undertone, not cold blue-black
surface:    "#181410"
card:       "#1E1A12"
cardHov:    "#252018"
surfaceAlt: "#252018"

border:     "rgba(250,240,215,0.07)"
borderMid:  "rgba(250,240,215,0.13)"

text:     "#EDE8DE"     // warm white
muted:    "#6C6660"
mutedMid: "#9C9690"

accent:      "#FF6524"  // orange — restrained, ≤10% of any surface
accentHover: "#FF7A43"
accentA:     "rgba(255,101,36,0.10)"
accentB:     "rgba(255,101,36,0.22)"

protein: "#5BB8F5"   // calm blue (Apple Health)
carbs:   "#E8B840"   // warm amber
fat:     "#B89CF0"   // soft violet
green:   "#3BC97A"
danger:  "#FF4F6B"

warmBlack: "#111009"
kcal:      "#FF6524"
```

## Typography

Font families loaded in `app/_layout.tsx`:
- `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold` — all body and UI text
- `Barlow_300Light` — uppercase eyebrow/stat labels only (10–12px, letterSpacing, textTransform uppercase)
- `MaterialSymbols_200ExtraLight` — icon font (ultra-thin strokes, Apple SF-like weight)

Never use Barlow for readable body text — only for decorative uppercase labels.

## Icons

`src/components/Icon.tsx` wraps MaterialSymbols_200ExtraLight. Icon containers have no border and no background unless they serve a specific affordance (e.g. FAB). Use `colors.mutedMid` for inactive icons, `colors.accent` for active/primary.

## Components

- **Pressable feedback**: `opacity: 0.86, scale: 0.96` (from `sh.pressed` in `src/theme/sharedStyles.ts`)
- **Buttons**: 50px height, `borderRadius: 14`, accent background, warmBlack text
- **Cards**: `borderRadius: 16–22`, `borderWidth: 1`, `colors.border`
- **Sheets**: spring animation (damping 30, stiffness 200), slides from bottom, backdrop fades
- **BottomTabBar**: 3 equal flex:1 tabs + floating FAB (56px circle, accent bg, bottom-right, `right: 20`)

## Motion

- Animate only `opacity` and `transform` — never layout properties
- Spring config: `{ damping: 30, stiffness: 200, mass: 1.0 }` — near-critically damped, no bounce
- Stagger: `FadeInUp.delay(idx * 55).duration(240).easing(Easing.out(Easing.cubic))`
- Tab transitions: `animation: "none"` — instant, no slide overlap
- Press feedback: scale to 0.96

## Banned patterns

- Side-stripe `borderLeftWidth` as decorative accent — use full borders or background tints instead
- Gradient text
- Glassmorphism as default styling
- Barlow font on body/data text
- `pointerEvents` as prop — use `style.pointerEvents` (RN 0.85 New Architecture)
