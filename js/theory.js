// theory.js — music theory primitives.
// Pure functions, no DOM dependencies. Exported as global Theory.

const Theory = (() => {
  const SHARP_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const FLAT_NAMES  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

  // PCs that traditionally take flat naming
  const FLAT_PCS = new Set([1, 3, 6, 8, 10]); // Db, Eb, Gb, Ab, Bb
  function preferFlat(pc) { return FLAT_PCS.has(pc % 12); }
  function pcName(pc, flat = false) {
    pc = ((pc % 12) + 12) % 12;
    return flat ? FLAT_NAMES[pc] : SHARP_NAMES[pc];
  }
  function mod12(n) { return ((n % 12) + 12) % 12; }

  // Chord types — quality definitions
  const CHORD_TYPES = {
    'maj7':   { label: 'maj7',  thirdInterval: 4, fifthInterval: 7,  seventhInterval: 11, scaleIntervals: [0,2,4,5,7,9,11] },
    '7':      { label: '7',     thirdInterval: 4, fifthInterval: 7,  seventhInterval: 10, scaleIntervals: [0,2,4,5,7,9,10] }, // mixolydian
    'm7':     { label: 'm7',    thirdInterval: 3, fifthInterval: 7,  seventhInterval: 10, scaleIntervals: [0,2,3,5,7,9,10] }, // dorian
    'm7b5':   { label: 'ø',     thirdInterval: 3, fifthInterval: 6,  seventhInterval: 10, scaleIntervals: [0,2,3,5,6,8,10] },
    'dim7':   { label: '°7',    thirdInterval: 3, fifthInterval: 6,  seventhInterval: 9,  scaleIntervals: [0,2,3,5,6,8,9,11], requireAll: true },
    'maj':    { label: '',      thirdInterval: 4, fifthInterval: 7,  seventhInterval: null, scaleIntervals: [0,2,4,5,7,9,11] },
    'm':      { label: 'm',     thirdInterval: 3, fifthInterval: 7,  seventhInterval: null, scaleIntervals: [0,2,3,5,7,9,10] },
    'dim':    { label: '°',     thirdInterval: 3, fifthInterval: 6,  seventhInterval: null, scaleIntervals: [0,2,3,5,6,8,9,11] },
    'aug':    { label: '+',     thirdInterval: 4, fifthInterval: 8,  seventhInterval: null, scaleIntervals: [0,2,4,6,8,10] },
  };
  // Priority order — most-specific (4-note 7th chords) first
  const TYPE_PRIORITY = ['maj7','7','m7','m7b5','dim7','maj','m','dim','aug'];

  // Extension interval → label
  const EXTENSION_LABELS = {
    1: 'b9', 2: '9', 3: '#9',
    5: '11', 6: '#11',
    8: 'b13', 9: '13',
  };
  function degreeFromInterval(i) {
    const map = { 0:'R', 1:'b9', 2:'9', 3:'#9', 4:'3', 5:'11', 6:'#11', 7:'5', 8:'b13', 9:'13', 10:'b7', 11:'7' };
    return map[i] || ('?' + i);
  }

  // Scale data — by mode
  const SCALE_INTERVALS = {
    'major':           [0,2,4,5,7,9,11],     // Ionian
    'natural-minor':   [0,2,3,5,7,8,10],     // Aeolian
    'harmonic-minor':  [0,2,3,5,7,8,11],
    'melodic-minor':   [0,2,3,5,7,9,11],
  };

  // Key signature info — for VexFlow rendering
  // Returns { sharps, flats, name } for VexFlow
  // VexFlow accepts strings like "C", "G", "F", "Bb", "F#", "Cm", "Am" etc.
  const KEY_SIGNATURES = {
    'major': {
      0:  { name: 'C',  sharps: 0, flats: 0 },
      7:  { name: 'G',  sharps: 1, flats: 0 },
      2:  { name: 'D',  sharps: 2, flats: 0 },
      9:  { name: 'A',  sharps: 3, flats: 0 },
      4:  { name: 'E',  sharps: 4, flats: 0 },
      11: { name: 'B',  sharps: 5, flats: 0 },
      6:  { name: 'F#', sharps: 6, flats: 0 },
      5:  { name: 'F',  sharps: 0, flats: 1 },
      10: { name: 'Bb', sharps: 0, flats: 2 },
      3:  { name: 'Eb', sharps: 0, flats: 3 },
      8:  { name: 'Ab', sharps: 0, flats: 4 },
      1:  { name: 'Db', sharps: 0, flats: 5 },
    },
    'natural-minor': {
      9:  { name: 'Am', sharps: 0, flats: 0 },
      4:  { name: 'Em', sharps: 1, flats: 0 },
      11: { name: 'Bm', sharps: 2, flats: 0 },
      6:  { name: 'F#m', sharps: 3, flats: 0 },
      1:  { name: 'C#m', sharps: 4, flats: 0 },
      8:  { name: 'G#m', sharps: 5, flats: 0 },
      3:  { name: 'D#m', sharps: 6, flats: 0 },
      2:  { name: 'Dm', sharps: 0, flats: 1 },
      7:  { name: 'Gm', sharps: 0, flats: 2 },
      0:  { name: 'Cm', sharps: 0, flats: 3 },
      5:  { name: 'Fm', sharps: 0, flats: 4 },
      10: { name: 'Bbm', sharps: 0, flats: 5 },
    },
  };

  function keySignature(tonicPc, mode = 'major') {
    const table = KEY_SIGNATURES[mode] || KEY_SIGNATURES['major'];
    return table[tonicPc] || { name: 'C', sharps: 0, flats: 0 };
  }

  // Cycle of fifths visual order (counter-clockwise = fourths)
  const CYCLE_FOURTHS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7]; // C F Bb Eb Ab Db Gb B E A D G
  const CYCLE_FIFTHS  = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]; // C G D A E B F# Db Ab Eb Bb F

  // MIDI octave math: middle C (C4) = MIDI 60. Octave N tonic = (N+1)*12 + pc.
  function octaveBase(octave) { return (octave + 1) * 12; }

  // Build the MIDI pitches of a triad/7th chord skeleton (root + 3 + 7)
  function skeletonMidi37(rootPc, type, octave = 4) {
    const t = CHORD_TYPES[type];
    if (!t) return null;
    const r = octaveBase(octave) + (rootPc % 12);
    const third = r + t.thirdInterval;
    if (t.seventhInterval == null) return [r, third];
    return [r, third, r + t.seventhInterval];
  }
  function chordMidi(rootPc, type, octave = 4) {
    const t = CHORD_TYPES[type];
    if (!t) return null;
    const r = octaveBase(octave) + (rootPc % 12);
    const result = [r, r + t.thirdInterval, r + t.fifthInterval];
    if (t.seventhInterval != null) result.push(r + t.seventhInterval);
    return result;
  }

  // Build a full scale's MIDI notes ascending one octave
  function scaleMidi(tonicPc, mode, octave = 4) {
    const intervals = SCALE_INTERVALS[mode];
    if (!intervals) return [];
    const r = octaveBase(octave) + (tonicPc % 12);
    return intervals.map(i => r + i).concat([r + 12]); // include octave
  }

  // Detection — voicing-invariant pitch-class recognition
  function detectChord(midiNotes) {
    if (!midiNotes || midiNotes.size < 2) return null;
    const sortedMidi = [...midiNotes].sort((a, b) => a - b);
    const playedPcs = new Set(sortedMidi.map(m => mod12(m)));
    const bassPc = mod12(sortedMidi[0]);

    if (playedPcs.size === 2) return detectFromSkeleton2(playedPcs, bassPc);

    const candidates = [];
    for (const rootPc of playedPcs) {
      for (const typeKey of TYPE_PRIORITY) {
        const t = CHORD_TYPES[typeKey];
        const hit = tryRecognize(playedPcs, rootPc, typeKey, t, bassPc);
        if (hit) candidates.push(hit);
      }
    }
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      if (a.foreign.length !== b.foreign.length) return a.foreign.length - b.foreign.length;
      if (a.chordTones.length !== b.chordTones.length) return b.chordTones.length - a.chordTones.length;
      if (a.typePriority !== b.typePriority) return a.typePriority - b.typePriority;
      if (a.extensions.length !== b.extensions.length) return a.extensions.length - b.extensions.length;
      if (a.bassIsRoot !== b.bassIsRoot) return a.bassIsRoot ? -1 : 1;
      return 0;
    });
    return finalize(candidates[0], bassPc);
  }

  function tryRecognize(playedPcs, rootPc, typeKey, t, bassPc) {
    const needThird = mod12(rootPc + t.thirdInterval);
    const needSeventh = t.seventhInterval != null ? mod12(rootPc + t.seventhInterval) : null;
    const needFifth = t.fifthInterval != null ? mod12(rootPc + t.fifthInterval) : null;

    if (t.requireAll) {
      if (!playedPcs.has(rootPc)) return null;
      if (!playedPcs.has(needThird)) return null;
      if (!playedPcs.has(needFifth)) return null;
      if (!playedPcs.has(needSeventh)) return null;
    } else {
      if (!playedPcs.has(rootPc)) return null;
      if (!playedPcs.has(needThird)) return null;
      if (t.seventhInterval != null) {
        if (!playedPcs.has(needSeventh)) return null;
      } else {
        if (needFifth != null && !playedPcs.has(needFifth)) return null;
      }
    }

    const chordTones = new Set([rootPc, needThird]);
    if (needFifth != null && playedPcs.has(needFifth)) chordTones.add(needFifth);
    if (needSeventh != null) chordTones.add(needSeventh);

    const extensions = [];
    const foreign = [];
    const scaleSet = new Set(t.scaleIntervals.map(i => mod12(rootPc + i)));

    for (const pc of playedPcs) {
      if (chordTones.has(pc)) continue;
      const interval = mod12(pc - rootPc);
      const extLabel = EXTENSION_LABELS[interval] || EXTENSION_LABELS[interval + 12];
      if (extLabel && scaleSet.has(pc)) {
        extensions.push(extLabel);
      } else if (extLabel && (extLabel.startsWith('b') || extLabel.startsWith('#'))) {
        if (typeKey === '7' || (extLabel === '#11' && (typeKey === 'maj7' || typeKey === 'm7'))) {
          extensions.push(extLabel);
        } else {
          foreign.push(pc);
        }
      } else if (scaleSet.has(pc)) {
        extensions.push(degreeFromInterval(interval));
      } else {
        foreign.push(pc);
      }
    }

    return {
      rootPc, typeKey,
      typePriority: TYPE_PRIORITY.indexOf(typeKey),
      chordTones: [...chordTones],
      extensions, foreign,
      bassIsRoot: bassPc === rootPc,
      isSkeleton: false,
    };
  }

  function detectFromSkeleton2(playedPcs, bassPc) {
    const candidates = [];
    // Try all 12 PCs as candidate roots (rootless voicings have neither
    // the played notes equal to the root — e.g. E+B might be Cmaj7's 3+7)
    for (let rootPc = 0; rootPc < 12; rootPc++) {
      for (const typeKey of ['maj7', '7', 'm7']) {
        const t = CHORD_TYPES[typeKey];
        const third = mod12(rootPc + t.thirdInterval);
        const seventh = mod12(rootPc + t.seventhInterval);
        if (playedPcs.has(third) && playedPcs.has(seventh)) {
          candidates.push({
            rootPc, typeKey,
            typePriority: TYPE_PRIORITY.indexOf(typeKey),
            chordTones: [rootPc, third, seventh],
            extensions: [], foreign: [],
            bassIsRoot: bassPc === rootPc,
            rootIsPlayed: playedPcs.has(rootPc),
            isSkeleton: !playedPcs.has(rootPc),
          });
        }
      }
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => {
      // Prefer interpretations where the root IS one of the played notes
      // (true rootless < skeleton with root)
      if (a.rootIsPlayed !== b.rootIsPlayed) return a.rootIsPlayed ? -1 : 1;
      if (a.bassIsRoot !== b.bassIsRoot) return a.bassIsRoot ? -1 : 1;
      return a.typePriority - b.typePriority;
    });
    return finalize(candidates[0], bassPc);
  }

  function finalize(best, bassPc) {
    // Bass is a "real" slash only if it's not a chord tone — otherwise it's
    // just an inversion (e.g. Cmaj7 with E in the bass is still Cmaj7, not
    // Cmaj7/E to the user). We keep the bass field but only display it as
    // a slash if appropriate.
    const bassIsChordTone = best.chordTones.includes(bassPc);
    return {
      root: best.rootPc,
      type: best.typeKey,
      bass: (bassPc !== best.rootPc && !bassIsChordTone) ? bassPc : null,
      extensions: best.extensions,
      foreign: best.foreign,
      chordTones: best.chordTones,
      confidence: best.foreign.length === 0 ? 'high' : best.foreign.length === 1 ? 'partial' : 'ambiguous',
      isSkeleton: best.isSkeleton,
    };
  }

  // Format a chord name from detection
  function chordName(d) {
    if (!d) return '';
    const flat = preferFlat(d.root);
    let name = pcName(d.root, flat);
    const t = CHORD_TYPES[d.type];
    if (t) name += t.label;
    if (d.extensions && d.extensions.length) {
      // Compress maj7+9 to maj9, 7+9 to 9, etc.
      const exts = [...d.extensions];
      if (d.type === 'maj7' && exts.includes('9') && !exts.includes('11') && !exts.includes('13')) {
        name = pcName(d.root, flat) + 'maj9'; exts.splice(exts.indexOf('9'), 1);
      } else if (d.type === '7' && exts.includes('9') && !exts.includes('11') && !exts.includes('13')) {
        name = pcName(d.root, flat) + '9'; exts.splice(exts.indexOf('9'), 1);
      } else if (d.type === 'm7' && exts.includes('9')) {
        name = pcName(d.root, flat) + 'm9'; exts.splice(exts.indexOf('9'), 1);
      }
      if (exts.length) name += '(' + exts.join(',') + ')';
    }
    if (d.bass != null) name += '/' + pcName(d.bass, preferFlat(d.bass));
    return name;
  }

  // Roman numeral parser: "IIm7" → { degree: 1 (zero-based), interval: 2, type: 'm7' }
  function parseRomanDegree(roman) {
    const ROMAN_DEGREES = { 'I':0, 'II':1, 'III':2, 'IV':3, 'V':4, 'VI':5, 'VII':6 };
    let s = roman.trim();

    let flat = 0;
    if (s.startsWith('b') || s.startsWith('♭')) { flat = -1; s = s.slice(1); }
    else if (s.startsWith('#') || s.startsWith('♯')) { flat = 1; s = s.slice(1); }

    // Try longest match first (VII before V, etc.)
    const numerals = Object.keys(ROMAN_DEGREES).sort((a, b) => b.length - a.length);
    let numeralUpper = null;
    let restAt = -1;
    for (const n of numerals) {
      if (s.toUpperCase().startsWith(n)) {
        numeralUpper = n;
        restAt = n.length;
        break;
      }
    }
    if (numeralUpper === null) return null;
    const isLower = s[0] === s[0].toLowerCase() && /[a-z]/.test(s[0]);
    const degree = ROMAN_DEGREES[numeralUpper];
    const rest = s.slice(restAt);

    let type = isLower ? 'm' : 'maj';
    if (rest === 'm7' || rest === 'min7') type = 'm7';
    else if (rest === 'm7b5' || rest === 'ø' || rest === 'm7♭5') type = 'm7b5';
    else if (rest === 'maj7' || rest === 'M7' || rest === 'Δ') type = 'maj7';
    else if (rest === '7') type = '7';
    else if (rest === 'm' || rest === 'min') type = 'm';
    else if (rest === '°' || rest === 'dim') type = 'dim';
    else if (rest === '°7' || rest === 'dim7') type = 'dim7';
    else if (rest === '+' || rest === 'aug') type = 'aug';
    else if (isLower && rest === '') type = 'm';
    else if (!isLower && rest === '') type = 'maj';

    // Major scale degrees → semitone offsets
    const baseIntervals = [0, 2, 4, 5, 7, 9, 11];
    const interval = mod12(baseIntervals[degree] + flat);

    return { degree, interval, type, isLower, flat };
  }

  // Realize a Roman-numeral progression into concrete chords
  function realizeProgression(romanArr, tonicPc) {
    return romanArr.map(roman => {
      const p = parseRomanDegree(roman);
      if (!p) return null;
      return {
        rootPc: mod12(tonicPc + p.interval),
        type: p.type,
        romanLabel: roman,
      };
    }).filter(Boolean);
  }

  // Public API
  return {
    SHARP_NAMES, FLAT_NAMES,
    CHORD_TYPES, TYPE_PRIORITY,
    SCALE_INTERVALS, CYCLE_FOURTHS, CYCLE_FIFTHS,
    mod12, pcName, preferFlat,
    skeletonMidi37, chordMidi, scaleMidi,
    keySignature,
    detectChord, chordName,
    parseRomanDegree, realizeProgression,
  };
})();

if (typeof window !== 'undefined') window.Theory = Theory;
if (typeof module !== 'undefined') module.exports = Theory;
