/**
 * Procedural sound effects and ambient music with WebAudio — no audio files
 * needed for the MVP. Replace with recorded assets later (TZ §62).
 */
type Sfx =
  | 'step'
  | 'jump'
  | 'doubleJump'
  | 'land'
  | 'dash'
  | 'portal'
  | 'click'
  | 'quest'
  | 'collect'
  | 'crystal'
  | 'board'
  | 'error'
  | 'beacon'
  | 'levelup';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxOn = true;
let musicOn = true;
let currentTheme: string | null = null;
let musicTimer: number | null = null;

function ac() {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.12;
    musicGain.connect(master);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0, out?: AudioNode) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out ?? master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, vol: number, freq = 1200) {
  const c = ac();
  if (!c || !master) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start();
}

export function play(s: Sfx) {
  if (!sfxOn) return;
  switch (s) {
    case 'step':
      noise(0.05, 0.08, 600);
      break;
    case 'jump':
      tone(320, 0.18, 'sine', 0.25, 620);
      break;
    case 'doubleJump':
      tone(480, 0.2, 'sine', 0.25, 900);
      tone(720, 0.15, 'triangle', 0.1, 1200, 0.03);
      break;
    case 'land':
      noise(0.09, 0.2, 400);
      break;
    case 'dash':
      noise(0.22, 0.25, 2400);
      tone(600, 0.2, 'sawtooth', 0.05, 200);
      break;
    case 'portal':
      tone(200, 1.2, 'sine', 0.3, 1200);
      tone(300, 1.2, 'triangle', 0.15, 1800, 0.1);
      noise(1.0, 0.15, 3000);
      break;
    case 'click':
      tone(900, 0.06, 'square', 0.06);
      break;
    case 'collect':
      tone(880, 0.1, 'sine', 0.2);
      tone(1320, 0.14, 'sine', 0.18, undefined, 0.07);
      break;
    case 'crystal':
      [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.5, 'sine', 0.15, undefined, i * 0.08));
      break;
    case 'beacon':
      tone(220, 0.8, 'sawtooth', 0.08, 880);
      [523, 659, 784].forEach((f, i) => tone(f, 0.6, 'sine', 0.18, undefined, 0.3 + i * 0.1));
      break;
    case 'quest':
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.5, 'triangle', 0.18, undefined, i * 0.11));
      break;
    case 'levelup':
      [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'square', 0.07, undefined, i * 0.07));
      break;
    case 'board':
      tone(140, 0.4, 'sawtooth', 0.06, 280);
      break;
    case 'error':
      tone(180, 0.18, 'square', 0.08, 120);
      break;
  }
}

const THEMES: Record<string, { chords: number[][]; tempo: number; wave: OscillatorType }> = {
  home: {
    chords: [
      [261.6, 329.6, 392, 493.9],
      [220, 261.6, 329.6, 392],
      [174.6, 220, 261.6, 329.6],
      [196, 246.9, 293.7, 392],
    ],
    tempo: 3.2,
    wave: 'sine',
  },
  rio: {
    chords: [
      [293.7, 349.2, 440, 523.3],
      [196, 246.9, 293.7, 349.2],
      [261.6, 329.6, 392, 493.9],
      [220, 277.2, 329.6, 392],
    ],
    tempo: 2.4,
    wave: 'triangle',
  },
  room: {
    chords: [
      [220, 261.6, 329.6, 392],
      [174.6, 220, 261.6, 349.2],
    ],
    tempo: 4,
    wave: 'sine',
  },
};

/** Gentle generative pad per scene (Home Planet Theme, Rio Theme, Room ambient). */
export function setMusic(theme: string | null) {
  currentTheme = theme;
  if (musicTimer) window.clearInterval(musicTimer);
  musicTimer = null;
  if (!theme || !musicOn) return;
  const t = THEMES[theme];
  if (!t) return;
  let i = 0;
  const playChord = () => {
    const c = ac();
    if (!c || !musicGain || c.state !== 'running') return;
    const chord = t.chords[i++ % t.chords.length];
    chord.forEach((f, k) => tone(f / 2, t.tempo * 1.1, t.wave, 0.35, undefined, k * 0.05, musicGain!));
    if (theme === 'rio') {
      // a little bossa pulse
      [0, 0.6, 1.2, 1.5].forEach((d) => tone(chord[0] / 4, 0.25, 'sine', 0.5, undefined, d, musicGain!));
    }
  };
  playChord();
  musicTimer = window.setInterval(playChord, t.tempo * 1000);
}

export function setAudioSettings(sound: boolean, music: boolean) {
  sfxOn = sound;
  const changed = musicOn !== music;
  musicOn = music;
  if (changed) setMusic(currentTheme);
}

/** Browsers need a user gesture before audio can start. */
export function unlockAudio() {
  ac();
}
