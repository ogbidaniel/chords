# CLAUDE.md — overnight agent instructions

You're working on `chords` at `danielogbuigwe.com/chords`. Owner is asleep. Commit to `main`. He reviews in the morning.

## Update protocol

- Each commit = one focused change with a clear message.
- Append a one-line entry to `STATUS.md` per session: timestamp, what changed, what to verify, blockers.
- For ambiguity: make a defensible call, log it under STATUS.md → "Decisions made without you". Don't block.

## Architecture in 30 seconds

Pure-static SPA. No build step, no framework. Six JS modules in `js/`, loaded in order: `theory → voicings → midi → keyboard → lessons → app`.

- `theory.js` — chord detection by pitch-class set, Roman numerals. Pure.
- `voicings.js` — voicing templates, lesson definitions, cycle-of-5ths drill generator. Pure.
- `midi.js` — passive Web MIDI listener. Bitwise status parsing. `sysex: false`, never claims exclusive access. Has `virtualNoteOn/Off` for tap mode.
- `keyboard.js` — SVG keybed component. `setActive(set)` highlights pressed notes, `setHints(set)` ghosts target notes.
- `lessons.js` — practice loop. Holds the current drill, matches held notes against target PC set, advances on correct.
- `app.js` — top-level wiring.

Lessons are defined in `voicings.js` → `LESSONS`. Add a new lesson by adding an entry there.

## Constraints — don't break these

- Web MIDI must stay passive (`sysex: false`, input ports only). Ableton runs alongside.
- Pitch-class detection — voicings/inversions/doublings must register. Don't regress to exact MIDI matching.
- No build step. No framework. No npm dependencies in runtime code.
- Don't request `sysex: true`.
- Don't add analytics or trackers.
- Don't push secrets — workflow uses GitHub repo secrets.
- Mobile-first. Test layout at 380px viewport before committing visual changes.

## Source material

Two PDFs informed every lesson here:
- **Dyas (Monk Institute)**: 5 chord qualities, 10 chord-scale relationships, Category A/B one-handed voicings, two-handed voicings, ii-V-I in major and minor, voice leading 3↔7, tune learning sequence, common forms.
- **Davey (Mt. Hood)**: 4-note chord formulas, tensions (9/11/13, #11 rule), guide tones (3rd & 7th), guide-tones-plus-one, **cycle-of-5ths ii-V-I drill in all 12 keys with Form A1/A2/B1/B2 voice leading**, upper-structure triads.

When adding new content, cite the source in the lesson definition (`source` field).

## Ranked next tasks

Pick one, commit, log, pick the next.

1. **Falling-notes improv mode** — the gamified Guitar-Hero-style mode he's been talking about. A separate view: notes scroll down toward the keybed at a configurable tempo; user plays them as they hit the line. Start with a hardcoded ii-V-I loop in C, no scoring yet. This is *the* next high-value feature.

2. **Two-handed Davey voicings** — extend `voicings.js` with the Davey 5-note voicings (3-7-9-5-R, etc.) from the Form A1/A2/B1/B2 charts. Wire into a new lesson "Two-handed voicings — Cycle 5".

3. **More chord-scale relationships** — Dyas lists 10. Right now we detect 9 qualities. Add a "scales" lesson that shows the related scale on the keyboard when a chord is detected (e.g. play Cmaj7 → C-major-scale hint notes light up dimly).

4. **Tonic selector for the cycle drill** — let the user pick a starting key for the ii-V-I cycle drill instead of always starting at C.

5. **Upper-structure triads view** — Davey's chart. When user plays a dom7, show the available upper-structure triads (II major, bV major, etc.) as a side panel.

6. **PDF ingestion stub** — a `data/chord-library.json` file the library section reads from. Lets the owner drop content from more handouts without code changes.

7. **Common forms playable** — a view that walks through tune chord changes (Take the A Train, Blue Bossa, etc.) one bar at a time, showing target voicings, with a metronome.

8. **Sustain-aware overlay redraw on resize** — currently the overlay hides on resize. Cache last sounding set in `app.js` and re-render.

9. **Color-coded function** — tonic chords subtly tinted gold, predominants blue-grey, dominants orange. Visual reinforcement of function.

10. **Audio playback** — optional. Use Tone.js to actually play the target voicing back when user advances. Could go in `lessons.js` after correct match.

## Don'ts

- Don't introduce a build step.
- Don't add React/Vue/Svelte.
- Don't claim exclusive MIDI access.
- Don't write CSS that breaks the 380px mobile viewport.
- Don't add tracking, analytics, or third-party scripts (Tailwind CDN and Google Fonts are already in there — keep that the ceiling).

## Reference

- README.md — owner-facing setup.
- The two PDFs are the canonical source. When in doubt, cite them.
