// theory.js — music primitives + structured chord detection.
// Pure functions. No DOM, no MIDI I/O.
//
// Detection model:
//   Phase 1: find a root candidate whose 3rd and 7th (or just 3rd, for triads)
//            are present in the played pitch classes.
//   Phase 2: classify remaining notes as 5th, extensions (9/11/13),
//            alterations (b9, #9, b5, #5, #11), or "foreign" (out of chord scale).
//   Output is a structured fact, not a string. UI renders it.

const Theory = (() => {
  const SHARP_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const FLAT_NAMES  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

  const NAME_TO_PC = {
    'C':0,'B#':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'Fb':4,
    'F':5,'E#':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,
    'Bb':10,'B':11,'Cb':11,
  };

  // Cycle of fourths (counterclockwise from C — practice direction).
  const CYCLE_FOURTHS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];
  // Cycle of fifths (clockwise from C).
  const CYCLE_FIFTHS  = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

  // ============ basic helpers ============

  function mod12(n) { return ((n % 12) + 12) % 12; }

  function pcName(pc, preferFlat = false) {
    return (preferFlat ? FLAT_NAMES : SHARP_NAMES)[mod12(pc)];
  }

  function noteLabel(midi) {
    return `${SHARP_NAMES[mod12(midi)]}${Math.floor(midi / 12) - 1}`;
  }

  function isBlackKey(midi) {
    return [1,3,6,8,10].includes(mod12(midi));
  }

  // Black-key roots conventionally take flat spelling in jazz.
  function preferFlat(pc) { return [1,3,6,8,10].includes(mod12(pc)); }

  // ============ chord taxonomy ============

  // The minimal set of chord *types* the app cares about.
  // Each one defined by its essential intervals (the skeleton).
  // The 5th is "optional" — common to omit in rootless voicings.
  // Tensions are notes that belong to the chord's scale but aren't essential.
  //
  // For maj7 / dom7 / m7 / m7b5: skeleton = root + 3 + 7.
  // For triads: skeleton = root + 3 + 5.
  // For diminished 7: skeleton = root + b3 + b5 + bb7 (must be all 4).
  const CHORD_TYPES = {
    'maj7':  { thirdInterval: 4,  seventhInterval: 11, fifthInterval: 7,  scaleIntervals: [0,2,4,5,7,9,11], label: 'maj7', simple: false },
    '7':     { thirdInterval: 4,  seventhInterval: 10, fifthInterval: 7,  scaleIntervals: [0,2,4,5,7,9,10], label: '7',    simple: false },
    'm7':    { thirdInterval: 3,  seventhInterval: 10, fifthInterval: 7,  scaleIntervals: [0,2,3,5,7,9,10], label: 'm7',   simple: false },
    'm7b5':  { thirdInterval: 3,  seventhInterval: 10, fifthInterval: 6,  scaleIntervals: [0,1,3,5,6,8,10], label: 'ø',    simple: false },
    'dim7':  { thirdInterval: 3,  seventhInterval: 9,  fifthInterval: 6,  scaleIntervals: [0,2,3,5,6,8,9,11], label: '°7', simple: false, requireAll: true },
    'maj':   { thirdInterval: 4,                       fifthInterval: 7,  scaleIntervals: [0,2,4,5,7,9,11], label: '',     simple: true },
    'm':     { thirdInterval: 3,                       fifthInterval: 7,  scaleIntervals: [0,2,3,5,7,9,10], label: 'm',    simple: true },
    'dim':   { thirdInterval: 3,                       fifthInterval: 6,  scaleIntervals: [0,1,3,5,6,8,10], label: '°',    simple: true },
  };

  // Try these in order — more-specific 4-note chords win over triads.
  const TYPE_PRIORITY = ['maj7', '7', 'm7', 'm7b5', 'dim7', 'maj', 'm', 'dim'];

  // Extension labels relative to the root, in semitones (above the root, mod 24).
  // 9, 11, 13 (and altered versions) only count as extensions; everything else
  // is "foreign" relative to the chord's scale.
  const EXTENSION_LABELS = {
    14: '9', 13: 'b9', 15: '#9',
    17: '11', 18: '#11',
    21: '13', 20: 'b13',
  };

  // ============ realization ============

  // Get the pitch-class set for a chord type at a root pc.
  function chordPcs(rootPc, typeKey, options = {}) {
    const t = CHORD_TYPES[typeKey];
    if (!t) return null;
    const pcs = [rootPc % 12];
    pcs.push(mod12(rootPc + t.thirdInterval));
    if (t.fifthInterval != null && !options.omitFifth) {
      pcs.push(mod12(rootPc + t.fifthInterval));
    }
    if (t.seventhInterval != null) {
      pcs.push(mod12(rootPc + t.seventhInterval));
    }
    return pcs;
  }

  // MIDI notes for the "canonical" voicing (root position close).
  function chordMidi(rootPc, typeKey, rootOctave = 4) {
    const t = CHORD_TYPES[typeKey];
    if (!t) return null;
    const rootMidi = 12 * (rootOctave + 1) + mod12(rootPc);
    const intervals = [0, t.thirdInterval];
    if (t.fifthInterval != null) intervals.push(t.fifthInterval);
    if (t.seventhInterval != null) intervals.push(t.seventhInterval);
    return intervals.map(i => rootMidi + i);
  }

  // The 3+7 skeleton (PianoPig's foundation). Right hand only, 2 notes.
  function skeletonMidi37(rootPc, typeKey, octave = 4) {
    const t = CHORD_TYPES[typeKey];
    if (!t || t.seventhInterval == null) return null;
    const rootMidi = 12 * (octave + 1) + mod12(rootPc);
    return [rootMidi + t.thirdInterval, rootMidi + t.seventhInterval];
  }

  // The 7+3 inversion of the skeleton (PianoPig's second voicing).
  function skeletonMidi73(rootPc, typeKey, octave = 4) {
    const pair = skeletonMidi37(rootPc, typeKey, octave);
    if (!pair) return null;
    // Move the 3rd up an octave so the 7th sits below it.
    return [pair[1], pair[0] + 12];
  }

  // ============ structured detection ============

  /**
   * Detect what the user is playing.
   * Input: Set of MIDI note numbers.
   * Output: structured object describing the chord, or null.
   *
   * {
   *   root: pitch-class (0-11),
   *   type: 'maj7' | '7' | 'm7' | 'm7b5' | 'dim7' | 'maj' | 'm' | 'dim',
   *   bass: pitch-class or null,           // null when bass == root
   *   extensions: ['9', 'b9', '#11', ...], // empty when none
   *   foreign: [pc, pc, ...],              // empty when none
   *   confidence: 'high' | 'partial' | 'ambiguous',
   *   chordTones: [pc, pc, pc, (pc)],      // the recognized skeleton
   * }
   */
  function detectChord(midiNotes) {
    if (!midiNotes || midiNotes.size < 2) return null;
    const sortedMidi = [...midiNotes].sort((a, b) => a - b);
    const playedPcs = new Set(sortedMidi.map(m => mod12(m)));
    const bassPc = mod12(sortedMidi[0]);

    // 2 notes: only the 3+7 skeleton can be recognized — try each pc as root
    // and see if another pc forms a valid 3 / b3 / 7 / b7 interval.
    if (playedPcs.size === 2) {
      return detectFromSkeleton2(playedPcs, bassPc);
    }

    // 3+ notes: try each pitch class as a candidate root.
    const candidates = [];
    for (const rootPc of playedPcs) {
      for (const typeKey of TYPE_PRIORITY) {
        const t = CHORD_TYPES[typeKey];
        const hit = tryRecognize(playedPcs, rootPc, typeKey, t, bassPc);
        if (hit) candidates.push(hit);
      }
    }
    if (candidates.length === 0) return null;

    // Ranking priority:
    //   1. Fewer foreign notes (strongest signal)
    //   2. More chord tones present (a full Cmaj7 beats a Gmaj7-without-5th)
    //   3. More-specific type (7th chord wins over triad — TYPE_PRIORITY)
    //   4. Fewer extensions (economical reading wins)
    //   5. Bass is root (tiebreaker)
    candidates.sort((a, b) => {
      if (a.foreign.length !== b.foreign.length) return a.foreign.length - b.foreign.length;
      if (a.chordTones.length !== b.chordTones.length) return b.chordTones.length - a.chordTones.length;
      if (a.typePriority !== b.typePriority) return a.typePriority - b.typePriority;
      if (a.extensions.length !== b.extensions.length) return a.extensions.length - b.extensions.length;
      if (a.bassIsRoot !== b.bassIsRoot) return a.bassIsRoot ? -1 : 1;
      return 0;
    });
    const best = candidates[0];
    return finalize(best, bassPc);
  }

  function tryRecognize(playedPcs, rootPc, typeKey, t, bassPc) {
    const needThird = mod12(rootPc + t.thirdInterval);
    const needSeventh = t.seventhInterval != null ? mod12(rootPc + t.seventhInterval) : null;
    const needFifth = t.fifthInterval != null ? mod12(rootPc + t.fifthInterval) : null;

    // For diminished 7, require all 4 chord tones — too easily confused otherwise.
    if (t.requireAll) {
      if (!playedPcs.has(rootPc)) return null;
      if (!playedPcs.has(needThird)) return null;
      if (!playedPcs.has(needFifth)) return null;
      if (!playedPcs.has(needSeventh)) return null;
    } else {
      // Need root + 3rd at minimum (5th and 7th can be voiced-out for 7th chords;
      // root can be omitted for true rootless voicings but we don't try those yet).
      if (!playedPcs.has(rootPc)) return null;
      if (!playedPcs.has(needThird)) return null;
      if (t.seventhInterval != null) {
        // 7th chord type: need the 7th explicitly.
        if (!playedPcs.has(needSeventh)) return null;
      } else {
        // Triad type: require the 5th to be present. Without it, we don't have
        // enough information to call it a triad (it's just a 3rd interval).
        // This prevents e.g. C+Eb+G from being mis-read as Eb (E♭+G alone).
        if (needFifth != null && !playedPcs.has(needFifth)) return null;
      }
    }

    // Build chord-tone set (root, 3rd, 5th if present, 7th if present)
    const chordTones = new Set([rootPc, needThird]);
    if (needFifth != null && playedPcs.has(needFifth)) chordTones.add(needFifth);
    if (needSeventh != null) chordTones.add(needSeventh);

    // Classify remaining notes as extensions or foreign.
    const extensions = [];
    const foreign = [];
    const scaleSet = new Set(t.scaleIntervals.map(i => mod12(rootPc + i)));

    for (const pc of playedPcs) {
      if (chordTones.has(pc)) continue;
      // Find interval above root
      const interval = ((pc - rootPc) % 12 + 12) % 12;
      // Map to extension if a known extension label
      // (Try both compact-octave and octave-up positions)
      const extLabel = EXTENSION_LABELS[interval] || EXTENSION_LABELS[interval + 12];
      if (extLabel && scaleSet.has(pc)) {
        extensions.push(extLabel);
      } else if (extLabel && (extLabel.startsWith('b') || extLabel.startsWith('#'))) {
        // Altered extension — allowed on dominant chords, plus #11 on maj7/m7
        // (Lydian/Dorian color tones are idiomatic jazz).
        if (typeKey === '7' || (extLabel === '#11' && (typeKey === 'maj7' || typeKey === 'm7'))) {
          extensions.push(extLabel);
        } else {
          foreign.push(pc);
        }
      } else if (scaleSet.has(pc)) {
        // In-scale but not a labeled extension (e.g. 4th on a major chord — uncommon
        // but legal as a passing tone). Treat as extension with raw degree label.
        const deg = degreeFromInterval(interval);
        extensions.push(deg);
      } else {
        foreign.push(pc);
      }
    }

    return {
      rootPc,
      typeKey,
      typePriority: TYPE_PRIORITY.indexOf(typeKey),
      chordTones: [...chordTones],
      extensions,
      foreign,
      bassIsRoot: bassPc === rootPc,
    };
  }

  function degreeFromInterval(semitones) {
    const map = { 0:'R', 1:'b2', 2:'2', 3:'b3', 4:'3', 5:'4', 6:'b5', 7:'5', 8:'b6', 9:'6', 10:'b7', 11:'7' };
    return map[semitones] || `${semitones}st`;
  }

  function detectFromSkeleton2(playedPcs, bassPc) {
    // Two notes: a rootless 3+7 voicing. Root is NOT one of the played notes.
    // Convention: in jazz comping, the LOWER note is typically the 3rd of the chord
    // (with the 7th above it). So bias toward interpretations where the lower
    // played note IS the chord's 3rd.
    const candidates = [];
    for (let rootPc = 0; rootPc < 12; rootPc++) {
      for (const typeKey of TYPE_PRIORITY) {
        const t = CHORD_TYPES[typeKey];
        if (t.seventhInterval == null) continue;
        const thirdPc = mod12(rootPc + t.thirdInterval);
        const seventhPc = mod12(rootPc + t.seventhInterval);
        if (playedPcs.has(thirdPc) && playedPcs.has(seventhPc) && !playedPcs.has(rootPc)) {
          // bassPc IS the lower of the two played notes. If bassPc == thirdPc,
          // this is the standard 3-below-7 jazz comping shape. Prefer that.
          const lowerIsThird = bassPc === thirdPc;
          candidates.push({
            rootPc,
            typeKey,
            typePriority: TYPE_PRIORITY.indexOf(typeKey),
            chordTones: [rootPc, thirdPc, seventhPc],
            extensions: [],
            foreign: [],
            bassIsRoot: false,
            isSkeleton: true,
            lowerIsThird,
          });
        }
      }
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => {
      if (a.lowerIsThird !== b.lowerIsThird) return a.lowerIsThird ? -1 : 1;
      return a.typePriority - b.typePriority;
    });
    const best = candidates[0];
    const finalized = finalize(best, bassPc);
    finalized.isSkeleton = true;
    finalized.confidence = 'partial';
    return finalized;
  }

  function finalize(best, bassPc) {
    const bass = bassPc === best.rootPc ? null : (best.chordTones.includes(bassPc) ? null : bassPc);
    // Inversion (bass is a chord tone but not the root) — we don't display /bass for now.
    // Only display /bass when bass is OUT of the chord (a true slash chord).
    let confidence = 'high';
    if (best.foreign.length > 0) confidence = 'partial';
    if (best.foreign.length > 1) confidence = 'ambiguous';

    return {
      root: best.rootPc,
      type: best.typeKey,
      bass,
      extensions: best.extensions,
      foreign: best.foreign,
      confidence,
      chordTones: best.chordTones,
      isSkeleton: false,
    };
  }

  // ============ chord-name rendering ============

  /**
   * Render a detected chord as a display string.
   * Examples:
   *   { root: 0, type: 'maj7' } -> "Cmaj7"
   *   { root: 0, type: 'maj7', extensions: ['9'] } -> "Cmaj9"
   *   { root: 0, type: '7', extensions: ['b9'] } -> "C7b9"
   *   { root: 0, type: 'maj7', bass: 4 } -> "Cmaj7/E"
   *   { root: 0, type: 'maj' } -> "C"
   */
  function chordName(detected) {
    if (!detected) return '—';
    const { root, type, bass, extensions } = detected;
    const flat = preferFlat(root);
    const rootName = pcName(root, flat);
    const t = CHORD_TYPES[type];
    let label = t.label;

    // Extension: if there's a 9 and the type is maj7/7/m7, often we'd write "maj9"
    // instead of "maj7add9". Apply common conventions:
    const has9 = extensions.includes('9');
    const has11 = extensions.includes('11');
    const has13 = extensions.includes('13');
    let extSuffix = '';
    if (type === 'maj7' && has9) label = 'maj9';
    else if (type === '7' && has9) label = '9';
    else if (type === 'm7' && has9) label = 'm9';

    // Other extensions/alterations
    const others = extensions.filter(e => e !== '9');
    if (others.length) extSuffix = '(' + others.join(',') + ')';

    let bassStr = '';
    if (bass != null) bassStr = '/' + pcName(bass, preferFlat(bass));

    return rootName + label + extSuffix + bassStr;
  }

  // Pretty Roman numeral form ("IIm⁷", "V⁷", etc.)
  function romanFromType(typeKey, degree) {
    // degree is a string like 'I', 'ii', 'V', 'vii'
    const upperTypes = ['maj7', '7', 'maj'];
    const lowerTypes = ['m7', 'm7b5', 'dim7', 'm', 'dim'];
    const upper = upperTypes.includes(typeKey);
    const base = upper ? degree.toUpperCase() : degree.toLowerCase();
    const labels = {
      'maj7':'maj7','7':'7','m7':'m7','m7b5':'ø','dim7':'°7','maj':'','m':'m','dim':'°'
    };
    return base + (labels[typeKey] || '');
  }

  // ============ key/progression realization ============

  // Map a Roman degree (e.g. "ii", "V7", "IImaj7") to a structured chord type.
  // Returns { interval, type } — interval is semitones above tonic.
  function parseRomanDegree(s) {
    // Strip suffix into a quality. Order alternatives longest-first so
    // multi-char numerals (IV, VI, VII) match before their single-char prefixes (I, V).
    const m = s.match(/^(b|♭|#|♯)?(VII|vii|VI|vi|IV|iv|III|iii|II|ii|V|v|I|i)([a-zA-Z0-9♭♯ø°()]*)/);
    if (!m) return null;
    const accidental = m[1] || '';
    const numeral = m[2];
    const suffix = (m[3] || '').replace('♭','b').replace('♯','#');

    const upper = numeral === numeral.toUpperCase();
    const degreeMap = {
      'I': 0, 'II': 2, 'III': 4, 'IV': 5, 'V': 7, 'VI': 9, 'VII': 11,
    };
    let interval = degreeMap[numeral.toUpperCase()];
    if (interval == null) return null;
    if (accidental === 'b' || accidental === '♭') interval = (interval - 1 + 12) % 12;
    if (accidental === '#' || accidental === '♯') interval = (interval + 1) % 12;

    // Determine type from suffix + case
    let type = upper ? 'maj' : 'm';
    if (suffix === 'maj7' || suffix === 'Δ' || suffix === 'M7') type = 'maj7';
    else if (suffix === '7') type = upper ? '7' : 'm7';
    else if (suffix === 'm7') type = 'm7';
    else if (suffix === 'm' || suffix === 'min') type = 'm';
    else if (suffix === 'ø' || suffix === 'm7b5') type = 'm7b5';
    else if (suffix === '°' || suffix === 'dim') type = 'dim';
    else if (suffix === '°7' || suffix === 'dim7') type = 'dim7';
    else if (suffix === '' && !upper) type = 'm';
    else if (suffix === '' && upper) type = 'maj';

    return { interval, type, original: s };
  }

  // Realize a progression in a key. Returns array of { rootPc, type, romanLabel }.
  function realizeProgression(romanArr, tonicPc) {
    return romanArr.map(roman => {
      const parsed = parseRomanDegree(roman);
      if (!parsed) return null;
      return {
        rootPc: mod12(tonicPc + parsed.interval),
        type: parsed.type,
        romanLabel: roman,
      };
    }).filter(Boolean);
  }

  // ============ public API ============

  return {
    SHARP_NAMES, FLAT_NAMES, NAME_TO_PC,
    CHORD_TYPES, TYPE_PRIORITY,
    CYCLE_FOURTHS, CYCLE_FIFTHS,
    mod12, pcName, noteLabel, isBlackKey, preferFlat,
    chordPcs, chordMidi, skeletonMidi37, skeletonMidi73,
    detectChord, chordName, romanFromType,
    parseRomanDegree, realizeProgression,
  };
})();

if (typeof window !== 'undefined') window.Theory = Theory;
if (typeof module !== 'undefined') module.exports = Theory;
