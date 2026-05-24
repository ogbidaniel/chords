# chords — danielogbuigwe.com/chords

A jazz piano practice room. Plug in a MIDI keyboard, pick a drill, the page recognizes what you play. Material distilled from Dr. JB Dyas (Thelonious Monk Institute) and Dan Davey (Mt. Hood Community College).

## What's in here

**The brain (chord detection):** detects all five Dyas chord qualities (maj7, dom7, m7, ø, °7) plus triads, sus4, 6 chords, and minor-major7 — by **pitch-class set**, so inversions and octave doublings register correctly. Roman-numeral mapping relative to any key.

**The teacher (lesson library):**
- Guide tones in C (Davey)
- ii-V-I shells in C (3-7-9 voicings)
- The five chord qualities (Dyas)
- Minor ii-V-i in C minor (Dø → G7alt → Cm)
- **ii-V-I around the cycle of fifths in all 12 keys** — 36 drills, alternating Category A and B voicings per Dyas's method

**The body (UI):**
- 49-key SVG piano keyboard (C2–C6)
- Target notes shown as dusty-blue "hint" keys; played notes light up amber
- Live chord detection with Roman numeral relative to the current lesson's tonic
- Floating chord-name overlay above the keys you're holding
- Tap-to-play fallback for mobile and Safari/Firefox (no Web MIDI there)
- Modern evening theme: deep blue-black + warm brass + editorial typography

**The deploy:** Cloudflare Pages via GitHub Actions. No build step.

## File structure

```
index.html              Layout: hero, lesson tabs, active lesson, piano, detection, library
styles.css              Modern evening theme
js/
  theory.js             Music primitives. Chord detection by PC set. Roman numerals.
  voicings.js           Voicing templates + cycle-of-5ths ii-V-I drill generator.
                        All lessons defined here.
  midi.js               Passive Web MIDI listener. Bitwise status-byte parsing.
                        Note On/Off + CC64 sustain. Plus virtualNoteOn for tap mode.
  keyboard.js           SVG keybed renderer. setActive, setHints, tap handlers.
  lessons.js            Practice loop. Match held notes to target drill, advance on success.
  app.js                Top-level wiring. Loaded last.
.github/workflows/
  deploy.yml            Cloudflare Pages deploy
  deploy-s3.yml.disabled  S3 alternative, kept for reference
```

## You said you already connected the Cloudflare account via GitHub — here's what's left

You have two paths from here. Both work; pick one.

### Path A: Use Cloudflare's built-in Pages CI (simplest)

Since you already linked GitHub to Cloudflare:

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Pick the repo (or create the repo first, then connect)
3. Build settings:
   - **Build command:** *leave blank*
   - **Build output directory:** *leave blank* (or `/`)
4. Save. Every push to main auto-deploys.
5. **Delete `.github/workflows/deploy.yml`** — you don't need the Action since Cloudflare itself is building. Two CI systems racing is a mess.

This is what I recommend. It's one less thing to maintain.

### Path B: Keep the GitHub Action

Use this if you want the deploy logged in your repo's Actions tab:

1. Cloudflare dashboard → **My Profile** (top right) → **API Tokens** → **Create Token** → use the **"Edit Cloudflare Workers"** template (works for Pages too)
2. Get your Account ID from the dashboard sidebar
3. In the GitHub repo → Settings → Secrets and variables → Actions → add:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. Make sure the Pages project name (`chords` in `deploy.yml`) exists in Cloudflare. Create it once via dashboard with **Direct Upload** option, no Git connection.

### Custom domain → `danielogbuigwe.com/chords`

Three options, ranked by effort:

1. **`chords.danielogbuigwe.com` (2 minutes)** — In the Pages project, Custom domains → Add. Cloudflare handles DNS automatically if the apex is on their nameservers.
2. **Pull `/chords` into the main site repo** — if `danielogbuigwe.com` is also Cloudflare Pages, move these files into a `chords/` subfolder of that repo. The path just works.
3. **Worker rewrite** — put a Cloudflare Worker on the apex that proxies `/chords/*` to the standalone Pages project. Most flexible, slightly more setup.

If you don't have a strong opinion, go subdomain. Easiest to undo later.

## Local dev

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Web MIDI requires HTTPS in production, but `localhost` works over plain HTTP.

## What got added vs. last night

- Reads from two real handouts: Dyas (Monk Institute) and Davey (Mt. Hood). Lessons map directly to their pedagogy.
- Detects every quality from the handouts — not just three hardcoded chords.
- Practice loop: target chord → ghost hint notes on keyboard → user plays → auto-advance.
- 12-key cycle drill (36 chords, alternating A/B voicings) — the centerpiece of Davey's method.
- Mobile-first responsive layout with tap-to-play.
- Modern evening theme.

## What's next (handoff to overnight agents)

See `CLAUDE.md` — that file has the constraints, the ranked next-task list, and the update protocol.
