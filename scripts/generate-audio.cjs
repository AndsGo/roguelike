/**
 * Generate procedural WAV audio files for all BGM and SFX.
 * Run: node scripts/generate-audio.js
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050;
const BGM_SAMPLE_RATE = 44100;
const outDir = path.join(__dirname, '..', 'public', 'audio');

// Ensure output directory exists
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

/** Write a WAV file from Float32 mono samples (-1..1) */
function writeWav(filePath, samples, sampleRate = SAMPLE_RATE) {
  const numSamples = samples.length;
  const bitsPerSample = 16;
  const byteRate = sampleRate * 2; // 16-bit mono
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);       // chunk size
  buffer.writeUInt16LE(1, 20);        // PCM
  buffer.writeUInt16LE(1, 22);        // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(2, 32);        // block align
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 32768 : s * 32767;
    buffer.writeInt16LE(Math.round(val), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

/** Generate a sine wave */
function sine(freq, t) {
  return Math.sin(2 * Math.PI * freq * t);
}

/** Generate a square wave */
function square(freq, t) {
  return sine(freq, t) > 0 ? 0.5 : -0.5;
}

/** Generate noise */
function noise() {
  return Math.random() * 2 - 1;
}

/** Apply exponential decay envelope */
function envelope(t, attack, decay, sustain, release, duration) {
  if (t < attack) return t / attack;
  if (t < attack + decay) return 1 - (1 - sustain) * ((t - attack) / decay);
  if (t < duration - release) return sustain;
  return sustain * (1 - (t - (duration - release)) / release);
}

/** Simple low-pass filter on samples */
function lowpass(samples, alpha) {
  const out = new Float32Array(samples.length);
  out[0] = samples[0];
  for (let i = 1; i < samples.length; i++) {
    out[i] = out[i - 1] + alpha * (samples[i] - out[i - 1]);
  }
  return out;
}

// ==================== SFX Generators ====================

function generateSfxHit() {
  const dur = 0.15;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 30);
    samples[i] = (noise() * 0.6 + sine(200 - t * 800, t) * 0.5) * env * 0.7;
  }
  return samples;
}

function generateSfxKill() {
  const dur = 0.4;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 6);
    const freq = 600 - t * 1000;
    samples[i] = (sine(freq, t) * 0.4 + noise() * 0.3) * env * 0.6;
  }
  return samples;
}

function generateSfxHeal() {
  const dur = 0.5;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = envelope(t, 0.05, 0.1, 0.6, 0.2, dur);
    const freq = 800 + Math.sin(t * 6) * 100;
    samples[i] = (sine(freq, t) * 0.3 + sine(freq * 1.5, t) * 0.15) * env * 0.5;
  }
  return samples;
}

function generateSfxSkill() {
  const dur = 0.35;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = envelope(t, 0.02, 0.08, 0.5, 0.15, dur);
    const sweep = 400 + t * 1200;
    samples[i] = (sine(sweep, t) * 0.4 + square(sweep * 0.5, t) * 0.15 + noise() * 0.1) * env * 0.55;
  }
  return samples;
}

function generateSfxReaction() {
  const dur = 0.5;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = envelope(t, 0.01, 0.15, 0.4, 0.25, dur);
    const freq = 500 + Math.sin(t * 20) * 300;
    samples[i] = (sine(freq, t) * 0.35 + sine(freq * 2, t) * 0.15 + noise() * 0.15) * env * 0.5;
  }
  return samples;
}

function generateSfxClick() {
  const dur = 0.06;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 60);
    samples[i] = (sine(1200, t) * 0.4 + noise() * 0.2) * env * 0.6;
  }
  return samples;
}

function generateSfxBuy() {
  const dur = 0.3;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = envelope(t, 0.01, 0.05, 0.5, 0.15, dur);
    // Coin-like sound: two short high tones
    const ping = sine(1500, t) * 0.3 + sine(2000, t) * 0.2;
    samples[i] = ping * env * 0.5;
  }
  return samples;
}

function generateSfxEquip() {
  const dur = 0.25;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 12);
    // Metallic click
    samples[i] = (sine(800, t) * 0.3 + noise() * 0.25 + sine(1600, t) * 0.15) * env * 0.5;
  }
  return lowpass(samples, 0.3);
}

