# Ritatu Design

## Direction

Bright, warm, and utilitarian. Ritatu should stay readable and practical, with a restrained orange accent inspired by rayzacher.pl.

## Palette

- Background paper: `#F5F0E8`
- Surface: `#FFFCF6`
- Surface alternate: `#EEE4D7`
- Warm black: `#070604`
- Text: `#1A130D`
- Muted text: `#7B6B5C`
- Border: `#E0D2C1`
- Accent orange: `#E59B5B`
- Accent hover: `#FCB26F`
- Warm tan: `#B78B65`
- Dark card: `#11100C`

Macro colors stay semantic:
- Calories: `#378ADD`
- Protein: `#639922`
- Carbs: `#BA7517`
- Fat: `#E24B4A`
- Over goal/error: `#E24B4A`

## Components

- Buttons use clear labels, at least 44 px touch height, and subtle scale-on-press feedback.
- Sheets should have clear title, readable values, and accessible form fields.
- Scanner UI should use the orange accent for focus/viewfinder, not for every surface.
- Cards use restrained borders/shadows and no nested-card visual clutter.

## Motion

- Animate only `opacity` and `transform`.
- Use calm ease-out motion, no bounce and no elastic effects.
- Press feedback should scale to about `0.96`.
- Loading and error transitions should be short and interruptible.
