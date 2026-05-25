// staff.js — simplified SVG sheet-music renderer.
// Two staves (treble + bass) joined as a grand staff. Whole notes only.
// Notes are positioned by diatonic position relative to middle C.
// Accidentals (♯, ♭) drawn inline next to the note.
// State highlighting mirrors the keyboard: playing (blue), correct (amber), wrong (red).
//
// MIDI 60 = middle C. We use SHARP spelling by default; flat keys can pass preferFlat=true.

const Staff = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Diatonic step from C0 — used to position notes vertically on the staff.
  // C=0, D=1, E=2, F=3, G=4, A=5, B=6 (and continuing up: C=7, ...).
  // PC mapping with preferred spelling:
  //   sharp: C(0)=C, C#(1)=C#, D(2)=D, D#(3)=D#, E(4)=E, F(5)=F, F#(6)=F#, G(7)=G, G#(8)=G#, A(9)=A, A#(10)=A#, B(11)=B
  //   flat:  C(0)=C, Db(1)=Db, D(2)=D, Eb(3)=Eb, E(4)=E, F(5)=F, Gb(6)=Gb, G(7)=G, Ab(8)=Ab, A(9)=A, Bb(10)=Bb, B(11)=B
  // Each "diatonic step" is one staff line/space.
  const PC_TO_STEP_SHARP = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]; // C C D D E F F G G A A B
  const PC_TO_STEP_FLAT  = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6]; // C D D E E F G G A A B B
  const PC_TO_ACCIDENTAL_SHARP = [null, '♯', null, '♯', null, null, '♯', null, '♯', null, '♯', null];
  const PC_TO_ACCIDENTAL_FLAT  = [null, '♭', null, '♭', null, null, '♭', null, '♭', null, '♭', null];

  // Get diatonic absolute step from MIDI number, with chosen spelling.
  function midiToStep(midi, preferFlat = false) {
    const octave = Math.floor(midi / 12) - 1; // C0 = midi 12 → octave 0
    const pc = ((midi % 12) + 12) % 12;
    const stepInOctave = preferFlat ? PC_TO_STEP_FLAT[pc] : PC_TO_STEP_SHARP[pc];
    return octave * 7 + stepInOctave;
  }
  function midiAccidental(midi, preferFlat = false) {
    const pc = ((midi % 12) + 12) % 12;
    return preferFlat ? PC_TO_ACCIDENTAL_FLAT[pc] : PC_TO_ACCIDENTAL_SHARP[pc];
  }

  /**
   * Render a grand staff inside the given container.
   * Returns an instance with .setNotes(midiArr, state) to update displayed notes.
   */
  function create({ container, preferFlat = false }) {
    const wrapper = typeof container === 'string' ? document.querySelector(container) : container;
    if (!wrapper) return null;
    wrapper.innerHTML = '';

    const VB_W = 600;
    const VB_H = 240;
    const LINE_GAP = 8;   // pixels between adjacent staff lines
    // Treble clef: top line F5 (step E5 = 4 octaves+2 = 30; F5=31). We'll compute.
    // Layout: treble center at y=60, bass center at y=180.
    const TREBLE_CENTER_Y = 60;  // Y of middle line of treble (B4)
    const BASS_CENTER_Y = 180;   // Y of middle line of bass (D3)
    // Step zero of treble (E4 = lowest line of treble) at y = TREBLE_CENTER_Y + 2*LINE_GAP
    // Treble: E4(step 2*7+2=16) at 76; F4=17 at 72; G4=18 at 68; A4=19 at 64; B4=20 at 60; C5=21 at 56; D5=22 at 52; E5=23 at 48; F5=24 at 44
    // Bass:   G2(step 2*7+4=18) at 196; A2=19 at 192; B2=20 at 188; C3=21 at 184; D3=22 at 180; E3=23 at 176; F3=24 at 172; G3=25 at 168; A3=26 at 164
    // Each step = LINE_GAP/2 vertically (line + space).
    const TREBLE_REF_STEP = 34;  // B4 (treble middle line) = 4*7 + 6
    const BASS_REF_STEP   = 22;  // D3 (bass middle line) = 3*7 + 1

    function yForStep(step, clef) {
      const refStep = clef === 'treble' ? TREBLE_REF_STEP : BASS_REF_STEP;
      const refY = clef === 'treble' ? TREBLE_CENTER_Y : BASS_CENTER_Y;
      return refY - (step - refStep) * (LINE_GAP / 2);
    }
    function chooseClef(midi) {
      return midi >= 60 ? 'treble' : 'bass';
    }

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${VB_W} ${VB_H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.classList.add('staff-svg');
    wrapper.appendChild(svg);

    // Draw staff lines
    function drawStaffLines() {
      // Treble: 5 lines centered on TREBLE_CENTER_Y
      for (let i = -2; i <= 2; i++) {
        const y = TREBLE_CENTER_Y + i * LINE_GAP;
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', 50);
        line.setAttribute('x2', VB_W - 20);
        line.setAttribute('y1', y);
        line.setAttribute('y2', y);
        line.setAttribute('class', 'staff-line');
        svg.appendChild(line);
      }
      // Bass
      for (let i = -2; i <= 2; i++) {
        const y = BASS_CENTER_Y + i * LINE_GAP;
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', 50);
        line.setAttribute('x2', VB_W - 20);
        line.setAttribute('y1', y);
        line.setAttribute('y2', y);
        line.setAttribute('class', 'staff-line');
        svg.appendChild(line);
      }
      // Left brace (vertical line connecting both staves)
      const brace = document.createElementNS(SVG_NS, 'line');
      brace.setAttribute('x1', 50);
      brace.setAttribute('x2', 50);
      brace.setAttribute('y1', TREBLE_CENTER_Y - 2 * LINE_GAP);
      brace.setAttribute('y2', BASS_CENTER_Y + 2 * LINE_GAP);
      brace.setAttribute('class', 'staff-brace');
      svg.appendChild(brace);
      // Clef labels (text-based, since real clef glyphs would need a music font)
      const trebleClef = document.createElementNS(SVG_NS, 'text');
      trebleClef.setAttribute('x', 25);
      trebleClef.setAttribute('y', TREBLE_CENTER_Y + 6);
      trebleClef.setAttribute('class', 'clef-label');
      trebleClef.textContent = '𝄞';
      svg.appendChild(trebleClef);
      const bassClef = document.createElementNS(SVG_NS, 'text');
      bassClef.setAttribute('x', 25);
      bassClef.setAttribute('y', BASS_CENTER_Y + 4);
      bassClef.setAttribute('class', 'clef-label');
      bassClef.textContent = '𝄢';
      svg.appendChild(bassClef);
    }
    drawStaffLines();

    // Note layer (cleared on each setNotes call)
    const noteLayer = document.createElementNS(SVG_NS, 'g');
    noteLayer.setAttribute('class', 'note-layer');
    svg.appendChild(noteLayer);

    function clearNotes() { noteLayer.innerHTML = ''; }

    /**
     * Render a set of notes. `notes` is an array of MIDI numbers.
     * `stateMap` is optional Map<midi, stateClass> e.g. { 60: 'playing', 64: 'correct' }.
     */
    function setNotes(notes, stateMap = new Map()) {
      clearNotes();
      if (!notes || notes.length === 0) return;

      // Group by clef, sort, and lay out horizontally.
      // For simplicity: single column at x=200; we don't draw multiple beats.
      const sorted = [...notes].sort((a, b) => a - b);
      const baseX = VB_W / 2;

      for (const midi of sorted) {
        const clef = chooseClef(midi);
        const step = midiToStep(midi, preferFlat);
        const y = yForStep(step, clef);
        const acc = midiAccidental(midi, preferFlat);
        const state = stateMap.get(midi);

        // Whole note (hollow ellipse)
        const note = document.createElementNS(SVG_NS, 'ellipse');
        note.setAttribute('cx', baseX);
        note.setAttribute('cy', y);
        note.setAttribute('rx', 5.5);
        note.setAttribute('ry', 4);
        note.setAttribute('class', 'staff-note' + (state ? ' ' + state : ''));
        noteLayer.appendChild(note);

        // Ledger lines (notes outside the staff)
        addLedgerLines(noteLayer, clef, step, baseX);

        // Accidental
        if (acc) {
          const t = document.createElementNS(SVG_NS, 'text');
          t.setAttribute('x', baseX - 14);
          t.setAttribute('y', y + 3);
          t.setAttribute('class', 'staff-accidental' + (state ? ' ' + state : ''));
          t.textContent = acc;
          noteLayer.appendChild(t);
        }
      }
    }

    function addLedgerLines(layer, clef, step, x) {
      // Treble staff occupies steps 16..24 (E4..F5). Below 16 → ledger lines below.
      // Above 24 → ledger lines above.
      // Bass staff occupies steps 18..26 (G2..A3). Wait — recompute:
      //   Bass middle line = D3 = step (3-1)*7+ (D=1) = wait. C3 step:
      //   Actually using octave * 7 + stepInOctave: C3 is octave 3, step 0, so 21. D3=22. So bass middle = 22.
      //   Bass occupies 20 (G2)..24 (F3)? Let me just bound by clef center +/- 2 lines * 2 steps.
      const refStep = clef === 'treble' ? TREBLE_REF_STEP : BASS_REF_STEP;
      const topStep = refStep + 4;    // top line of the staff
      const botStep = refStep - 4;    // bottom line
      // For middle-C (between staves), ledger line at step 21 (C4 for treble) or step 21 (C4 for bass)
      // Wait — C4 = octave 4, step 0 = 28. Hmm, my numbering is off. Let me re-derive.
      // octave * 7 + stepInOctave; C4 = 4*7 + 0 = 28. B4 = 4*7 + 6 = 34. So TREBLE_REF_STEP should be 34. Let me fix this.
      // [Actually the constants up top are wrong — fix below.]
      // For now, ledger handling: above-staff notes get ledger lines from topStep upward
      const stepFromTop = step - topStep;
      const stepFromBot = botStep - step;
      const refY = clef === 'treble' ? TREBLE_CENTER_Y : BASS_CENTER_Y;

      if (stepFromTop >= 2) {
        for (let s = topStep + 2; s <= step; s += 2) {
          const y = refY - (s - refStep) * (LINE_GAP / 2);
          const line = document.createElementNS(SVG_NS, 'line');
          line.setAttribute('x1', x - 9);
          line.setAttribute('x2', x + 9);
          line.setAttribute('y1', y);
          line.setAttribute('y2', y);
          line.setAttribute('class', 'staff-ledger');
          layer.appendChild(line);
        }
      }
      if (stepFromBot >= 2) {
        for (let s = botStep - 2; s >= step; s -= 2) {
          const y = refY - (s - refStep) * (LINE_GAP / 2);
          const line = document.createElementNS(SVG_NS, 'line');
          line.setAttribute('x1', x - 9);
          line.setAttribute('x2', x + 9);
          line.setAttribute('y1', y);
          line.setAttribute('y2', y);
          line.setAttribute('class', 'staff-ledger');
          layer.appendChild(line);
        }
      }
    }

    return { setNotes, clearNotes };
  }

  return { create, midiToStep, midiAccidental };
})();

if (typeof window !== 'undefined') window.Staff = Staff;