function generateSfxLevelup() {
  const dur = 0.7;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = envelope(t, 0.02, 0.1, 0.6, 0.3, dur);
    // Rising arpeggio
    const noteIdx = Math.floor(t * 8);
    const notes = [523, 659, 784, 1047, 1047, 784, 659, 523]; // C5 E5 G5 C6
    const freq = notes[Math.min(noteIdx, notes.length - 1)];
    samples[i] = (sine(freq, t) * 0.35 + sine(freq * 2, t) * 0.1) * env * 0.5;
  }
  return samples;
}

// ==================== BGM Generators ====================
// BGMs are 16-20 second seamless loops at 44100Hz for better quality

/** Helper: play a sequence of timed notes into a sample buffer */
function renderNotes(samples, notes, sr, style) {
  for (const [start, end, freq] of notes) {
    const iStart = Math.floor(start * sr);
    const iEnd = Math.min(Math.floor(end * sr), samples.length);
    const noteDur = end - start;
    for (let i = iStart; i < iEnd; i++) {
      const t = i / sr;
      const nt = t - start;
      const env = envelope(nt, 0.02, 0.08, 0.6, 0.15, noteDur);
      if (style === 'pad') {
        samples[i] += (sine(freq, t) * 0.2 + sine(freq * 2.01, t) * 0.08 + sine(freq * 0.5, t) * 0.12) * env;
      } else if (style === 'pluck') {
        const pluckEnv = Math.exp(-nt * 5);
        samples[i] += (sine(freq, t) * 0.25 + sine(freq * 3, t) * 0.04 * Math.exp(-nt * 10)) * pluckEnv * env;
      } else {
        samples[i] += sine(freq, t) * 0.22 * env;
      }
    }
  }
}

/** Helper: add a bass line from a pattern array [{start, dur, freq}] */
function renderBass(samples, pattern, sr) {
  for (const { start, dur, freq } of pattern) {
    const iStart = Math.floor(start * sr);
    const iEnd = Math.min(Math.floor((start + dur) * sr), samples.length);
    for (let i = iStart; i < iEnd; i++) {
      const t = i / sr;
      const nt = t - start;
      const env = Math.exp(-nt * 3) * 0.8;
      samples[i] += (sine(freq, t) * 0.18 + sine(freq * 2, t) * 0.05) * env;
    }
  }
}

/** Helper: generate a rhythmic drum pattern */
function renderDrums(samples, bpm, dur, sr, pattern) {
  const beatLen = 60 / bpm;
  const totalBeats = Math.floor(dur / beatLen);
  for (let b = 0; b < totalBeats; b++) {
    const beatStart = b * beatLen;
    const patIdx = b % pattern.length;
    const hit = pattern[patIdx];
    if (hit === 0) continue;
    const iStart = Math.floor(beatStart * sr);
    const hitDur = hit === 'kick' ? 0.08 : hit === 'snare' ? 0.06 : 0.03;
    const iEnd = Math.min(Math.floor((beatStart + hitDur) * sr), samples.length);
    for (let i = iStart; i < iEnd; i++) {
      const nt = (i - iStart) / sr;
      if (hit === 'kick') {
        const env = Math.exp(-nt * 35);
        samples[i] += (sine(80 - nt * 400, nt) * 0.3 + noise() * 0.08) * env;
      } else if (hit === 'snare') {
        const env = Math.exp(-nt * 30);
        samples[i] += (noise() * 0.2 + sine(250, nt) * 0.08) * env;
      } else if (hit === 'hat') {
        const env = Math.exp(-nt * 50);
        samples[i] += noise() * 0.08 * env;
      }
    }
  }
}

