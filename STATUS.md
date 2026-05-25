# STATUS

Newest at top.

---

## 2026-05-25 — Refocus rebuild around PianoPig's six-step curriculum (Claude)

**Shipped**
- Stripped to 4 sections: Play, Practice, Book, Inspiration.
- **Play**: keyboard center stage, floating no-border layout. Sheet music staff above the keyboard with sync highlighting. Chord name in Cormorant Garamond, large, with quality-mapped atmospheric drift behind.
- **Practice** with two sub-modes:
  - *Progressions* — catalog of 12 progressions (ii-V-I, I V⁷, I IV, I IV V⁷, I V⁷ IV, I vi IV V, I vi ii V, minor ii-V-i, Autumn Leaves, All The Things You Are A1, Blue Bossa, Rhythm Changes A). Sourced from PianoPig + Weissman contents page.
  - *Three Chords* — drill maj7, dom7, m7 in the current key. Auto-cycle through 12 keys toggle.
- **Strict/Loose toggle** in the modebar. Loose = free exploration, no errors, all chords equally lit. Strict = one chord targeted at a time, foreign notes flash red, advances when required chord tones played + no foreign notes.
- **Key selector** — 12 pills in cycle-of-fourths visual order. Click to set.
- **Auto-cycle** — toggle that advances tonic to next key after completing the progression. Direction selectable (fourths or fifths).
- **Metronome** — DAW-style BPM control. Click number to type, scroll to nudge, +/- buttons. Default 70 BPM. Soft brush sample (synthesized: bandpass-filtered white noise burst). Beat 1 of every 4 slightly louder.
- **Book** page — placeholder, reads from empty `data/weissman-book.json`. Shows "not yet photographed" message; data structure ready for population.
- **Inspiration** — 6 PianoPig + jazz piano clips, tag filter.
- **Atmospheric background** — quality-mapped drifts (major=amber/gold, dominant=orange, minor=blue/violet, half-dim=greyish-blue, dim=monochrome). CSS-only, two layered radial gradients with slow drift animation. Frosted-glass surfaces over UI elements.
- **Recognition** rewritten as structured detection. Returns `{root, type, bass, extensions, foreign, confidence, chordTones, isSkeleton}`. Detects:
  - All 8 chord types: maj7, 7, m7, m7b5, dim7, maj, m, dim
  - Rootless 3+7 skeletons (PianoPig's foundation voicing)
  - Inversions (any voicing of Cmaj7 still names Cmaj7)
  - Extensions (9, b9, #9, 11, #11, 13, b13)
  - Foreign notes (out-of-scale notes flagged for Strict mode)
  - Confidence levels (high / partial / ambiguous)
- **No audio output** from the app. Metronome only. Designed for use with Ableton/Logic/hardware piano.

**Deferred (tracked in CLAUDE.md "Deferred items")**
- Audio synth with sample-based grand piano
- Stats tracking (per-chord practice + mistake counts)
- Cloudflare KV cross-device sync
- VexFlow engraver-quality notation
- Photograph extraction script for Weissman book
- Strict-mode error visualization on staff
- Voice-leading mode (PianoPig step 5)

**Decisions made**
- Cormorant Garamond as display font (replaced Fraunces). More contemplative, fits late-night piano practice mood.
- No "Lessons" section — replaced by Book which renders Weissman directly from photos.
- No "Reference" section — chord dictionary was rejected as fluff in previous review.
- Strict-mode advance requires both: (a) all required chord tones present, (b) no foreign notes played. The 5th is optional. This allows rootless and 3+7 voicings to satisfy the target.
- BPM input combines: numeric typing, scroll wheel, +/- buttons. DAW-style as requested.
- Chord-quality detection biases toward "lower note is the 3rd" for 2-note rootless skeletons, since that's the standard jazz comping shape. Truly ambiguous skeletons (Eb+Bb could be Cm7's b3+b7 OR Bmaj7's 3+7) default to maj7 priority. In Practice mode the target is known so this only affects Play.

**To verify in AM**
- [ ] Sidebar collapses to drawer below 860px; hamburger toggles it
- [ ] Play page: keyboard floats, sheet music above syncs with keyboard, atmospheric drift changes with chord quality
- [ ] Practice → Progressions: pick "ii-V-I", click a key pill, play through. Strict highlights one chord, Loose all equal.
- [ ] Practice → Three Chords: shows maj7/7/m7 in the current key
- [ ] Wrong notes flash subtle red in Strict only
- [ ] Metronome: click ▶, soft brush sound at 70 BPM
- [ ] Book page shows "not yet photographed"
- [ ] Inspiration shows 6 videos with working YouTube embeds

**Blockers**
- None.

---
