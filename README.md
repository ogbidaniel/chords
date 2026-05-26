# chords

A private practice room for jazz piano. Plug in a MIDI keyboard, play through
scales, chord types, and progressions. The app listens — it doesn't make sound.
Run a DAW (Ableton, Logic) alongside for audio.

## What's here

- **Play** — free play with live chord recognition. Sheet music shows what you're playing.
- **Practice** — three drills:
  - Scales (12 major, 12 minor)
  - Chord types (maj7, dom7, m7 around the circle of fifths)
  - Progressions (jazz standards, popular songs, tutorials, book progressions)
- **Book** — placeholder for pages from *Basic Chord Progressions* by Dick Weissman.
- **Inspiration** — a curated feed of jazz piano clips.

## Running locally

It's a static site. No build step.

```sh
cd chords-app
python3 -m http.server 8000
# open http://localhost:8000
```

For MIDI to work, the page must be served from `https://` or `http://localhost`
(modern browsers gate Web MIDI behind a secure context).

## Deploy

Push to a Cloudflare Pages or Workers project. The site needs only static file
serving. No backend, no API keys, no build.

## Files

- `index.html` — page shell, loads VexFlow from CDN
- `styles.css` — full stylesheet
- `js/` — vanilla JavaScript modules
- `data/` — progressions, inspiration videos, (future) book pages

## Notation

Real engraved music via [VexFlow](https://github.com/0xfe/vexflow), loaded
from a CDN.

## Hard constraints

- Vanilla JavaScript, no framework, no bundler
- Web MIDI passive, sysex disabled — won't fight your DAW
- All state in localStorage; no backend, no accounts
- No audio output from the app itself (metronome only)
- Mobile-friendly; sidebar collapses on narrow viewports
