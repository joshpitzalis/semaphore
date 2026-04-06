# Plan: `<LoadingFacts />` Component

A reusable loading state component that displays a spinner alongside rotating "Did you know?" facts about semaphore/signaling history.

---

## Component: `src/components/LoadingFacts.tsx`

### Props

- `message?: string` — optional heading text (defaults to "Loading...")

### Behavior

- Picks a random starting index so it doesn't always begin with the same fact
- Cycles sequentially through all 11 facts every ~3 seconds each
- Crossfade transition between facts (consistent with existing `duration-200`/`duration-300` patterns)

### Layout

```
        [spinner]

     Did you know?
  "fact text here..."
```

- Centered on screen: `flex items-center justify-center min-h-[200px]`
- Spinner: CSS spinning ring using `border-ink/20` + `border-t-ink`, Tailwind `animate-spin`
- "Did you know?" label: `text-sm font-semibold tracking-wide text-ink-soft uppercase` (matches `StatusLabel` style)
- Fact text: regular `text-ink`, `max-w-sm`, centered

### Facts

Stored as a `const` array inside the component file:

1. "Semaphore" literally means "sign carrier" — from Ancient Greek.
2. Ancient Greeks relayed messages by lighting fires on mountaintops 30 km apart.
3. Byzantines could send a message 720 km in about one hour using beacon towers.
4. The optical telegraph was invented in 1792 by a French clergyman.
5. Napoleon's semaphore network turned days-long messages into hours.
6. The Royal Navy first used dots and dashes from a signal lamp in 1867.
7. Flag semaphore is still used by navies during at-sea resupply operations.
8. Heliographs — mirrors flashing sunlight in Morse code — were used by armies until the 1960s.
9. Railway semaphore: horizontal = stop, vertical = clear, inclined = caution.
10. The Greeks built a hydraulic telegraph powered by water pressure in the 4th century BC.
11. The Dalén lighthouse lamp could automatically ignite at sunset and extinguish at dawn.
12. The electric telegraph made visual semaphore obsolete by the 1840s.

---

## Files changed

| File | Change |
|---|---|
| `src/components/LoadingFacts.tsx` | New component |

No other files are modified. Drop `<LoadingFacts />` into any route as needed.