function generateBgmMenu() {
  // Calm, mysterious — Am pentatonic arpeggios with evolving pad layers
  const dur = 16;
  const sr = BGM_SAMPLE_RATE;
  const n = Math.floor(sr * dur);
  const samples = new Float32Array(n);

  // Layer 1: Slow evolving pad (Am chord: A3-C4-E4)
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const mod = Math.sin(t * 0.3) * 0.3 + 0.7;
    const swell = Math.sin(t * Math.PI / dur) * 0.2 + 0.8; // breathe with loop
    samples[i] += (sine(220, t) * 0.12 + sine(261.6, t) * 0.08 + sine(329.6, t) * 0.08) * mod * swell * 0.3;
  }

  // Layer 2: Arpeggio melody (pentatonic Am: A C D E G)
  const arpNotes = [220, 261.6, 293.7, 329.6, 392, 329.6, 293.7, 261.6];
  const arpBpm = 80;
  const arpBeatLen = 60 / arpBpm;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const beatPos = t / arpBeatLen;
    const noteIdx = Math.floor(beatPos) % arpNotes.length;
    const phrase = Math.floor(beatPos / arpNotes.length) % 4;
    // Shift arpeggio up an octave every other phrase
    const octave = (phrase % 2 === 1) ? 2 : 1;
    const freq = arpNotes[noteIdx] * octave;
    const noteT = (beatPos % 1) * arpBeatLen;
    const env = Math.exp(-noteT * 3.5);
    samples[i] += sine(freq, t) * env * 0.12;
  }

  // Layer 3: Low drone with slow LFO
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const lfo = Math.sin(t * 0.2) * 0.5 + 0.5;
    samples[i] += sine(110, t) * 0.06 * lfo;
  }

  // Layer 4: Sparse high bell tones
  const bellTimes = [1.5, 4.0, 6.5, 8.0, 10.5, 13.0, 15.0];
  const bellFreqs = [784, 880, 659, 784, 880, 659, 784];
  for (let b = 0; b < bellTimes.length; b++) {
    const bStart = Math.floor(bellTimes[b] * sr);
    const bEnd = Math.min(bStart + Math.floor(1.5 * sr), n);
    for (let i = bStart; i < bEnd; i++) {
      const nt = (i - bStart) / sr;
      const env = Math.exp(-nt * 3);
      samples[i] += sine(bellFreqs[b], i / sr) * env * 0.06;
    }
  }

  return lowpass(samples, 0.2);
}

function generateBgmMap() {
  // Adventure, wandering — plucked melody with walking bass and light percussion
  const dur = 16;
  const sr = BGM_SAMPLE_RATE;
  const n = Math.floor(sr * dur);
  const samples = new Float32Array(n);
  const bpm = 95;
  const beatLen = 60 / bpm;

  // Melody: two 8-bar phrases (C major adventure theme)
  const melodyA = [
    [0, 0.4, 523], [0.5, 0.9, 587], [1.0, 1.7, 659], [2.0, 2.3, 587],
    [2.5, 3.2, 523], [3.5, 3.8, 494], [4.0, 4.8, 523], // phrase 1
  ];
  const melodyB = [
    [0, 0.4, 659], [0.5, 0.9, 698], [1.0, 1.7, 784], [2.0, 2.3, 698],
    [2.5, 3.2, 659], [3.5, 3.8, 587], [4.0, 4.8, 523], // phrase 2
  ];
  // Scale melodies to beat timing
  const phrase1 = melodyA.map(([s, e, f]) => [s * beatLen, e * beatLen, f]);
  const phrase2 = melodyB.map(([s, e, f]) => [(s + 8) * beatLen, (e + 8) * beatLen, f]);
  const phrase3 = melodyA.map(([s, e, f]) => [(s + 16) * beatLen, (e + 16) * beatLen, f]);
  const phrase4 = melodyB.map(([s, e, f]) => [(s + 24) * beatLen, (e + 24) * beatLen, f * 1.0595]); // slight variation

  renderNotes(samples, [...phrase1, ...phrase2, ...phrase3, ...phrase4], sr, 'pluck');

  // Walking bass
  const bassNotes = [131, 147, 165, 147, 131, 110, 131, 165, // C3 D3 E3 D3 C3 A2 C3 E3
                     165, 175, 196, 175, 165, 147, 131, 165];
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const beatPos = t / beatLen;
    const bassIdx = Math.floor(beatPos) % bassNotes.length;
    const noteT = (beatPos % 1) * beatLen;
    const env = Math.exp(-noteT * 4);
    const freq = bassNotes[bassIdx];
    samples[i] += (sine(freq, t) * 0.15 + sine(freq * 2, t) * 0.04) * env;
  }

  // Light percussion
  const drumPattern = ['kick', 0, 'hat', 0, 'snare', 0, 'hat', 0];
  renderDrums(samples, bpm, dur, sr, drumPattern);

  // Subtle pad harmony
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const section = Math.floor(t / (dur / 4));
    const chords = [[262, 330, 392], [294, 370, 440], [262, 330, 392], [247, 311, 370]];
    const chord = chords[section % chords.length];
    const vol = 0.03;
    samples[i] += (sine(chord[0], t) + sine(chord[1], t) + sine(chord[2], t)) * vol;
  }

  return lowpass(samples, 0.3);
}

