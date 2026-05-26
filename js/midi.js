// midi.js — passive Web MIDI listener.
// Sysex disabled. Tracks held notes with velocity. Sustain pedal supported.

const MIDI = (() => {
  const listeners = {
    change: new Set(),  // (heldMap, lastVelocity) => void
    status: new Set(),  // (text, kind) => void
    noteOn: new Set(),  // (midi, velocity) => void
    noteOff: new Set(), // (midi) => void
  };

  const heldNotes = new Map();      // midi → velocity (0-127)
  const sustainedNotes = new Map(); // midi → velocity (still sounding after release while sustain on)
  let sustainOn = false;
  let lastVelocity = 0;

  function emit(name, ...args) {
    listeners[name].forEach(fn => { try { fn(...args); } catch (e) { console.error(e); } });
  }

  // Build a Map of currently-sounding notes (held ∪ sustained)
  function getSounding() {
    const out = new Map(heldNotes);
    for (const [k, v] of sustainedNotes) out.set(k, v);
    return out;
  }

  function onMessage(e) {
    const [status, data1, data2] = e.data;
    const cmd = status & 0xf0;
    if (cmd === 0x90 && data2 > 0) {
      heldNotes.set(data1, data2);
      sustainedNotes.delete(data1);
      lastVelocity = data2;
      emit('noteOn', data1, data2);
      emit('change', getSounding(), data2);
    } else if (cmd === 0x80 || (cmd === 0x90 && data2 === 0)) {
      if (heldNotes.has(data1)) {
        const v = heldNotes.get(data1);
        heldNotes.delete(data1);
        if (sustainOn) {
          sustainedNotes.set(data1, v);
        } else {
          emit('noteOff', data1);
        }
        emit('change', getSounding(), 0);
      }
    } else if (cmd === 0xb0 && data1 === 64) {
      sustainOn = data2 >= 64;
      if (!sustainOn) {
        for (const [k] of sustainedNotes) emit('noteOff', k);
        sustainedNotes.clear();
        emit('change', getSounding(), 0);
      }
    }
  }

  async function init() {
    if (!navigator.requestMIDIAccess) {
      emit('status', 'No MIDI in this browser', 'error');
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      attach(access);
      access.onstatechange = () => attach(access);
    } catch (e) {
      emit('status', 'MIDI permission denied', 'error');
    }
  }

  function attach(access) {
    let count = 0;
    for (const input of access.inputs.values()) {
      input.onmidimessage = onMessage;
      count++;
    }
    if (count > 0) emit('status', count === 1 ? 'MIDI ready' : `${count} MIDI inputs`, 'live');
    else emit('status', 'No MIDI device — tap keys', 'idle');
  }

  // Allow virtual keyboard taps to feed MIDI events
  function virtualNoteOn(midi, velocity = 100) {
    onMessage({ data: [0x90, midi, velocity] });
  }
  function virtualNoteOff(midi) {
    onMessage({ data: [0x80, midi, 0] });
  }

  return {
    init,
    on: (event, fn) => listeners[event].add(fn),
    off: (event, fn) => listeners[event].delete(fn),
    getSounding,
    getLastVelocity: () => lastVelocity,
    isSustainOn: () => sustainOn,
    virtualNoteOn, virtualNoteOff,
  };
})();

if (typeof window !== 'undefined') window.MIDI = MIDI;
