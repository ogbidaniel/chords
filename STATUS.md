# STATUS

Newest at top. Format: `## YYYY-MM-DD — agent` then bullets.

---

## 2026-05-24 — Full rebuild around sidebar + sections (Claude)

**Shipped**
- New shell: persistent sidebar on desktop, drawer on mobile (≤860px). Hash router. Five sections.
- `/play` — keyboard center-stage. Welcome card appears only when no MIDI device. Right-side Watch widget surfaces a random PianoPig clip. Chord-overlay clipping bug fixed (now in its own layer above the keyboard frame).
- `/reference/chords` — 25 qualities × 12 roots, grouped by family (7ths, 6ths, triads, extended, altered). Click any cell → highlights mini keyboard, plays chord.
- `/reference/scales` — 20 scales × 12 roots.
- `/reference/intervals` — 13 intervals, ear-friendly click-to-hear.
- `/reference/circle` — interactive SVG circle of fifths, major/minor toggle, click any key to see its diatonic 7ths.
- `/drill` — catalog of 4 drills with persisted stats: cycle ii-V-I (36 chords), quality flashcards (60), diatonic 7ths (40), minor ii-V-i (36).
- `/drill/:id` — active session, ghost-note hints on keyboard, streak counter, accuracy %, hear-target button, skip, reset stats.
- `/lessons` — catalog + 2 Weissman-adapted lessons: "Circle of Fifths Progressions" and "Chord Inversions and Smooth Voice Leading".
- `/lessons/:slug` — Markdown renderer with `[[Chord]]` and `[[Dm7 → G7 → Cmaj7]]` inline interactive pills. Click expands a mini-keyboard panel under the pill. Slash chords (`[[C/E]]`) supported.
- `/inspiration` — 6 seeded videos (PianoPig + Michael Keithson), tag filter, embedded YouTube via `youtube.com/embed`.
- Built-in synth: Web Audio oscillator (two voices, ADSR envelope) at ~3 KB. Mute toggle in sidebar footer, persisted to localStorage. Backend system supports `Audio.registerBackend()` for future Tone.js/sample backends.
- Top-left brand says "chords" only (Ogbi's request — removed personal domain).
- Visual: tool-first design, less editorial. Fraunces used sparingly for chord names and section titles, Inter Tight for body, JetBrains Mono for UI labels.

**Decisions made without you**
- Wrote two Weissman-adapted lessons instead of one, since "Circle of Fifths Progressions" alone made the lessons catalog look thin. "Inversions and Voice Leading" pulled from his coverage of inversions + voice-leading + half-step motion. Both translate cleanly to web; both cite the source.
- Capped diatonic-7ths drill at 40 randomized items per session rather than full 84 (12 keys × 7 degrees) — felt long otherwise. Easy to raise if you disagree; see `js/drills.js`.
- Used cycle-of-fourths order (counterclockwise: C → F → Bb → ...) for the drill, since that's how Davey's chart progresses. Both directions are correct — fourths is the jazz convention.
- Lesson Markdown lives in `lessons-content/`, fetched at runtime. Cloudflare Pages serves it as static. No backend needed.
- PianoPig video IDs verified via web search before seeding `data/inspiration.json` — all 6 videos are real and embeddable.

**To verify in AM**
- [ ] `/play` shows welcome card when no MIDI, hides it when device connects
- [ ] Chord overlay no longer clips into the keyboard frame border (visible bug from previous build)
- [ ] Sidebar collapses to drawer below ~860px viewport; hamburger button toggles it
- [ ] Mute toggle silences the synth + persists across page reload
- [ ] `/reference/chords` — click Cmaj7 → mini keyboard highlights, hear chord
- [ ] `/drill/cycle-ii-v-i` — start drill → ghost notes appear, play them → advances
- [ ] `/lessons/circle-of-fifths-progressions` → click `[[Dm7 → G7 → Cmaj7]]` → mini panel opens, all 3 steps playable
- [ ] `/inspiration` → 6 videos load; tag filter narrows list

**Known limitations / not done**
- Falling-notes improv mode — top of next-task list (CLAUDE.md task 1).
- No sample-based piano sounds yet — framework in place, oscillator is default.
- Book/PDF extraction workflow — explicitly deferred per Ogbi's request. Lessons hand-written for now.
- No drill leaderboards or cross-session graphs — stats are per-drill cumulative only.

**Blockers**
- None.

---