function generateBgmBattle() {
  // Intense, driving — fast tempo with heavy bass, aggressive melody, and percussion
  const dur = 16;
  const sr = BGM_SAMPLE_RATE;
  const n = Math.floor(sr * dur);
  const samples = new Float32Array(n);
  const bpm = 145;
  const beatLen = 60 / bpm;

  // Heavy bass line (Em: E2-G2-A2-B2 pattern)
  const bassSeq = [82.4, 82.4, 98, 82.4, 110, 98, 82.4, 73.4,
                   82.4, 82.4, 98, 110, 98, 82.4, 73.4, 82.4];
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const beatPos = t / beatLen;
    const bassIdx = Math.floor(beatPos) % bassSeq.length;
    const noteT = (beatPos % 1) * beatLen;
    const env = Math.exp(-noteT * 5);
    const freq = bassSeq[bassIdx];
    samples[i] += (square(freq, t) * 0.18 + sine(freq, t) * 0.1) * env;
  }

  // Driving percussion
  const drumPattern = ['kick', 'hat', 'snare', 'hat', 'kick', 'kick', 'snare', 'hat'];
  renderDrums(samples, bpm, dur, sr, drumPattern);

  // Melody phrase A (bars 1-4): Em aggressive motif
  const melA = [
    [0, 0.3, 330], [0.5, 0.7, 392], [1.0, 1.2, 440], [1.5, 1.8, 494],
    [2.0, 2.8, 523], [3.0, 3.2, 494], [3.5, 3.8, 440],
  ];
  // Melody phrase B (bars 5-8): variation
  const melB = [
    [0, 0.3, 523], [0.5, 0.7, 587], [1.0, 1.5, 659], [2.0, 2.3, 587],
    [2.5, 2.8, 523], [3.0, 3.3, 494], [3.5, 4.0, 440],
  ];

  const sections = [
    { mel: melA, offset: 0 },
    { mel: melB, offset: 4 },
    { mel: melA, offset: 8 },
    { mel: melB, offset: 12 },
  ];

  for (const sec of sections) {
    const shifted = sec.mel.map(([s, e, f]) => [
      s * beatLen + sec.offset * beatLen,
      e * beatLen + sec.offset * beatLen,
      f,
    ]);
    for (const [start, end, freq] of shifted) {
      const iStart = Math.floor(start * sr);
      const iEnd = Math.min(Math.floor(end * sr), n);
      for (let i = iStart; i < iEnd; i++) {
        const t = i / sr;
        const nt = t - start;
        const env = Math.exp(-nt * 4);
        samples[i] += (sine(freq, t) * 0.18 + square(freq, t) * 0.04) * env;
      }
    }
  }

  // Power chord stabs on strong beats (every 4 beats)
  for (let beat = 0; beat < dur / beatLen; beat += 4) {
    const start = beat * beatLen;
    const iStart = Math.floor(start * sr);
    const iEnd = Math.min(iStart + Math.floor(0.3 * sr), n);
    for (let i = iStart; i < iEnd; i++) {
      const nt = (i - iStart) / sr;
      const env = Math.exp(-nt * 8);
      // E power chord: E+B
      samples[i] += (sine(164.8, i / sr) * 0.1 + sine(247, i / sr) * 0.08) * env;
    }
  }

  return lowpass(samples, 0.35);
}

