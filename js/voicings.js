// voicings.js — voicing library and progression generator.
// Encodes the material from Dyas (Monk Institute) and Davey (Mt. Hood).
// Everything is transposable from C-rooted templates.

const Voicings = (() => {

  // Voicing templates: intervals from chord root, in semitones (negative allowed).
  // These are pitched relative to a "root reference octave" — when we render,
  // we anchor to a sensible MIDI octave for the keyboard range.

  // Davey / Dyas one-handed shells
  const TEMPLATES = {
    // Davey "guide tones": just 3rd & 7th
    'guide-maj7':  { intervals: [4, 11],            name: '3 7',       hand: 'L' },
    'guide-7':     { intervals: [4, 10],            name: '3 b7',      hand: 'L' },
    'guide-m7':    { intervals: [3, 10],            name: 'b3 b7',     hand: 'L' },
    'guide-m7b5':  { intervals: [3, 10],            name: 'b3 b7',     hand: 'L' },

    // Davey "guide tones + one": adds 9th above
    'shell+9-maj7': { intervals: [4, 11, 14],       name: '3 7 9',     hand: 'L' },
    'shell+9-7':    { intervals: [4, 10, 14],       name: '3 b7 9',    hand: 'L' },
    'shell+9-m7':   { intervals: [3, 10, 14],       name: 'b3 b7 9',   hand: 'L' },

    // Dyas Category A (3rd in lowest voice) — one-handed, root omitted
    'catA-maj7':   { intervals: [4, 11, 14],        name: '3 7 9',     hand: 'L', dyasCategory: 'A' },
    'catA-7':      { intervals: [4, 10, 14],        name: '3 b7 9',    hand: 'L', dyasCategory: 'A' },
    'catA-m7':     { intervals: [3, 10, 14],        name: 'b3 b7 9',   hand: 'L', dyasCategory: 'A' },
    'catA-m7b5':   { intervals: [3, 6, 10, 12],     name: 'b3 b5 b7 R', hand: 'L', dyasCategory: 'A' },
    // Dyas Category B (7th in lowest voice)
    'catB-maj7':   { intervals: [11, 16, 19],       name: '7 3 5',     hand: 'L', dyasCategory: 'B' },
    'catB-7':      { intervals: [10, 16, 21],       name: 'b7 3 6',    hand: 'L', dyasCategory: 'B' },
    'catB-m7':     { intervals: [10, 15, 19],       name: 'b7 b3 5',   hand: 'L', dyasCategory: 'B' },
    'catB-m7b5':   { intervals: [10, 12, 15, 18],   name: 'b7 R b3 b5', hand: 'L', dyasCategory: 'B' },
  };

  /**
   * Realize a voicing template against a root pitch class, returning MIDI numbers.
   * `rootOctave` is the octave for the implied root (e.g. 4 = middle C area).
   * The voicing notes are placed above that root reference.
   */
  function realize(templateKey, rootPc, rootOctave = 4) {
    const tpl = TEMPLATES[templateKey];
    if (!tpl) return null;
    // MIDI for C4 = 60. Root MIDI = 12*(octave+1) + pc.
    const rootMidi = 12 * (rootOctave + 1) + (((rootPc % 12) + 12) % 12);
    return {
      template: templateKey,
      notes: tpl.intervals.map(i => rootMidi + i),
      label: tpl.name,
      dyasCategory: tpl.dyasCategory,
      root: rootMidi,
    };
  }

  /**
   * Get the chord "spec" for a degree in a key.
   * Quality of each diatonic seventh chord in major: I=maj7, ii=m7, iii=m7, IV=maj7, V=7, vi=m7, viiø=m7b5
   */
  const DIATONIC_MAJOR = {
    'I':   { interval: 0, quality: 'maj7' },
    'ii':  { interval: 2, quality: 'm7' },
    'iii': { interval: 4, quality: 'm7' },
    'IV':  { interval: 5, quality: 'maj7' },
    'V':   { interval: 7, quality: '7' },
    'vi':  { interval: 9, quality: 'm7' },
    'viiø':{ interval: 11, quality: 'm7b5' },
  };
  // Minor (harmonic-minor implied): iø=m7b5 functions as ii of minor key tonic
  const MINOR_II_V_I = {
    'iiø':  { interval: 2,  quality: 'm7b5' },
    'V7alt':{ interval: 7,  quality: '7' },   // we'll treat as dom7 for detection
    'i':    { interval: 0,  quality: 'm7' },  // could also be mMaj7
  };

  /**
   * Build a progression. tonicPc is the key's tonic. Pattern is array of degree names.
   * Returns array of { roman, quality, chordRootPc, name }
   */
  function buildProgression(tonicPc, pattern, mode = 'major') {
    const dict = mode === 'minor' ? MINOR_II_V_I : DIATONIC_MAJOR;
    return pattern.map(deg => {
      const spec = dict[deg];
      if (!spec) return null;
      const chordRootPc = (tonicPc + spec.interval) % 12;
      return {
        roman: deg,
        quality: spec.quality,
        chordRootPc,
        name: `${chordRootPc}${spec.quality}`, // placeholder; UI builds real name
      };
    }).filter(Boolean);
  }

  /**
   * Davey's cycle-of-fifths ii-V-I drill.
   * Returns an array of 12 entries, each containing 3 chords (ii-V-I), keys descending in fifths.
   * Form: A1 (B on bottom transitions), A2, B1, B2 — see Davey p. 6-7.
   */
  function cycleIIVIProgression() {
    // Cycle starts on D-7 G7 Cmaj7 (key of C), then C-7 F7 Bbmaj7 (key of Bb), etc.
    // Each iteration drops the key a whole step down a fifth (descending fifths = ascending fourths).
    const keys = [];
    // Tonics: C, Bb, Ab, Gb, E, D, B, A, G, F, Eb, Db — counterclockwise around cycle
    const cycleTonics = [0, 10, 8, 6, 4, 2, 11, 9, 7, 5, 3, 1];
    for (const tonicPc of cycleTonics) {
      keys.push({
        tonicPc,
        chords: buildProgression(tonicPc, ['ii','V','I'], 'major'),
      });
    }
    return keys;
  }

  /**
   * The "next chord" voicing choice using good voice leading (Dyas p. 6).
   * If current was Category A, next becomes B; if B, next A.
   */
  function nextCategory(prev) {
    return prev === 'A' ? 'B' : 'A';
  }

  /**
   * Given a progression and a starting category, return MIDI notes for each chord
   * using alternating A-B voicings. This implements Dyas's "Alternate A-B beginning with A".
   */
  function voiceProgressionAlternating(progression, startCategory = 'A', rootOctave = 4) {
    let cat = startCategory;
    return progression.map(chord => {
      const key = `cat${cat}-${chord.quality}`;
      const voicing = realize(key, chord.chordRootPc, rootOctave) || realize(`cat${cat}-maj7`, chord.chordRootPc, rootOctave);
      cat = nextCategory(cat);
      return { ...chord, voicing };
    });
  }

  // Curated lesson content from the PDFs.
  // Each lesson is a list of "drills" the user can practice. The detector
  // checks whether the user's currently-held notes match the target chord.
  const LESSONS = [
    {
      id: 'guide-tones-C',
      title: 'Guide tones in C',
      source: 'Davey — Jazz Piano Basics',
      summary: 'The 3rd and 7th tell you everything: major vs. minor, maj7 vs. dom7. Play just two notes.',
      drills: [
        { name: 'Cmaj7 (3 7)',     pcs: [4, 11], rootPc: 0,  quality: 'maj7' },
        { name: 'C7   (3 b7)',     pcs: [4, 10], rootPc: 0,  quality: '7' },
        { name: 'Cm7  (b3 b7)',    pcs: [3, 10], rootPc: 0,  quality: 'm7' },
        { name: 'Cø   (b3 b7)',    pcs: [3, 10], rootPc: 0,  quality: 'm7b5' },
      ],
    },
    {
      id: 'shells-ii-V-I-C',
      title: 'ii-V-I shells in C (3-7-9)',
      source: 'Davey — Guide tones + one',
      summary: 'Add the 9th on top of guide tones. Voice-leading rule: 7th drops a half step to become the 3rd of the next chord.',
      drills: [
        { name: 'Dm7   (F-C-E)',   pcs: [5, 0, 4],    rootPc: 2, quality: 'm7' },
        { name: 'G7    (F-B-A)',   pcs: [5, 11, 9],   rootPc: 7, quality: '7' },
        { name: 'Cmaj7 (E-B-D)',   pcs: [4, 11, 2],   rootPc: 0, quality: 'maj7' },
      ],
    },
    {
      id: 'five-qualities',
      title: 'The five chord qualities',
      source: 'Dyas — Monk Institute',
      summary: 'Major7, Dominant7, Minor7, Half-Diminished, Diminished7 — the alphabet of jazz harmony.',
      drills: [
        { name: 'Cmaj7  (1 3 5 7)',     pcs: [0, 4, 7, 11], rootPc: 0, quality: 'maj7' },
        { name: 'C7     (1 3 5 b7)',    pcs: [0, 4, 7, 10], rootPc: 0, quality: '7' },
        { name: 'Cm7    (1 b3 5 b7)',   pcs: [0, 3, 7, 10], rootPc: 0, quality: 'm7' },
        { name: 'Cø     (1 b3 b5 b7)',  pcs: [0, 3, 6, 10], rootPc: 0, quality: 'm7b5' },
        { name: 'C°7    (1 b3 b5 6)',   pcs: [0, 3, 6, 9],  rootPc: 0, quality: 'dim7' },
      ],
    },
    {
      id: 'minor-ii-V-i-C',
      title: 'Minor ii-V-i in C minor',
      source: 'Dyas — Monk Institute',
      summary: 'Dø → G7alt → Cm. The half-diminished ii is the gateway to minor tonality.',
      drills: [
        { name: 'Dø  (D F Ab C)',       pcs: [2, 5, 8, 0],  rootPc: 2, quality: 'm7b5' },
        { name: 'G7  (G B D F)',         pcs: [7, 11, 2, 5], rootPc: 7, quality: '7' },
        { name: 'Cm7 (C Eb G Bb)',       pcs: [0, 3, 7, 10], rootPc: 0, quality: 'm7' },
      ],
    },
    {
      id: 'cycle-ii-V-I',
      title: 'ii-V-I in all 12 keys',
      source: 'Davey — Cycle 5 drill',
      summary: 'The pianist\'s rite of passage. Walk ii-V-I around the cycle of fifths. Alternate Category A and B voicings.',
      generated: true, // built dynamically from cycleIIVIProgression()
    },
  ];

  return {
    TEMPLATES,
    LESSONS,
    realize,
    buildProgression,
    cycleIIVIProgression,
    voiceProgressionAlternating,
  };
})();

if (typeof window !== 'undefined') window.Voicings = Voicings;
if (typeof module !== 'undefined') module.exports = Voicings;
