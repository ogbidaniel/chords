# Status

## Current build

- Real engraved notation via VexFlow
- Loose-only practice: notation is the prompt, played notes show on staff in
  blue, matching notes light up amber, no error indicators anywhere
- Velocity-driven atmospheric drift with chord-quality color hash
- Sidebar nav: Play / Practice / Book / Inspiration
- Practice has three drills: Scales, Chord Types, Progressions
- Continue-where-you-left-off element on practice landing
- All notation rendering uses VexFlow with proper clefs, key signatures,
  accidentals, chord stacks, and chord-name labels

## Recent decisions

- Removed chord-row/scale-degree indicator — the sheet music *is* the indicator
- Removed strict/loose toggle — loose only, no error states
- BPM and metronome moved to compact top-right toolbar
- Circle of fifths is a per-drill toggle, off by default
- Progressions paginate at 4 chords per page

## Deferred

- Audio synth / grand piano sample
- Per-chord stats and practice counts in localStorage
- Cloudflare KV cross-device sync (free tier sufficient when adopted)
- Photograph extraction script for Weissman book → data/weissman-book.json
- Voice-leading mode (PianoPig step 5: combinations of inversions)
- Always-on circle visualization on non-drill pages
- More progressions in the catalog (book section has 3, expand from Weissman)