function generateBgmShop() {
  // Jazzy, relaxed — swing feel with walking bass and chord comping
  const dur = 16;
  const sr = BGM_SAMPLE_RATE;
  const n = Math.floor(sr * dur);
  const samples = new Float32Array(n);
  const bpm = 105;
  const beatLen = 60 / bpm;

  // Jazz chord progression: Cmaj7 - Am7 - Dm7 - G7 (2 bars each, repeat)
  const chordProg = [
    { root: 131, notes: [262, 330, 392, 494], dur: 4 }, // Cmaj7
    { root: 110, notes: [220, 262, 330, 392], dur: 4 }, // Am7
    { root: 147, notes: [294, 349, 440, 523], dur: 4 }, // Dm7
    { root: 98, notes: [196, 247, 294, 349], dur: 4 },  // G7
  ];

  // Chord pads
  let chordTime = 0;
  for (const chord of chordProg) {
    const bars = chord.dur;
    const cStart = chordTime * beatLen;
    const cEnd = (chordTime + bars) * beatLen;
    // Repeat chord progression twice
    for (const offset of [0, dur / 2]) {
      const s = cStart + offset;
      const e = Math.min(cEnd + offset, dur);
      const iS = Math.floor(s * sr);
      const iE = Math.min(Math.floor(e * sr), n);
      for (let i = iS; i < iE; i++) {
        const t = i / sr;
        const vol = 0.025;
        for (const f of chord.notes) {
          samples[i] += sine(f, t) * vol;
        }
      }
    }
    chordTime += bars;
  }

  // Walking bass (jazz quarter notes)
  const walkBass = [131, 147, 165, 175, 110, 131, 147, 165,
                    147, 165, 175, 196, 98, 110, 131, 147,
                    131, 147, 165, 175, 110, 131, 147, 165,
                    147, 165, 175, 196, 98, 110, 131, 147];
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const beatPos = t / beatLen;
    const bassIdx = Math.floor(beatPos) % walkBass.length;
    const noteT = (beatPos % 1) * beatLen;
    const env = Math.exp(-noteT * 3.5);
    const freq = walkBass[bassIdx];
    samples[i] += sine(freq, t) * 0.14 * env;
  }

  // Jazz melody (plucked, swung)
  const jazzMel = [
    [0, 0.6, 523], [0.8, 1.2, 587], [1.5, 2.0, 659], [2.5, 3.0, 698],
    [3.0, 3.5, 659], [4.0, 4.5, 587], [5.0, 5.8, 523],
    [8, 8.6, 659], [8.8, 9.2, 698], [9.5, 10.0, 784], [10.5, 11.0, 880],
    [11.0, 11.5, 784], [12.0, 12.5, 698], [13.0, 13.8, 659],
  ].map(([s, e, f]) => [s * beatLen, e * beatLen, f]);
  renderNotes(samples, jazzMel, sr, 'pluck');

  // Brushed hi-hat shuffle
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const beatPos = t / beatLen;
    const subBeat = beatPos % 1;
    // Swing: hits at 0 and 0.67 of each beat
    if (subBeat < 0.04 || (subBeat > 0.62 && subBeat < 0.66)) {
      const env = Math.exp(-(subBeat < 0.1 ? subBeat : subBeat - 0.62) * 80);
      samples[i] += noise() * 0.04 * env;
    }
  }

  return lowpass(samples, 0.25);
}

function generateBgmAmbient() {
  // Peaceful, meditative — slowly evolving textures for rest scenes
  const dur = 20;
  const sr = BGM_SAMPLE_RATE;
  const n = Math.floor(sr * dur);
  const samples = new Float32Array(n);

  // Layer 1: Deep evolving pad (C major: C3-E3-G3, shifts to Am)
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const phase = t / dur; // 0 → 1
    // Crossfade between C major and Am
    const cMaj = sine(131, t) * 0.1 + sine(165, t) * 0.08 + sine(196, t) * 0.08;
    const aMin = sine(110, t) * 0.1 + sine(131, t) * 0.08 + sine(165, t) * 0.08;
    const blend = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
    const mod = Math.sin(t * 0.15) * 0.2 + 0.8;
    samples[i] += (cMaj * (1 - blend) + aMin * blend) * mod * 0.35;
  }

  // Layer 2: Gentle wind (filtered noise)
  const windSamples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const windVol = (Math.sin(t * 0.3) * 0.5 + 0.5) * (Math.sin(t * 0.13) * 0.3 + 0.7);
    windSamples[i] = noise() * windVol * 0.03;
  }
  const filteredWind = lowpass(windSamples, 0.03);
  for (let i = 0; i < n; i++) samples[i] += filteredWind[i];

  // Layer 3: Sparse bell tones (every ~3s, random-ish pentatonic)
  const bellPitch = [523, 587, 659, 784, 880, 1047];
  for (let t = 1.5; t < dur - 1; t += 2.8) {
    const freq = bellPitch[Math.floor(t * 7.3) % bellPitch.length];
    const iStart = Math.floor(t * sr);
    const iEnd = Math.min(iStart + Math.floor(2 * sr), n);
    for (let i = iStart; i < iEnd; i++) {
      const nt = (i - iStart) / sr;
      const env = Math.exp(-nt * 2);
      samples[i] += sine(freq, i / sr) * env * 0.04;
    }
  }

  // Layer 4: Sub-bass heartbeat (very subtle)
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const pulse = Math.sin(t * Math.PI * 2 / 3); // every 3 seconds
    if (pulse > 0.9) {
      const env = (pulse - 0.9) * 10;
      samples[i] += sine(55, t) * env * 0.04;
    }
  }

  return lowpass(samples, 0.1);
}

