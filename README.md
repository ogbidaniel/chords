# chords — jazz piano practice app

A focused practice tool for jazz piano. Built around PianoPig's six-step curriculum and Weissman's chord-progression catalog. Lives at danielogbuigwe.com/chords.

## The four sections

**Play** *(home)* — Plug in MIDI. The page recognizes what you play in real time. Chord name displayed in serif above a sheet-music grand staff that syncs note-for-note with the keyboard.

**Practice** — Two sub-modes:
- *Progressions* — Catalog of named progressions (ii-V-I, Autumn Leaves, All The Things You Are, etc.). Pick one, set the key, walk it. Strict mode advances when you play the chord; loose mode lets you explore freely.
- *Three Chords* — PianoPig's foundation drill. maj7, dom7, m7 in the current key. Cycle through all 12 keys with the auto-cycle toggle.

Both modes have a metronome (default 70 BPM, soft brush sample), Strict/Loose toggle, key selector, and auto-cycle through the cycle of fourths or fifths.

**Book** — Placeholder for Dick Weissman's *Basic Chord Progressions*. Empty until pages are photographed and extracted.

**Inspiration** — Curated PianoPig + jazz piano YouTube clips.

## Settings

- **No audio output** — the app makes no sound. Play through your DAW (Ableton, Logic, FL Studio) or hardware piano. Decision: avoid the bad built-in synth; let the user's setup produce the sound.
- **Metronome only audio** — soft brush sample, synthesized via Web Audio noise burst + bandpass filter. ~no kb cost.
- **Stats tracking** — deferred. Will track per-chord practice counts and mistake counts in Strict mode, stored in localStorage.

## Recognition

The detector returns a structured fact:
```
{
  root, type, bass, extensions, foreign, confidence, chordTones, isSkeleton
}
```

Not a string. The UI renders it. Same Cmaj7 voiced six different ways is still Cmaj7. The 3+7 rootless voicing (PianoPig's foundation) is detected with `isSkeleton: true`. Extensions like 9, b9, #11 are detected and labeled. Out-of-scale notes are marked `foreign` and flash red in Strict practice.

## Tech

Vanilla JS, no framework, no build step. Modules:

- `js/theory.js` — chord types, structured detection, Roman numeral parser, progression realizer
- `js/midi.js` — passive Web MIDI listener
- `js/keyboard.js` — SVG keybed, multi-state highlighting (playing/correct/wrong)
- `js/staff.js` — simplified SVG grand staff with whole notes
- `js/metronome.js` — soft brush metronome (Web Audio noise + filter)
- `js/router.js` — hash router
- `js/pages/*.js` — one file per section
- `js/app.js` — top-level wiring
- `data/progressions.json` — progression catalog
- `data/inspiration.json` — YouTube clip seed
- `data/weissman-book.json` — empty until photographs

## Deploy

Already wired to Cloudflare Workers via GitHub. Push to main = deploy.

```bash
cd ~/Development/chords
# Replace contents with new build
rm -rf js/ data/ index.html styles.css README.md CLAUDE.md STATUS.md
tar -xzf ~/Downloads/chords-app.tar.gz -C .
git add -A
git commit -m "Rebuild: refocused practice loop"
git push
```

## Local dev

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Web MIDI requires HTTPS in production; localhost is exempted.

## Photograph workflow (future, deferred)

When you photograph Weissman's book pages, an extraction script will run locally:
1. Each photo → one Claude API call
2. Output structured JSON matching the schema in `data/weissman-book.json`
3. Commit the JSON, push, the Book section fills out

The Book page already reads from that file and renders pages — it just shows "not yet photographed" when the file is empty.

## What's NOT in this build (deferred placeholders)

These are intentional pauses, not bugs. Each will be revisited later:

- **Audio synth** — no in-app sound output. Use your DAW.
- **Sampled grand piano** — deferred; would require sample loading + pitch adjustment math.
- **Cloudflare KV / cross-device sync** — deferred; localStorage suffices for one user.
- **Stats tracking** — practice/mistake counts per chord. Schema designed; UI not built yet.
- **VexFlow engraver-quality notation** — using simplified SVG staff for now.
- **Photograph extraction script** — deferred until you start photographing.
- **Strict mode error tracking storage** — counts wrong-note presses per chord in localStorage.
