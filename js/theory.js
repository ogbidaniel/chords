// theory.js — music-theory primitives.
// Pure functions. MIDI numbers, pitch-class math. No DOM, no audio, no MIDI I/O.

const Theory = (() => {
  const SHARP_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const FLAT_NAMES  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

  // Pitch-class number for each note-name spelling (used by name parsers)
  const NAME_TO_PC = {
    'C':0,'B#':0,
    'C#':1,'Db':1,
    'D':2,
    'D#':3,'Eb':3,
    'E':4,'Fb':4,
    'F':5,'E#':5,
    'F#':6,'Gb':6,
    'G':7,
    'G#':8,'Ab':8,
    'A':9,
    'A#':10,'Bb':10,
    'B':11,'Cb':11,
  };

  // Chord quality dictionary. Each entry: intervals from root in semitones.
  // Ordered roughly by priority — when a played note-set matches multiple
  // qualities (rare but possible), earlier entries win.
  const QUALITIES = {
    // 4-note 7th chords (core jazz)
    'maj7':   { intervals: [0,4,7,11], label: 'maj7',  symbol: 'maj7',  family: '7th' },
    '7':      { intervals: [0,4,7,10], label: '7',     symbol: '7',     family: '7th' },
    'm7':     { intervals: [0,3,7,10], label: 'm7',    symbol: 'm7',    family: '7th' },
    'm7b5':   { intervals: [0,3,6,10], label: 'ø',     symbol: 'm7b5',  family: '7th' },
    'dim7':   { intervals: [0,3,6,9],  label: '°7',    symbol: 'dim7',  family: '7th' },
    'mMaj7':  { intervals: [0,3,7,11], label: 'm(maj7)', symbol: 'mMaj7', family: '7th' },
    '7sus4':  { intervals: [0,5,7,10], label: '7sus4', symbol: '7sus4', family: '7th' },
    'aug7':   { intervals: [0,4,8,10], label: '+7',    symbol: 'aug7',  family: '7th' },
    // 6 chords
    '6':      { intervals: [0,4,7,9],  label: '6',     symbol: '6',     family: '6th' },
    'm6':     { intervals: [0,3,7,9],  label: 'm6',    symbol: 'm6',    family: '6th' },
    // Triads (lower priority — match only when exactly 3 pitch classes)
    'maj':    { intervals: [0,4,7],    label: '',      symbol: 'maj',   family: 'triad' },
    'm':      { intervals: [0,3,7],    label: 'm',     symbol: 'm',     family: 'triad' },
    'dim':    { intervals: [0,3,6],    label: '°',     symbol: 'dim',   family: 'triad' },
    'aug':    { intervals: [0,4,8],    label: '+',     symbol: 'aug',   family: 'triad' },
    'sus2':   { intervals: [0,2,7],    label: 'sus2',  symbol: 'sus2',  family: 'triad' },
    'sus4':   { intervals: [0,5,7],    label: 'sus4',  symbol: 'sus4',  family: 'triad' },
    // Extended (5 notes — used in reference, not always matched live)
    'maj9':   { intervals: [0,4,7,11,14], label: 'maj9', symbol: 'maj9', family: 'extended' },
    '9':      { intervals: [0,4,7,10,14], label: '9',    symbol: '9',    family: 'extended' },
    'm9':     { intervals: [0,3,7,10,14], label: 'm9',   symbol: 'm9',   family: 'extended' },
    // Altered dominants (commonly 4-note rootless voicings + alteration)
    '7b9':    { intervals: [0,4,7,10,13], label: '7♭9', symbol: '7b9',  family: 'altered' },
    '7#9':    { intervals: [0,4,7,10,15], label: '7♯9', symbol: '7#9',  family: 'altered' },
    '7b5':    { intervals: [0,4,6,10],    label: '7♭5', symbol: '7b5',  family: 'altered' },
    '7#5':    { intervals: [0,4,8,10],    label: '7♯5', symbol: '7#5',  family: 'altered' },
    '7#11':   { intervals: [0,4,7,10,18], label: '7♯11',symbol: '7#11', family: 'altered' },
  };

  // Priority list — try 4-note 7ths first, then 6 chords, then triads
  const QUALITY_PRIORITY = [
    'maj7','7','m7','m7b5','dim7','mMaj7','7sus4','aug7',
    '6','m6',
    'maj','m','dim','aug','sus2','sus4',
    'maj9','9','m9','7b9','7#9','7b5','7#5','7#11',
  ];

  // Scales — intervals from root in semitones. Used for reference + scale highlighting.
  const SCALES = {
    'major':           { intervals: [0,2,4,5,7,9,11],   label: 'Major (Ionian)' },
    'natural-minor':   { intervals: [0,2,3,5,7,8,10],   label: 'Natural Minor (Aeolian)' },
    'harmonic-minor':  { intervals: [0,2,3,5,7,8,11],   label: 'Harmonic Minor' },
    'melodic-minor':   { intervals: [0,2,3,5,7,9,11],   label: 'Melodic Minor (ascending)' },
    'dorian':          { intervals: [0,2,3,5,7,9,10],   label: 'Dorian' },
    'phrygian':        { intervals: [0,1,3,5,7,8,10],   label: 'Phrygian' },
    'lydian':          { intervals: [0,2,4,6,7,9,11],   label: 'Lydian' },
    'mixolydian':      { intervals: [0,2,4,5,7,9,10],   label: 'Mixolydian' },
    'locrian':         { intervals: [0,1,3,5,6,8,10],   label: 'Locrian' },
    'major-pent':      { intervals: [0,2,4,7,9],        label: 'Major Pentatonic' },
    'minor-pent':      { intervals: [0,3,5,7,10],       label: 'Minor Pentatonic' },
    'blues':           { intervals: [0,3,5,6,7,10],     label: 'Blues' },
    'whole-tone':      { intervals: [0,2,4,6,8,10],     label: 'Whole Tone' },
    'dim-wh':          { intervals: [0,2,3,5,6,8,9,11], label: 'Diminished (W-H)' },
    'dim-hw':          { intervals: [0,1,3,4,6,7,9,10], label: 'Diminished (H-W)' },
    'altered':         { intervals: [0,1,3,4,6,8,10],   label: 'Altered (Super Locrian)' },
    'lydian-b7':       { intervals: [0,2,4,6,7,9,10],   label: 'Lydian ♭7 (acoustic)' },
    'lydian-aug':      { intervals: [0,2,4,6,8,9,11],   label: 'Lydian Augmented' },
    'bebop-dom':       { intervals: [0,2,4,5,7,9,10,11],label: 'Bebop Dominant' },
    'bebop-maj':       { intervals: [0,2,4,5,7,8,9,11], label: 'Bebop Major' },
  };

  // Intervals (semitones → name)
  const INTERVALS = [
    { semitones: 0,  short: 'P1',  name: 'Perfect Unison' },
    { semitones: 1,  short: 'm2',  name: 'Minor 2nd' },
    { semitones: 2,  short: 'M2',  name: 'Major 2nd' },
    { semitones: 3,  short: 'm3',  name: 'Minor 3rd' },
    { semitones: 4,  short: 'M3',  name: 'Major 3rd' },
    { semitones: 5,  short: 'P4',  name: 'Perfect 4th' },
    { semitones: 6,  short: 'TT',  name: 'Tritone' },
    { semitones: 7,  short: 'P5',  name: 'Perfect 5th' },
    { semitones: 8,  short: 'm6',  name: 'Minor 6th' },
    { semitones: 9,  short: 'M6',  name: 'Major 6th' },
    { semitones: 10, short: 'm7',  name: 'Minor 7th' },
    { semitones: 11, short: 'M7',  name: 'Major 7th' },
    { semitones: 12, short: 'P8',  name: 'Perfect Octave' },
  ];

  // Cycle of fifths order (counterclockwise from C — fourths direction, which is
  // the way jazz typically practices: C → F → Bb → Eb → ...)
  const CYCLE_FOURTHS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];
  // Clockwise cycle (fifths direction): C → G → D → A → ...
  const CYCLE_FIFTHS  = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

  // ----- name helpers -----

  function pcName(pc, preferFlat = false) {
    pc = ((pc % 12) + 12) % 12;
    return (preferFlat ? FLAT_NAMES : SHARP_NAMES)[pc];
  }

  function noteLabel(midi) {
    return `${SHARP_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
  }

  function isBlackKey(midi) {
    return [1,3,6,8,10].includes(((midi % 12) + 12) % 12);
  }

  // Black-key roots conventionally take flat spelling in jazz contexts
  function preferFlat(pc) { return [1,3,6,8,10].includes(((pc % 12) + 12) % 12); }

  // Realize a chord into pitch-class set
  function chordPcs(rootPc, qualityKey) {
    const q = QUALITIES[qualityKey];
    if (!q) return null;
    return q.intervals.map(i => ((rootPc + i) % 12 + 12) % 12);
  }

  // Realize a chord into MIDI notes anchored at a given octave
  function chordMidi(rootPc, qualityKey, rootOctave = 4) {
    const q = QUALITIES[qualityKey];
    if (!q) return null;
    const rootMidi = 12 * (rootOctave + 1) + (((rootPc % 12) + 12) % 12);
    return q.intervals.map(i => rootMidi + i);
  }

  // Realize a scale into pitch classes
  function scalePcs(rootPc, scaleKey) {
    const s = SCALES[scaleKey];
    if (!s) return null;
    return s.intervals.map(i => ((rootPc + i) % 12 + 12) % 12);
  }

  // Build chord-name string from root pc + quality
  function chordName(rootPc, qualityKey, useFlats) {
    const q = QUALITIES[qualityKey];
    if (!q) return '?';
    const flat = useFlats != null ? useFlats : preferFlat(rootPc);
    return pcName(rootPc, flat) + q.label;
  }

  // Detect chord from a set of MIDI notes.
  // Returns { rootPc, quality, name, label } or null.
  function detectChord(midiNotes) {
    if (!midiNotes || midiNotes.size < 3) return null;
    const pcs = new Set([...midiNotes].map(n => ((n % 12) + 12) % 12));
    const pcArr = [...pcs];
    if (pcArr.length < 3) return null;

    // Bass note (lowest MIDI) hints at root
    const sortedMidi = [...midiNotes].sort((a, b) => a - b);
    const bassPc = ((sortedMidi[0] % 12) + 12) % 12;

    const candidates = [];
    for (const rootPc of pcArr) {
      for (let pi = 0; pi < QUALITY_PRIORITY.length; pi++) {
        const qKey = QUALITY_PRIORITY[pi];
        const q = QUALITIES[qKey];
        const required = new Set(q.intervals.map(i => (rootPc + i) % 12));
        if (required.size !== pcArr.length) continue;
        let ok = true;
        for (const pc of pcArr) if (!required.has(pc)) { ok = false; break; }
        if (ok) {
          candidates.push({ rootPc, quality: qKey, priority: pi, bassIsRoot: rootPc === bassPc });
        }
      }
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => {
      if (a.bassIsRoot !== b.bassIsRoot) return a.bassIsRoot ? -1 : 1;
      return a.priority - b.priority;
    });
    const best = candidates[0];
    return {
      rootPc: best.rootPc,
      quality: best.quality,
      label: QUALITIES[best.quality].label,
      name: chordName(best.rootPc, best.quality),
    };
  }

  // Roman numeral relative to a tonic pitch class and major/minor mode
  // Returns { roman, function } or null
  function romanInKey(chordRootPc, qualityKey, tonicPc, mode = 'major') {
    const interval = ((chordRootPc - tonicPc) % 12 + 12) % 12;
    const numerals = {
      0:  { num: 'I',   alt: 'I'    },
      1:  { num: 'bII', alt: 'bII'  },
      2:  { num: 'ii',  alt: 'II'   },
      3:  { num: 'bIII',alt: 'bIII' },
      4:  { num: 'iii', alt: 'III'  },
      5:  { num: 'IV',  alt: 'IV'   },
      6:  { num: '#IV', alt: '#IV'  },
      7:  { num: 'V',   alt: 'V'    },
      8:  { num: 'bVI', alt: 'bVI'  },
      9:  { num: 'vi',  alt: 'VI'   },
      10: { num: 'bVII',alt: 'bVII' },
      11: { num: 'vii', alt: 'VII'  },
    };
    const entry = numerals[interval];
    if (!entry) return null;
    const isMinorish = ['m7','m','m7b5','dim7','dim','mMaj7','m6','m9'].includes(qualityKey);
    let roman = isMinorish ? entry.num.toLowerCase() : entry.num;
    let suffix = '';
    const q = QUALITIES[qualityKey];
    if (q) {
      if (qualityKey === 'maj7') suffix = 'Δ';
      else if (qualityKey === '7') suffix = '7';
      else if (qualityKey === 'm7') suffix = '7';
      else if (qualityKey === 'm7b5') suffix = 'ø';
      else if (qualityKey === 'dim7') suffix = '°7';
    }
    return { roman: roman + suffix, interval, isMinor: isMinorish };
  }

  // Diatonic 7th chords in a major key — returns array of {degree, rootPc, quality}
  function diatonicSevenths(tonicPc, mode = 'major') {
    // Major: I=maj7, ii=m7, iii=m7, IV=maj7, V=7, vi=m7, viiø=m7b5
    const major = [
      { degree: 'I',    interval: 0,  quality: 'maj7' },
      { degree: 'ii',   interval: 2,  quality: 'm7' },
      { degree: 'iii',  interval: 4,  quality: 'm7' },
      { degree: 'IV',   interval: 5,  quality: 'maj7' },
      { degree: 'V',    interval: 7,  quality: '7' },
      { degree: 'vi',   interval: 9,  quality: 'm7' },
      { degree: 'viiø', interval: 11, quality: 'm7b5' },
    ];
    // Natural minor — relative to the minor tonic, harmonized from natural-minor scale
    const minor = [
      { degree: 'i',    interval: 0,  quality: 'm7' },
      { degree: 'iiø',  interval: 2,  quality: 'm7b5' },
      { degree: 'bIII', interval: 3,  quality: 'maj7' },
      { degree: 'iv',   interval: 5,  quality: 'm7' },
      { degree: 'v',    interval: 7,  quality: 'm7' },     // natural v; jazz often uses V7
      { degree: 'bVI',  interval: 8,  quality: 'maj7' },
      { degree: 'bVII', interval: 10, quality: '7' },
    ];
    const set = mode === 'minor' ? minor : major;
    return set.map(s => ({
      degree: s.degree,
      rootPc: (tonicPc + s.interval) % 12,
      quality: s.quality,
      name: chordName((tonicPc + s.interval) % 12, s.quality),
    }));
  }

  return {
    SHARP_NAMES, FLAT_NAMES, NAME_TO_PC,
    QUALITIES, QUALITY_PRIORITY, SCALES, INTERVALS,
    CYCLE_FOURTHS, CYCLE_FIFTHS,
    pcName, noteLabel, isBlackKey, preferFlat,
    chordPcs, chordMidi, scalePcs, chordName,
    detectChord, romanInKey, diatonicSevenths,
  };
})();

if (typeof window !== 'undefined') window.Theory = Theory;
if (typeof module !== 'undefined') module.exports = Theory;