function generateBgmEvent() {
  // Tense, uncertain — suspenseful building phrases with dissonance
  const dur = 16;
  const sr = BGM_SAMPLE_RATE;
  const n = Math.floor(sr * dur);
  const samples = new Float32Array(n);

  // Layer 1: Tremolo strings (minor second tension)
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const tremolo = Math.sin(t * 12) * 0.5 + 0.5;
    const swell = Math.sin(t * Math.PI / 8) * 0.3 + 0.7; // 8s breathe
    // Bb minor cluster: Bb2 - E3 (tritone tension)
    samples[i] += (sine(116.5, t) * 0.1 + sine(164.8, t) * 0.06) * tremolo * swell * 0.4;
  }

  // Layer 2: Slow descending chromatic bass
  const bassNotes = [98, 92.5, 87.3, 82.4, 77.8, 82.4, 87.3, 92.5]; // G2 descending then ascending
  const bassBeatLen = dur / bassNotes.length;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const noteIdx = Math.floor(t / bassBeatLen) % bassNotes.length;
    const nextIdx = (noteIdx + 1) % bassNotes.length;
    const notePos = (t % bassBeatLen) / bassBeatLen;
    // Glide between notes
    const freq = bassNotes[noteIdx] * (1 - notePos) + bassNotes[nextIdx] * notePos;
    samples[i] += sine(freq, t) * 0.1;
  }

  // Layer 3: Staccato hits on irregular beats
  const hitTimes = [0.5, 2.0, 3.5, 4.8, 6.0, 7.5, 9.0, 10.2, 11.5, 13.0, 14.5, 15.5];
  const hitFreqs = [196, 185, 196, 208, 196, 185, 196, 208, 196, 185, 196, 208];
  for (let h = 0; h < hitTimes.length; h++) {
    const iStart = Math.floor(hitTimes[h] * sr);
    const iEnd = Math.min(iStart + Math.floor(0.25 * sr), n);
    for (let i = iStart; i < iEnd; i++) {
      const nt = (i - iStart) / sr;
      const env = Math.exp(-nt * 12);
      samples[i] += (sine(hitFreqs[h], i / sr) * 0.12 + noise() * 0.03) * env;
    }
  }

  // Layer 4: High dissonant whisper
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const whisperVol = Math.sin(t * 0.4) * 0.5 + 0.5;
    samples[i] += (sine(740, t) * 0.015 + sine(783.9, t) * 0.015) * whisperVol;
  }

  return lowpass(samples, 0.15);
}

