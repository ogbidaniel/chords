# CLAUDE.md — overnight agent instructions

Working on `chords` at danielogbuigwe.com/chords. Owner is asleep. Commit to `main`. Reviewed in the morning.

## Update protocol

- One focused change per commit, clear message
- One-line entry to `STATUS.md` per session: timestamp, what changed, what to verify, blockers
- For ambiguity: defensible call, log under "Decisions made without you". Don't block.

## Architecture in 30 seconds

Vanilla JS, no framework, no build step. Hash-router SPA with five sections + an embedded keyboard component. Files load in dependency order via plain `<script>` tags.

Five sections, one route prefix each: `/play`, `/reference/*`, `/drill/*`, `/lessons/*`, `/inspiration`. Sidebar nav (persistent desktop, drawer mobile) is in the top-level shell, not per-page.

**Module map:**
- `js/theory.js` — chord detection (PC-set), Roman numerals, diatonic builders. Pure.
- `js/midi.js` — passive Web MIDI listener (sysex:false). Sustain. Coexists with DAWs.
- `js/audio.js` — synth layer with pluggable backend. Default Web Audio oscillator. Mute persisted.
- `js/keyboard.js` — SVG keybed. setActive/setHints/clearHints. Tap handlers.
- `js/drills.js` — drill catalog + progression library + localStorage stats.
- `js/router.js` — minimal hash router, no deps.
- `js/pages/*.js` — one module per section. Each exports `render(params, mainEl)`.
- `js/app.js` — top-level wiring. Loads last.
- `lessons-content/*.md` — lesson source. Loaded by `js/pages/lessons.js` via fetch.
- `data/inspiration.json` — YouTube embed seed data.

## Hard constraints — don't break these

- **Web MIDI must stay passive.** `sysex: false`, no exclusive access. Ableton must keep working alongside.
- **Pitch-class detection** — voicings/inversions/doublings must continue to register. Don't regress to exact-MIDI matching.
- **No build step.** No framework, no bundler, no npm runtime deps. The HTML `<script>` tags ARE the dependency graph.
- **No analytics or trackers.** Not even Plausible. None.
- **No tracking-pixel YouTube embeds.** Use `youtube.com/embed/...` with `rel=0`. Don't add anything beyond that.
- **No secrets in code or repo.** Cloudflare deploys via Git connection — no API tokens in this repo.
- **Mobile-first.** Test at 380px before committing visual changes.
- **Don't break the sidebar drawer.** Toggle via `body.drawer-open` class. Scrim closes it.
- **Markdown rendering must remain XSS-safe** — `lessons-content/*.md` is trusted, but the renderer escapes HTML before re-inserting chord pills. Keep that order.

## Lesson Markdown syntax

`[[Cmaj7]]` becomes a clickable chord pill. `[[Dm7 → G7 → Cmaj7]]` becomes a stepped progression. Both expand a mini-keyboard panel underneath when clicked. The parser handles slash chords (`[[C/E]]`).

Supported chord suffixes — see `parseChordName` in `js/pages/lessons.js` for the canonical list. Adding new chord qualities requires updating both `Theory.QUALITIES` and the suffix map.

## Source material

- **Dyas (Monk Institute)** — 5 chord qualities, Cat A/B voicings, ii-V-I in major/minor, voice-leading rules, common forms, chord-scale relationships.
- **Davey (Mt. Hood)** — Guide tones (3rd/7th), guide-tones-plus-one, cycle-of-fourths ii-V-I in all 12 keys with Form A1/A2/B1/B2.
- **Weissman (Alfred Handy Guide)** — Basic chord progressions, inversions, voice leading, circle of fifths, half-step motion. Lessons in `lessons-content/` are Weissman-adapted.

Cite the source in any new lesson's YAML front matter and in any new drill's `source` field.

## Ranked next tasks

Pick one, commit, log, pick the next.

1. **Falling-notes improv mode** — separate view at `/improv` or `/practice/scroll`. Notes scroll down the screen toward the keybed at configurable tempo; user plays them as they cross the strike line. Start with a hardcoded ii-V-I loop in C, BPM slider, no scoring yet. *This is the highest-impact next feature — the gamified mode Ogbi has mentioned twice now.*

2. **More Weissman-style lessons** — adapt the existing physical book content to web. Topics to cover: blues progressions (12-bar), turnarounds (I-vi-ii-V), half-step motion in chord changes, secondary dominants. One lesson per commit. Use the same Markdown + `[[Chord]]` format. Add slug to the `LESSONS` array in `js/pages/lessons.js`.

3. **Two-handed voicings drill** — extend `js/drills.js` with the Davey 5-note voicings from the Form A1/A2/B1/B2 charts. Lower hand 2 notes + upper hand 3 notes. New drill ID: `two-handed-cycle`.

4. **Chord-scale relationship view** — when a chord is detected on the Play page, dim-highlight the related scale notes on the keyboard. E.g. play Cmaj7 → C major scale notes glow at low opacity. Toggle in the right sidebar.

5. **Sample-based audio backend** — register a Tone.js backend at `Audio.registerBackend('grand-piano', ...)`. Lazy-load samples only when selected. Source: Salamander Grand Piano free samples. Adds ~2MB but only on opt-in. Show backend selector in sidebar near the mute toggle.

6. **Tonic selector for drills** — let the user start the cycle drill at a chosen tonic instead of always C. UI: a 12-button row above the keyboard.

7. **Upper-structure triads panel** — Davey's chart. On the Play page, when user holds a dom7, show available upper-structure triads in a small side panel (II major, bV major, etc.).

8. **Tap-input on the chord-quality flashcards drill** for mobile users without a MIDI device. Each drill currently requires playing the chord; add an alternate "tap on the keyboard" verification path.

9. **Common-forms walkthrough** — a new section `/songs`. Tune chord changes from the Dyas handout (Take the A Train, Blue Bossa, Autumn Leaves), bar-by-bar with target voicings and a metronome.

10. **Color-coded function on the keyboard** — tonic chords subtly tinted gold, predominants blue-grey, dominants orange. Visual reinforcement of harmonic function during free play.

## Don'ts

- Don't introduce a build step
- Don't add React/Vue/Svelte or a bundler
- Don't claim exclusive MIDI access (`sysex: false` always)
- Don't break the 380px mobile viewport
- Don't add tracking, analytics, or third-party scripts beyond Google Fonts (already loaded) and YouTube embeds (only for inspiration page)
- Don't ship audio samples by default — they go through the registerBackend opt-in
- Don't put real chord-name strings in route parameters; use rootPc + qualityKey

## Where things live

- Routes: `js/app.js` (registration block)
- Sidebar nav items: `js/app.js` (navItems array)
- Chord qualities: `js/theory.js` → `QUALITIES`
- Scales: `js/theory.js` → `SCALES`
- Drills: `js/drills.js` → `CATALOG`
- Lessons: `js/pages/lessons.js` → `LESSONS` + `lessons-content/*.md`
- Inspiration videos: `data/inspiration.json`
- Cycle drill order: `js/theory.js` → `CYCLE_FOURTHS`

When in doubt, the source PDFs are the ground truth. Cite them.
