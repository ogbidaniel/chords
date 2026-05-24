# STATUS

Newest at top. Format: `## YYYY-MM-DD HH:MM — agent` then bullets.

---

## 2026-05-23 night — rebuild with PDF material (Claude)

**Shipped**
- Full rewrite from last night's three-chord demo to a real learning app.
- Modular architecture: `theory / voicings / midi / keyboard / lessons / app`.
- Chord detection now covers 9 qualities (Dyas's five plus triads, sus4, m6, mMaj7).
- 5 lessons defined, sourced to PDFs:
  - Guide tones in C (Davey)
  - ii-V-I shells in C with 3-7-9 voicings (Davey)
  - The five chord qualities (Dyas)
  - Minor ii-V-i in C minor (Dyas)
  - **ii-V-I in all 12 keys** — 36-drill cycle with alternating Cat A/B voicings (Davey)
- Practice loop: target chord highlighted as ghost on keyboard, user plays, page auto-advances on match.
- Library section: 8 reference cards from the handouts (5 qualities, guide tones, voice leading, A/B voicings, ii-V-I major, ii-V-i minor, common forms, tune learning order).
- Tap-to-play fallback on mobile / non-MIDI browsers.
- Modern evening theme: deep blue-black, brass accent, Fraunces + JetBrains Mono.
- Updated Cloudflare Pages workflow for new file structure.

**Decisions made without you**
- Treated the original spec's `[57, 60, 64, 65]` as the Davey shell voicing F-C-E + A (root D), not as the chord itself. This is what Davey actually teaches as the Dm7 shell. If you wanted A-C-E-F as a literal chord, the system will still match it — it's just one of many voicings of Dm7 by PC-set.
- Picked Cloudflare Pages **without** the GitHub Action as the default recommended path in README, since you connected GitHub→Cloudflare directly. The Action is provided as the alternative.
- Chose Fraunces (serif) + JetBrains Mono pairing. Editorial, not generic.

**To verify in AM**
- [ ] Plug in MIDI keyboard, hit C-E-G-B → "Cmaj7" appears with overlay
- [ ] Start "ii-V-I in all 12 keys" lesson → ghost notes appear in pale blue → play them → auto-advance after ~1s
- [ ] Tap keys on the SVG with mouse → fallback play works
- [ ] Layout holds together at 380px width
- [ ] Sustain pedal pill lights up when pedal pressed; chord persists; releases on lift

**Known limitations**
- Falling-notes improv mode not built yet — top of next-task list.
- No audio playback (silent UI; relies on your hardware).
- Overlay hides on window resize until next MIDI event (logged in CLAUDE.md task #8).

**Blockers**
- None.

---