function generateBgmVictory() {
  // Triumphant fanfare — ascending brass-like theme with sustained chord
  const dur = 10;
  const sr = BGM_SAMPLE_RATE;
  const n = Math.floor(sr * dur);
  const samples = new Float32Array(n);

  // Fanfare melody
  const fanfare = [
    [0, 0.25, 392], [0.3, 0.55, 392], [0.6, 0.85, 392],
    [0.9, 1.5, 523], [1.6, 2.2, 466], [2.3, 2.9, 523],
    [3.0, 4.5, 659],
    [4.6, 4.85, 523], [4.9, 5.15, 523], [5.2, 5.45, 523],
    [5.5, 6.1, 659], [6.2, 6.8, 587], [6.9, 7.5, 659],
    [7.6, 9.5, 784],
  ];
  for (const [start, end, freq] of fanfare) {
    const iStart = Math.floor(start * sr);
    const iEnd = Math.min(Math.floor(end * sr), n);
    const noteDur = end - start;
    for (let i = iStart; i < iEnd; i++) {
      const t = i / sr;
      const nt = t - start;
      const env = envelope(nt, 0.02, 0.08, 0.75, 0.1, noteDur);
      // Brass-like: fundamental + odd harmonics
      samples[i] += (sine(freq, t) * 0.22 + sine(freq * 3, t) * 0.04 + sine(freq * 5, t) * 0.015) * env;
    }
  }

  // Sustained victory chord (C major: C-E-G-C5) from bar 3 onwards
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    if (t < 3.0) continue;
    const fadeIn = Math.min(1, (t - 3.0) / 1.5);
    const fadeOut = t > dur - 1.5 ? Math.max(0, (dur - t) / 1.5) : 1;
    const vol = fadeIn * fadeOut * 0.06;
    samples[i] += (sine(262, t) + sine(330, t) + sine(392, t) + sine(523, t)) * vol;
  }

  // Timpani hits
  const timpHits = [0, 0.9, 3.0, 5.5, 7.6];
  for (const th of timpHits) {
    const iStart = Math.floor(th * sr);
    const iEnd = Math.min(iStart + Math.floor(0.4 * sr), n);
    for (let i = iStart; i < iEnd; i++) {
      const nt = (i - iStart) / sr;
      const env = Math.exp(-nt * 6);
      samples[i] += (sine(98 - nt * 80, nt) * 0.15 + noise() * 0.03) * env;
    }
  }

  return lowpass(samples, 0.35);
}

function generateBgmDefeat() {
  // Somber, melancholic — slow descending theme with fading echoes
  const dur = 12;
  const sr = BGM_SAMPLE_RATE;
  const n = Math.floor(sr * dur);
  const samples = new Float32Array(n);

  // Descending melody (Dm: D-F-A descending motion)
  const melody = [
    [0.5, 2.0, 294], [2.2, 3.5, 262], [3.7, 5.0, 233],
    [5.2, 6.5, 220], [6.7, 8.5, 196],
    [8.7, 10.0, 175], [10.2, 11.5, 165],
  ];
  for (const [start, end, freq] of melody) {
    const iStart = Math.floor(start * sr);
    const iEnd = Math.min(Math.floor(end * sr), n);
    const noteDur = end - start;
    for (let i = iStart; i < iEnd; i++) {
      const t = i / sr;
      const nt = t - start;
      const env = envelope(nt, 0.1, 0.3, 0.5, 0.5, noteDur);
      samples[i] += (sine(freq, t) * 0.18 + sine(freq * 0.5, t) * 0.08) * env;
    }
  }

  // Desolate pad (Dm: D-F-A minor)
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const fadeOut = t > dur - 3 ? Math.max(0, (dur - t) / 3) : 1;
    const swell = Math.sin(t * Math.PI / dur);
    samples[i] += (sine(147, t) * 0.06 + sine(175, t) * 0.05 + sine(220, t) * 0.05) * swell * fadeOut;
  }

  // Echo/reverb simulation (delay lines)
  const delay1 = Math.floor(0.4 * sr);
  const delay2 = Math.floor(0.75 * sr);
  for (let i = n - 1; i >= 0; i--) {
    if (i + delay1 < n) samples[i] += samples[i + delay1] * 0.15;
    if (i + delay2 < n) samples[i] += samples[i + delay2] * 0.08;
  }

  // Overall fade-out in last 2 seconds
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    if (t > dur - 2) {
      samples[i] *= Math.max(0, (dur - t) / 2);
    }
  }

  return lowpass(samples, 0.12);
}

function generateSfxSelect() {
  // Short bright pop for hero selection toggle
  const dur = 0.12;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 25);
    samples[i] = (sine(1000, t) * 0.35 + sine(1500, t) * 0.2) * env * 0.5;
  }
  return samples;
}

