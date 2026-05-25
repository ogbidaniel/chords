# CLAUDE.md — agent instructions

Working on `chords` — jazz piano practice app. Owner is a researcher learning jazz piano with PianoPig as primary teacher (no in-person teacher). The previous build attempts overengineered. This rebuild is deliberately narrower.

## Hard constraints — don't break these

- **Web MIDI passive.** `sysex: false`, no exclusive access. Ableton must keep working alongside.
- **No in-app audio output.** No synth. The owner plays through Ableton or hardware. Metronome (brush sample) is the only sound.
- **Pitch-class detection.** Chord recognition is voicing-invariant. Cmaj7 is Cmaj7 no matter how it's voiced.
- **No build step.** No framework, no bundler. The HTML `<script>` tags are the dependency graph.
- **No analytics, no trackers, no third-party scripts** beyond Google Fonts and YouTube embeds (Inspiration section only).
- **Mobile-first.** Test at 380px before committing visual changes.
- **Strict-mode wrong-note flash must be subtle.** Desaturated red, ~0.6s, single-shot animation. No audio cue. The owner explicitly asked for non-jarring feedback.
- **Don't reintroduce removed features without asking.** No 300-cell chord reference grid, no scale grid, no intervals page. Those were rejected. The app has FOUR sections: Play, Practice, Book, Inspiration. That's it.

## PianoPig's curriculum is the spine

From his Practice Plan PDF, his six steps:

1. Practice all 3 chord types (maj7, dom7, m7) in every key
2. Play through jazz standards using those chords
3. Practice inversions of all 3 chord types in every key
4. Play through standards using inverted chords
5. Use combinations of inversions to minimize hand movement
6. Repeat over more standards until easy

The Practice page's two sub-modes embody this:
- **Three Chords** = steps 1 + 3 (chord types in every key, with inversion focus)
- **Progressions** = steps 2 + 4 + 5 + 6 (applied to tunes, with mixed inversions)

If you add features, ask which of these six steps it supports. If it doesn't support one, it probably shouldn't ship.

## Deferred items (paused, NOT cancelled)

These are tracked in `STATUS.md`. Don't silently ship them; surface them when relevant.

1. **Audio synth** — sampled grand piano with pitch-adjustment from a single middle C sample. Architecture: a backend interface in `js/audio.js` (future), pluggable, default = no sound, optional = sample.
2. **Stats tracking** — strict-mode wrong-note counts and practice-session counts per chord, in localStorage. Schema designed; UI to surface as a small inline readout when implemented.
3. **Cross-device sync** — Cloudflare KV. Free tier sufficient for one user. Wire into Practice stats when both are ready.
4. **VexFlow notation** — engraver-quality staff. Replace `js/staff.js` Staff module behind same interface (`setNotes(midiArr, stateMap)`).
5. **Photograph extraction** — script to OCR/extract from photographed pages of Weissman's book into `data/weissman-book.json`. One Claude API call per page. Output schema:
   ```
   { page, section, progression, key, prose, chords: [{name, notes}], song_examples }
   ```
6. **Strict-mode error visualization on the staff** — per-chord mistakes shown beneath the staff as a small dot grid.
7. **Voice-leading mode** — PianoPig step 5. App computes the smoothest path through a progression and visualizes it on the keyboard as connecting lines.

## Module map

- `js/theory.js` — primitives, structured chord detection, Roman parser, progression realizer. Tested in node, pure functions.
- `js/midi.js` — passive Web MIDI. Bitwise parsing. Sustain CC#64.
- `js/keyboard.js` — SVG keybed. Multi-state highlighting.
- `js/staff.js` — simplified grand staff renderer.
- `js/metronome.js` — Web Audio brush metronome.
- `js/router.js` — hash router.
- `js/pages/play.js` — home, free play with detection.
- `js/pages/practice.js` — the main practice loop. Both sub-modes here.
- `js/pages/book.js` — placeholder for photographed book pages.
- `js/pages/inspiration.js` — YouTube grid.
- `js/app.js` — top-level wiring.

## Where things live

- Add new progressions: `data/progressions.json`
- Add new videos: `data/inspiration.json`
- Add new chord types: `js/theory.js` → `CHORD_TYPES` and `TYPE_PRIORITY`
- Atmospheric color mapping: `styles.css` → `body.quality-*` selectors
- Strict-mode advance logic: `js/pages/practice.js` → `refreshKeyboard`

## Don'ts

- Don't add a build step
- Don't claim exclusive MIDI access
- Don't introduce a framework
- Don't reintroduce dropped sections (chord reference grid, scale grid, intervals page, separate drill catalog)
- Don't make the wrong-note flash loud or audible
- Don't auto-advance the progression in Loose mode — Loose mode = free exploration
- Don't put text in route parameters that needs decoding beyond URL-safe slugs
- Don't paraphrase Weissman's book content in the app; the Book section is supposed to be his book, page by page, from photographs
