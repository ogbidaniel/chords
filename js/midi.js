// midi.js — passive Web MIDI listener.
// Bitwise status parsing. Note On 0x90, Note Off 0x80, CC 0xB0 (CC#64 = sustain).
// sysex:false, no exclusive access — coexists with DAWs.

const MIDI = (() => {
  const NOTE_ON = 0x90, NOTE_OFF = 0x80, CC = 0xB0, CC_SUSTAIN = 64;
  const heldNotes = new Set();
  const sustainedNotes = new Set();
  let sustainOn = false;
  const listeners = { change: new Set(), status: new Set(), note: new Set() };

  function emitChange() {
    const sounding = new Set([...heldNotes, ...sustainedNotes]);
    listeners.change.forEach(fn => fn(sounding, sustainOn));
  }
  function emitStatus(text, kind) { listeners.status.forEach(fn => fn(text, kind)); }
  function emitNote(midi, vel, on)  { listeners.note.forEach(fn => fn(midi, vel, on)); }
  function on(event, fn) { listeners[event]?.add(fn); }

  function handleMessage(e) {
    const d = e.data;
    if (!d || d.length < 1) return;
    const type = d[0] & 0xF0;
    const d1 = d[1] ?? 0;
    const d2 = d[2] ?? 0;
    if (type === NOTE_ON) {
      if (d2 === 0) { handleNoteOff(d1); return; }
      heldNotes.add(d1);
      sustainedNotes.delete(d1);
      emitNote(d1, d2, true);
      emitChange();
    } else if (type === NOTE_OFF) {
      handleNoteOff(d1);
    } else if (type === CC && d1 === CC_SUSTAIN) {
      const down = d2 >= 64;
      if (down !== sustainOn) {
        sustainOn = down;
        if (!sustainOn) sustainedNotes.clear();
        emitChange();
      }
    }
  }
  function handleNoteOff(note) {
    if (heldNotes.delete(note)) {
      if (sustainOn) sustainedNotes.add(note);
      emitNote(note, 0, false);
      emitChange();
    }
  }

  async function init() {
    if (!navigator.requestMIDIAccess) {
      emitStatus('Web MIDI unsupported', 'error');
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      bindInputs(access);
      access.onstatechange = () => bindInputs(access);
    } catch (err) {
      emitStatus('MIDI access denied', 'error');
    }
  }
  function bindInputs(access) {
    const inputs = [...access.inputs.values()];
    if (inputs.length === 0) { emitStatus('No MIDI device', 'idle'); return; }
    inputs.forEach(input => { input.onmidimessage = handleMessage; });
    emitStatus(inputs[0].name || 'MIDI device', 'live');
  }

  function virtualNoteOn(midi, velocity = 100) {
    heldNotes.add(midi);
    sustainedNotes.delete(midi);
    emitNote(midi, velocity, true);
    emitChange();
  }
  function virtualNoteOff(midi) { handleNoteOff(midi); }
  function getSounding() { return new Set([...heldNotes, ...sustainedNotes]); }

  return { init, on, virtualNoteOn, virtualNoteOff, getSounding };
})();

if (typeof window !== 'undefined') window.MIDI = MIDI;
