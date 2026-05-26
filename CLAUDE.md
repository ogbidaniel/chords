# Notes for Claude

This is a personal jazz piano practice app for Ogbi (Daniel Ogbuigwe). The
project is unusual in a few ways — important context for any future session.

## Pedagogical foundation

The app is built around **PianoPig's 6-step practice plan**:

1. Practice maj7, dom7, and m7 in every key
2. Play through jazz standards using those chords
3. Practice inversions of all 3 chord types in every key
4. Play standards using inverted chords
5. Use combinations of inversions to minimize hand movement
6. Repeat over more standards until easy

PianoPig's core insight is that **inversions don't change chord identity**.
Cmaj7 is Cmaj7 whether played root position or inverted. The app's chord
detection embodies this: pitch-class based, voicing-invariant.

## What is and isn't here

**There are no errors anywhere in this app.** The user explicitly rejected any
"strict mode" where a wrong note flashes red or gates progression. The
philosophy is:

- The notation **is** the prompt
- The user plays freely against it
- Notes that match the expected notation light up amber
- Notes that don't match still play, just don't get a special color
- No "advance when correct" gating, ever

If you find yourself adding a "wrong" state, an error indicator, or anything
that judges the user's playing — stop. That's not what this app is.

## Audio

The app makes **no sound** beyond an optional metronome. The user plays through
Ableton (or any DAW). Don't add synth output, don't suggest it; this has been
explicitly deferred multiple times.

## Architecture

- Vanilla JavaScript, no framework, no bundler. Each module attaches to `window`.
- Modules are loaded in dependency order via `<script>` tags in `index.html`.
- VexFlow is loaded from CDN for real engraved notation. Hand-rolled SVG
  music notation was tried and rejected — too crude.
- All persistence in localStorage.

## Modules (in load order)

- `theory.js` — chord detection (voicing-invariant), Roman numeral parser,
  progression realizer, key signatures, scale data.
- `midi.js` — passive Web MIDI; tracks held notes with velocity; supports
  sustain pedal. Used for atmospheric energy.
- `energy.js` — drives `--energy` CSS variable from played velocities;
  decays exponentially; sets quality classes on `<body>`.
- `keyboard.js` — SVG piano. Two states: `.playing` (blue), `.match` (amber).
  No "wrong" state.
- `notation.js` — VexFlow integration. Renders scales, chord stacks, and
  progressions. Tags noteheads with `data-midi` for highlighting.
- `metronome.js` — Web Audio brush metronome. The only sound the app makes.
- `router.js` — hash router with `:param` patterns.
- `practice-history.js` — tracks recently visited drill routes.
- `components/circle-of-fifths.js` — clickable circle widget; persistent
  highlight + transient pulse.
- `components/drill-shell.js` — shared chrome for all drill pages.

## Pages

Pages live in `js/pages/`. Each page is an IIFE returning `{ render }`.
The drill pages all use `DrillShell` for consistent chrome.

## Routes

```
/play                                      Play home
/practice                                  Landing
/practice/scales                           Scales hub
/practice/scales/:mode/:key                Scale drill
/practice/chord-types                      Chord types hub
/practice/chord-types/:type                Chord type drill
/practice/progressions                     Progressions hub
/practice/progressions/:cat                Progression category
/practice/progressions/:cat/:id            Progression drill
/book                                      Book placeholder
/inspiration                               YouTube grid
```

## Atmospheric drift

The background drift is driven by MIDI velocity. The `Energy` module reads
velocities globally and writes `--energy` (0..1) to `<body>`. Drift opacity
scales with energy. Quality-mapped colors come from chord detection
(major=amber, dominant=orange, minor=blue/violet, half-dim=greyish-blue).

In silence, energy decays to zero and the canvas settles to almost-black.

## Aesthetic

"A private practice room at night." Almost-black canvas (`#08080d`).
Engraved-paper notation surface (`#f4ecd8`). Cormorant Garamond display.
Inter Tight body. JetBrains Mono UI. Frosted-glass sidebar.

## Deferred (don't add unless asked)

- Audio synth / grand piano samples
- Per-chord stats tracking with practice counts
- Cloudflare KV cross-device sync
- Photograph extraction for Weissman book pages (handled separately)
- Voice-leading mode (PianoPig step 5)
- Always-on circle of fifths visualization on non-drill pages
