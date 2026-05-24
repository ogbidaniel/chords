// theory.js — music-theory primitives.
// All MIDI numbers, all pitch-class math. No DOM, no MIDI I/O — pure functions.

const Theory = (() => {
  // Sharps & flats. We pick based on key context when rendering chord names.
  const SHARP_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const FLAT_NAMES  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

  // Major-scale intervals from root, in semitones: W W H W W W H
  const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

  // Pitch-class numbers for chord-quality matching.
  // We define each quality by INTERVALS from root (not absolute notes).
  // Use these to test "is this set of held notes a [quality] of [root]?"
  const QUALITY_INTERVALS = {
    'maj7':   [0, 4, 7, 11],
    '7':      [0, 4, 7, 10],
    'm7':     [0, 3, 7, 10],
    'm7b5':   [0, 3, 6, 10],
    'dim7':   [0, 3, 6, 9],
    'mMaj7':  [0, 3, 7, 11],
    'maj6':   [0, 4, 7, 9],
    'm6':     [0, 3, 7, 9],
    '7sus4':  [0, 5, 7, 10],
    // Triads (lower priority — only matched when exactly 3 distinct PCs)
    'maj':    [0, 4, 7],
    'm':      [0, 3, 7],
    'dim':    [0, 3, 6],
    'aug':    [0, 4, 8],
  };

  // Display name for a chord quality
  const QUALITY_LABEL = {
    'maj7':  'maj7',  '7':     '7',     'm7':    'm7',
    'm7b5':  'ø',     'dim7':  '°7',    'mMaj7': 'mMaj7',
    'maj6':  '6',     'm6':    'm6',    '7sus4': '7sus4',
    'maj':   '',      'm':     'm',     'dim':   '°',     'aug': '+',
  };

  // Priority for ambiguous matches (7-note chords win over triads, etc.)
  const QUALITY_PRIORITY = ['maj7','7','m7','m7b5','dim7','mMaj7','maj6','m6','7sus4','maj','m','dim','aug'];

  function noteName(midi, preferFlat = false) {
    const names = preferFlat ? FLAT_NAMES : SHARP_NAMES;
    return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
  }

  function pcName(pc, preferFlat = false) {
    return (preferFlat ? FLAT_NAMES : SHARP_NAMES)[((pc % 12) + 12) % 12];
  }

  function isBlackKey(midi) {
    return [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
  }

  // Build a major scale starting at root (in semitones from root, mod 12)
  function majorScalePCs(rootPc) {
    return MAJOR_INTERVALS.map(i => (rootPc + i) % 12);
  }

  // Detect chord quality from a set of MIDI notes.
  // Returns { rootPc, quality, label, name } or null.
  // Strategy: try every PC as the root. For each, check which quality
  // matches exactly. Prefer higher-priority qualities and lower root in voicing.
  function detectChord(midiNotes) {
    if (!midiNotes || midiNotes.size < 3) return null;
    const pcs = new Set([...midiNotes].map(n => ((n % 12) + 12) % 12));
    const pcArr = [...pcs];
    if (pcArr.length < 3) return null;

    // Lowest-sounding note hints at root; we'll bias toward that.
    const sortedMidi = [...midiNotes].sort((a, b) => a - b);
    const bassPc = sortedMidi[0] % 12;

    const candidates = [];

    for (const rootPc of pcArr) {
      for (const q of QUALITY_PRIORITY) {
        const intervals = QUALITY_INTERVALS[q];
        // Triads only match when exactly 3 PCs
        if (intervals.length === 3 && pcArr.length !== 3) continue;
        // 4-note qualities only match when exactly 4 PCs (or 3 if one is doubled — but PCs are a set, so length must be 4)
        if (intervals.length === 4 && pcArr.length !== 4) continue;

        const required = new Set(intervals.map(i => (rootPc + i) % 12));
        if (required.size !== pcArr.length) continue;
        let ok = true;
        for (const pc of pcArr) {
          if (!required.has(pc)) { ok = false; break; }
        }
        if (ok) {
          candidates.push({
            rootPc,
            quality: q,
            priority: QUALITY_PRIORITY.indexOf(q),
            isBassRoot: rootPc === bassPc,
          });
        }
      }
    }

    if (candidates.length === 0) return null;

    // Prefer (1) bass-is-root, (2) higher-priority quality
    candidates.sort((a, b) => {
      if (a.isBassRoot !== b.isBassRoot) return a.isBassRoot ? -1 : 1;
      return a.priority - b.priority;
    });
    const best = candidates[0];
    const preferFlat = bestPreferFlat(best.rootPc);
    const rootName = pcName(best.rootPc, preferFlat);
    const label = QUALITY_LABEL[best.quality];
    return {
      rootPc: best.rootPc,
      quality: best.quality,
      rootName,
      label,
      name: rootName + label,
    };
  }

  // Roman numeral degree of a chord root relative to a tonic.
  // Returns { roman, function } e.g. {roman:'ii', function:'predominant'}
  function romanInKey(chordRootPc, chordQuality, tonicPc) {
    const interval = ((chordRootPc - tonicPc) % 12 + 12) % 12;
    const map = {
      0:  { num: 'I',   alt: 'I'   },
      1:  { num: 'bII', alt: 'bII' },
      2:  { num: 'ii',  alt: 'II'  },
      3:  { num: 'bIII',alt: 'bIII'},
      4:  { num: 'iii', alt: 'III' },
      5:  { num: 'IV',  alt: 'IV'  },
      6:  { num: '#IV', alt: '#IV' },
      7:  { num: 'V',   alt: 'V'   },
      8:  { num: 'bVI', alt: 'bVI' },
      9:  { num: 'vi',  alt: 'VI'  },
      10: { num: 'bVII',alt: 'bVII'},
      11: { num: 'vii', alt: 'VII' },
    };
    const entry = map[interval];
    if (!entry) return null;

    // Quality-aware capitalization
    const isMinorish = ['m7', 'm', 'm7b5', 'dim7', 'dim', 'mMaj7', 'm6'].includes(chordQuality);
    const isDominant = chordQuality === '7';
    let roman = isMinorish ? entry.num.toLowerCase() : entry.num;
    // Preserve flats
    roman = roman.replace(/^b/, 'b');

    let suffix = '';
    if (chordQuality === 'maj7') suffix = 'Δ';
    else if (chordQuality === '7') suffix = '7';
    else if (chordQuality === 'm7') suffix = '7';
    else if (chordQuality === 'm7b5') suffix = 'ø';
    else if (chordQuality === 'dim7') suffix = '°7';

    return { roman: roman + suffix, interval, isDominant, isMinorish };
  }

  // Whether to prefer flat spelling for a given root pitch-class.
  // Heuristic: F, Bb, Eb, Ab, Db, Gb keys use flats. C and sharp keys use sharps.
  // For chord roots: black keys default to flat unless the surrounding context says otherwise.
  function bestPreferFlat(pc) {
    return [1, 3, 6, 8, 10].includes(pc); // Db, Eb, Gb, Ab, Bb
  }

  // Cycle of 5ths (descending fifths = ascending fourths)
  // Standard practice order: C → F → Bb → Eb → Ab → Db → Gb/F# → B → E → A → D → G → C
  const CYCLE_OF_FIFTHS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];

  return {
    SHARP_NAMES, FLAT_NAMES,
    QUALITY_INTERVALS, QUALITY_LABEL,
    CYCLE_OF_FIFTHS,
    noteName, pcName, isBlackKey,
    majorScalePCs,
    detectChord,
    romanInKey,
    bestPreferFlat,
  };
})();

if (typeof window !== 'undefined') window.Theory = Theory;
if (typeof module !== 'undefined') module.exports = Theory;
