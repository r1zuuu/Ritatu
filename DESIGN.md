# Ritatu Design

## Direction

Warm dark mode. Inspired by Apple Health / Nike Running aesthetics — precise, minimal, data-forward. Not aggressively black; background has a brown undertone. Orange accent used sparingly: primary actions, the current selection, and "now" (today, the current meal).

## Palette

Source of truth: `src/theme/colors.ts`.

```ts
background: "#111009"   // warm dark — brown undertone, not cold blue-black
surface:    "#181410"
card:       "#221C13"
cardHov:    "#2B2318"   // pressed rows
elevated:   "#2A2317"   // raised cards
surfaceAlt: "#2B2318"   // sunken tracks, inputs

border:     "rgba(250,240,215,0.07)"
borderMid:  "rgba(250,240,215,0.13)"

text:     "#EDE8DE"     // warm white, ~12.7:1 on elevated
mutedMid: "#B3ADA4"     // secondary text, ~7:1
muted:    "#928B83"     // floor for readable text, ≥4.5:1 on every surface

accent:  "#FF6524"      // orange — restrained, ≤10% of any surface
accentA: "rgba(255,101,36,0.10)"
accentB: "rgba(255,101,36,0.22)"

protein: "#5BB8F5"  carbs: "#E8B840"  fat: "#B89CF0"
green:   "#3BC97A"  danger: "#FF4F6B"
greenA / dangerA: 12% tints for notices
scrim:   "rgba(8,7,5,0.62)"  // behind menus, overlays on photos
```

Macro colours mean macros only. Do not reuse them for meal sections or other categories.

## Typography

Inter for all UI text, from `typography` in `src/theme/typography.ts`:

| Token | Size / line | Use |
|---|---|---|
| display | 48/52 bold, tabular | hero numbers |
| title | 28/34 bold | screen titles |
| headline | 22/28 semibold | sheet and header titles |
| section | 18/24 semibold | section titles, card headlines |
| body | 15/22 regular | body text, inputs |
| caption | 13/18 regular | secondary lines, hints |
| label | 12/16 semibold | labels, chips, buttons text accents |
| micro | 11/14 medium | data labels (axes, weekdays) — the smallest size |
| stat | 11 Barlow Light uppercase | short eyebrows only |

- Never below 11 px. Never Barlow for data or body text.
- Never `fontWeight` without a font family: it silently falls back to the system font.
- Numbers that change or line up use `fontVariant: ["tabular-nums"]`.
- Polish decimals use a comma (`formatDecimal`), Polish grammar after prepositions (`SECTION_GENITIVE`: "Dodaj do obiadu").

## Icons

`src/components/Icon.tsx` wraps MaterialSymbols_200ExtraLight by name. Inactive icons use `colors.mutedMid`, active/primary `colors.accent`. List rows use neutral icons or photo thumbnails, not orange circles.

## Components

One component per job, used everywhere:
- **Button** (`primary` / `secondary` / `ghost` / `danger`), 52 px, radius `control` (14)
- **FormField** for text and number inputs
- **SegmentedControl** for any "pick one of a few": raised segment on a sunken track
- **Sheet** for every bottom sheet: spring open, backdrop fade, bottom safe area, 44 px close. `height="fit"` sizes to content (max 92%); scrolling content goes in a `ScrollView` with actions pinned below it
- **Toast** (`useToast`) confirms saves; deletes offer "Cofnij" instead of a dialog when undo is possible. Irreversible deletes (photo files, data wipes, demo seed) ask with `Alert` first.
- **Card**: `flat`, `elevated` (default), `hero`
- **BottomTabBar**: 4 tabs, one sliding pill (always painted, radius = height/2), floating 56 px FAB with speed-dial
- Tap targets ≥ 44 px (IconButton adds hitSlop)
- Empty states explain what to do next and offer the action; no dead ends

## Motion

- Animate only `opacity` and `transform` — never layout properties (bars slide with translate, they do not animate width or height)
- Spring config: `{ damping: 30, stiffness: 200, mass: 1.0 }` — near-critically damped, no bounce
- Entrances: `FadeInDown` ~320 ms with short staggers; tabs cross-fade
- Press feedback: scale 0.96 on compact controls, `cardHov` tint on full-width rows

## Banned patterns

- Side-stripe `borderLeftWidth` as decorative accent — use full borders or background tints instead
- Gradient text
- Glassmorphism as default styling
- Barlow font on body/data text
- `pointerEvents` as prop — use `style.pointerEvents` (RN 0.85 New Architecture)
- Cold blue-black overlays (`rgba(10,10,14,…)`) — use `colors.scrim`