function generateSfxCoin() {
  // Double ping coin sound for gold changes
  const dur = 0.25;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const ping1 = sine(2200, t) * Math.exp(-t * 20) * 0.3;
    const ping2 = t > 0.08 ? sine(2800, t) * Math.exp(-(t - 0.08) * 25) * 0.25 : 0;
    samples[i] = (ping1 + ping2) * 0.6;
  }
  return samples;
}

function generateSfxEventGood() {
  // Ascending chime for positive event outcome
  const dur = 0.4;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  const notes = [523, 659, 784]; // C5 E5 G5
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    for (let j = 0; j < notes.length; j++) {
      const noteStart = j * 0.1;
      if (t >= noteStart) {
        const nt = t - noteStart;
        const env = Math.exp(-nt * 6);
        samples[i] += sine(notes[j], t) * env * 0.2;
      }
    }
    samples[i] *= 0.6;
  }
  return samples;
}

function generateSfxEventBad() {
  // Descending dissonant tone for negative event outcome
  const dur = 0.45;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = envelope(t, 0.01, 0.1, 0.5, 0.2, dur);
    const freq = 400 - t * 300;
    samples[i] = (sine(freq, t) * 0.25 + sine(freq * 1.06, t) * 0.15) * env * 0.5;
  }
  return samples;
}

function generateSfxCrit() {
  // Sharp impact with high-pitched ring for critical hits
  const dur = 0.2;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const impact = noise() * Math.exp(-t * 40) * 0.5;
    const ring = sine(1800, t) * Math.exp(-t * 12) * 0.35;
    samples[i] = (impact + ring) * 0.7;
  }
  return samples;
}

function generateSfxError() {
  // Short low buzz for "can't do that" feedback
  const dur = 0.15;
  const n = Math.floor(SAMPLE_RATE * dur);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 15);
    samples[i] = (square(180, t) * 0.3 + noise() * 0.1) * env * 0.5;
  }
  return lowpass(samples, 0.25);
}

// ==================== Generate All ====================

const sfxGenerators = {
  sfx_hit: generateSfxHit,
  sfx_kill: generateSfxKill,
  sfx_heal: generateSfxHeal,
  sfx_skill: generateSfxSkill,
  sfx_reaction: generateSfxReaction,
  sfx_click: generateSfxClick,
  sfx_buy: generateSfxBuy,
  sfx_equip: generateSfxEquip,
  sfx_levelup: generateSfxLevelup,
  sfx_select: generateSfxSelect,
  sfx_coin: generateSfxCoin,
  sfx_event_good: generateSfxEventGood,
  sfx_event_bad: generateSfxEventBad,
  sfx_crit: generateSfxCrit,
  sfx_error: generateSfxError,
};

const bgmGenerators = {
  bgm_menu: generateBgmMenu,
  bgm_map: generateBgmMap,
  bgm_battle: generateBgmBattle,
  bgm_shop: generateBgmShop,
  bgm_ambient: generateBgmAmbient,
  bgm_event: generateBgmEvent,
  bgm_victory: generateBgmVictory,
  bgm_defeat: generateBgmDefeat,
};

console.log('Generating audio files...');

for (const [key, gen] of Object.entries(sfxGenerators)) {
  const samples = gen();
  const filePath = path.join(outDir, `${key}.wav`);
  writeWav(filePath, samples);
  console.log(`  ${key}.wav (${samples.length} samples, ${(samples.length / SAMPLE_RATE).toFixed(2)}s)`);
}

for (const [key, gen] of Object.entries(bgmGenerators)) {
  const samples = gen();
  const filePath = path.join(outDir, `${key}.wav`);
  writeWav(filePath, samples, BGM_SAMPLE_RATE);
  console.log(`  ${key}.wav (${samples.length} samples, ${(samples.length / BGM_SAMPLE_RATE).toFixed(2)}s @ ${BGM_SAMPLE_RATE}Hz)`);
}

// Remove old placeholder .ogg files
for (const file of fs.readdirSync(outDir)) {
  if (file.endsWith('.ogg')) {
    fs.unlinkSync(path.join(outDir, file));
    console.log(`  Removed placeholder: ${file}`);
  }
}

console.log('Done! All audio files generated.');
