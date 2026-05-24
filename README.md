# chords — jazz piano practice app

A personal practice room for jazz piano. MIDI in, chord recognition, drills, a reference dictionary, lessons from books, and a curated inspiration feed. Lives at danielogbuigwe.com/chords.

## What it does

**Play** *(home)* — Plug in a MIDI keyboard. The page recognizes what you play in real time. Drop the welcome card the moment a device connects so the keyboard owns the page. Roman numeral relative to C by default, switches when you're inside a key-aware drill.

**Reference** — Chord dictionary (25 qualities × 12 roots — about 300 chords), scale dictionary (20 scales × 12 keys), intervals reference, and an interactive circle of fifths. Click any cell, hear it, see it on a mini keyboard.

**Drill** — Practice exercises with persistent stats. Currently:
- Cycle ii–V–I in all 12 keys (36 chords, alternating Davey Cat A/B voicings)
- Chord-quality flashcards (60 items, 5 qualities × 12 roots)
- Diatonic 7ths in a random key (40 capped items)
- Minor ii–V–i in all 12 keys

**Lessons** — Long-form material with interactive inline chord pills. Click any `Cmaj7` in the text to expand a mini keyboard underneath. Click a progression like `Dm7 → G7 → Cmaj7` to step through or play it back. Currently:
- Circle of Fifths Progressions (Weissman-adapted)
- Chord Inversions and Smooth Voice Leading (Weissman-adapted)

More lessons land here as we photograph book pages and convert them — that workflow is for after this build.

**Inspiration** — Curated YouTube embeds (PianoPig shorts + long-form jazz piano clips). Filter by tag.

## Settings

**Mute toggle** in the sidebar footer — turn off all in-app sounds if you want to play through your DAW only. Persists across sessions in localStorage.

**Pluggable synth backend** — Default is a tiny Web Audio oscillator (~3 KB, always works, sounds clean). The framework supports swapping in a sample-based backend later by calling `Audio.registerBackend('my-samples', impl)`. The samples don't ship — the default oscillator does — keeping the app under 200 KB.

## Tech

Vanilla JS, no framework, no build step. Modules in dependency order:

```
js/theory.js        — Music primitives. ~25 chord qualities, 20 scales, intervals,
                      chord detection by pitch-class set, Roman numerals,
                      diatonic chord builder.
js/midi.js          — Passive Web MIDI listener. sysex:false, bitwise status parsing.
                      Sustain (CC#64). Coexists with DAWs.
js/audio.js         — Pluggable synth. Default Web Audio oscillator with ADSR.
                      Mute persisted to localStorage.
js/keyboard.js      — SVG keybed component. Configurable range. Tap-to-play.
js/drills.js        — Drill catalog + per-drill stats in localStorage.
js/router.js        — Minimal hash router (#/play, #/reference/chords, etc).
js/pages/*.js       — One module per app section (play, reference, drill,
                      lessons, inspiration).
js/app.js           — Top-level wiring. Sidebar, routes, MIDI status, mute toggle.

data/inspiration.json   — Seed list of PianoPig + jazz piano video IDs.
lessons-content/*.md    — Lesson source in Markdown with [[Chord]] pill syntax.
                          Read by the lessons page at runtime via fetch().
```

## Deploy

You already wired GitHub → Cloudflare Pages in the last build. Same setup applies:

1. Replace files in your local clone with this rebuild
2. `git add -A && git commit -m "Rebuild: sidebar app, reference, drill, lessons, inspiration" && git push`
3. Cloudflare auto-deploys from the push

The build is fully static. No build command, no output directory needed in the Cloudflare Pages config — leave them empty.

## Photographing book pages later

When we do the PDF/book extraction together, the target schema is the `lessons-content/*.md` format already in this repo. One Markdown file per lesson, YAML front-matter (title/source/topic), prose with `[[ChordName]]` and `[[chord1 → chord2 → chord3]]` inline syntax. The Lessons page registers each file's slug in the catalog list at the top of `js/pages/lessons.js`. To add a new lesson by hand: drop the .md file in `lessons-content/`, append a row to the `LESSONS` array in `js/pages/lessons.js`, push. No build step.

## Local dev

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Web MIDI requires HTTPS in production. localhost works on plain HTTP.

## Browser support

Web MIDI: Chrome, Edge, Opera. Firefox and Safari don't ship Web MIDI yet — those users get the visual keyboard with click-to-play (still works fine for browsing the Reference and Lessons sections).

The app runs offline once loaded — Cloudflare Pages caches everything. No backend, no accounts, no analytics.
