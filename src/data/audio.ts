/**
 * Áudio do jogo: configurações padrão, onde o jogador guarda o volume, as receitas dos efeitos
 * sonoros e as trilhas. Tudo é sintetizado por WebAudio, sem arquivos de som.
 * Sem lógica e sem Phaser.
 */

/** Volumes padrão (0 a 1) e o passo dos controles de volume. */
export const AUDIO_DEFAULTS = {
  muted: false,
  music: 0.6,
  sfx: 0.8,
  /** Quanto cada aperto de esquerda/direita muda um volume. */
  step: 0.1,
} as const;

/** Onde as configurações de áudio ficam no navegador (localStorage). */
export const AUDIO_STORAGE = { key: 'ruinas-esquecidas:audio' } as const;

/** Tempos e limites técnicos do WebAudio (segundos, salvo indicação). */
export const AUDIO_FX = {
  /** Suavização das mudanças de volume (constante de tempo). */
  smoothing: 0.03,
  /** Folga depois do fim de um som antes de parar o oscilador. */
  stopPad: 0.05,
  /** Quanto antes do fim da nota a música começa a soltar (queda do volume). */
  noteTailPad: 0.05,
  /** Primeira nota da trilha e reposição do relógio quando a música atrasa. */
  startDelay: 0.1,
  /** Menor volume possível (a rampa exponencial não aceita zero). */
  silence: 0.0001,
  noiseSeconds: 1,
  delayMaxSeconds: 2,
} as const;

/** Ganho máximo de cada barramento (o volume do jogador multiplica isto). */
export const AUDIO_LEVELS = { master: 0.9, sfx: 0.7, music: 0.32 } as const;

// --- Efeitos sonoros ------------------------------------------------------------------------

export type SfxWave = 'sine' | 'square' | 'sawtooth' | 'triangle';

/** Um tom: oscilador que desliza de `from` a `to` (Hz) e some em `decay` segundos. */
export interface SfxTone {
  wave: SfxWave;
  from: number;
  to: number;
  decay: number;
  gain: number;
  /** Espera (s) antes de começar: serve para acordes e arpejos. */
  delay?: number;
  /** Subida do volume (s); sem isso o som já nasce no máximo. */
  attack?: number;
}

/** Um sopro: ruído branco filtrado, com o corte do filtro deslizando de `from` a `to` (Hz). */
export interface SfxNoise {
  filter: 'lowpass' | 'highpass' | 'bandpass';
  from: number;
  to: number;
  decay: number;
  gain: number;
  delay?: number;
  attack?: number;
  q?: number;
}

export interface SfxRecipe {
  tones?: readonly SfxTone[];
  noises?: readonly SfxNoise[];
  /** Intervalo mínimo (ms) entre dois disparos do mesmo som (evita estourar com golpes em série). */
  minGapMs: number;
}

/** Notas (Hz) usadas nos arpejos dos efeitos. */
const N = { c5: 523, e5: 659, g5: 784, a5: 880, c6: 1047, e6: 1319, g6: 1568 } as const;

export const SFX = {
  // Combate
  swing: {
    noises: [{ filter: 'bandpass', from: 700, to: 2600, decay: 0.12, gain: 0.35, q: 0.8 }],
    minGapMs: 40,
  },
  special: {
    noises: [{ filter: 'bandpass', from: 400, to: 3400, decay: 0.28, gain: 0.45, q: 0.6 }],
    tones: [{ wave: 'sawtooth', from: 180, to: 720, decay: 0.26, gain: 0.16 }],
    minGapMs: 80,
  },
  hit: {
    noises: [{ filter: 'lowpass', from: 3200, to: 500, decay: 0.12, gain: 0.5 }],
    tones: [{ wave: 'square', from: 190, to: 70, decay: 0.12, gain: 0.3 }],
    minGapMs: 35,
  },
  kill: {
    noises: [{ filter: 'lowpass', from: 2400, to: 200, decay: 0.34, gain: 0.5 }],
    tones: [{ wave: 'sawtooth', from: 320, to: 50, decay: 0.34, gain: 0.26 }],
    minGapMs: 60,
  },
  hurt: {
    noises: [{ filter: 'lowpass', from: 1800, to: 250, decay: 0.28, gain: 0.5 }],
    tones: [{ wave: 'sawtooth', from: 260, to: 70, decay: 0.3, gain: 0.34 }],
    minGapMs: 120,
  },
  blocked: {
    tones: [
      { wave: 'square', from: 1700, to: 1500, decay: 0.07, gain: 0.16 },
      { wave: 'triangle', from: 2300, to: 2200, decay: 0.1, gain: 0.12, delay: 0.015 },
    ],
    minGapMs: 60,
  },
  roll: {
    noises: [{ filter: 'lowpass', from: 900, to: 260, decay: 0.2, gain: 0.3 }],
    minGapMs: 120,
  },
  dodge: {
    tones: [
      { wave: 'triangle', from: N.c6, to: N.c6, decay: 0.45, gain: 0.3 },
      { wave: 'sine', from: N.e6, to: N.e6, decay: 0.5, gain: 0.22, delay: 0.06 },
      { wave: 'sine', from: N.g6, to: N.g6, decay: 0.6, gain: 0.2, delay: 0.12 },
    ],
    noises: [{ filter: 'highpass', from: 3000, to: 7000, decay: 0.3, gain: 0.18 }],
    minGapMs: 200,
  },
  swap: {
    noises: [{ filter: 'bandpass', from: 500, to: 3000, decay: 0.22, gain: 0.35, q: 0.7 }],
    tones: [{ wave: 'triangle', from: 440, to: 880, decay: 0.2, gain: 0.2 }],
    minGapMs: 100,
  },
  jump: {
    tones: [{ wave: 'sine', from: 240, to: 480, decay: 0.12, gain: 0.16 }],
    minGapMs: 80,
  },
  land: {
    noises: [{ filter: 'lowpass', from: 500, to: 120, decay: 0.12, gain: 0.35 }],
    minGapMs: 90,
  },
  // Chefe
  bossPhase: {
    noises: [{ filter: 'lowpass', from: 900, to: 90, decay: 1.1, gain: 0.6 }],
    tones: [
      { wave: 'sawtooth', from: 110, to: 55, decay: 1.1, gain: 0.3 },
      { wave: 'square', from: 165, to: 80, decay: 0.9, gain: 0.16 },
    ],
    minGapMs: 600,
  },
  bossLand: {
    noises: [{ filter: 'lowpass', from: 700, to: 80, decay: 0.3, gain: 0.7 }],
    tones: [{ wave: 'sine', from: 90, to: 40, decay: 0.3, gain: 0.5 }],
    minGapMs: 120,
  },
  // Mundo e itens
  soul: {
    tones: [
      { wave: 'sine', from: N.e5, to: N.e5, decay: 0.16, gain: 0.2 },
      { wave: 'sine', from: N.a5, to: N.a5, decay: 0.24, gain: 0.2, delay: 0.07 },
    ],
    minGapMs: 70,
  },
  heal: {
    tones: [
      { wave: 'sine', from: N.c5, to: N.c5, decay: 0.2, gain: 0.2 },
      { wave: 'sine', from: N.e5, to: N.e5, decay: 0.2, gain: 0.2, delay: 0.08 },
      { wave: 'sine', from: N.g5, to: N.g5, decay: 0.32, gain: 0.2, delay: 0.16 },
    ],
    minGapMs: 200,
  },
  relicDrop: {
    tones: [
      { wave: 'triangle', from: N.g5, to: N.g5, decay: 0.14, gain: 0.18 },
      { wave: 'triangle', from: N.c6, to: N.c6, decay: 0.3, gain: 0.18, delay: 0.09 },
    ],
    minGapMs: 100,
  },
  relic: {
    tones: [
      { wave: 'triangle', from: N.c5, to: N.c5, decay: 0.2, gain: 0.22 },
      { wave: 'triangle', from: N.e5, to: N.e5, decay: 0.2, gain: 0.22, delay: 0.08 },
      { wave: 'triangle', from: N.g5, to: N.g5, decay: 0.2, gain: 0.22, delay: 0.16 },
      { wave: 'triangle', from: N.c6, to: N.c6, decay: 0.5, gain: 0.24, delay: 0.24 },
    ],
    minGapMs: 200,
  },
  chest: {
    tones: [
      { wave: 'triangle', from: 120, to: 220, decay: 0.3, gain: 0.3 },
      { wave: 'sine', from: N.g5, to: N.g5, decay: 0.5, gain: 0.18, delay: 0.22 },
      { wave: 'sine', from: N.c6, to: N.c6, decay: 0.6, gain: 0.18, delay: 0.3 },
    ],
    noises: [{ filter: 'bandpass', from: 300, to: 900, decay: 0.22, gain: 0.2 }],
    minGapMs: 300,
  },
  fire: {
    noises: [{ filter: 'lowpass', from: 600, to: 1800, decay: 0.7, gain: 0.35, attack: 0.15 }],
    tones: [
      { wave: 'sine', from: 196, to: 196, decay: 0.9, gain: 0.16, attack: 0.1 },
      { wave: 'sine', from: 294, to: 294, decay: 0.9, gain: 0.12, attack: 0.1, delay: 0.1 },
    ],
    minGapMs: 400,
  },
  altar: {
    tones: [
      { wave: 'sine', from: 220, to: 220, decay: 1.1, gain: 0.22, attack: 0.05 },
      { wave: 'sine', from: 330, to: 330, decay: 1.1, gain: 0.16, attack: 0.05, delay: 0.05 },
      { wave: 'sine', from: N.a5, to: N.a5, decay: 1.2, gain: 0.12, delay: 0.1 },
    ],
    minGapMs: 300,
  },
  passage: {
    noises: [
      { filter: 'lowpass', from: 900, to: 260, decay: 0.9, gain: 0.32, attack: 0.18 },
      { filter: 'bandpass', from: 500, to: 1400, decay: 0.5, gain: 0.12, delay: 0.12, q: 0.5 },
    ],
    tones: [{ wave: 'sine', from: 96, to: 74, decay: 0.8, gain: 0.16, attack: 0.1 }],
    minGapMs: 800,
  },
  // Interface
  uiMove: {
    tones: [{ wave: 'square', from: 760, to: 760, decay: 0.03, gain: 0.07 }],
    minGapMs: 30,
  },
  uiConfirm: {
    tones: [
      { wave: 'square', from: 520, to: 520, decay: 0.06, gain: 0.1 },
      { wave: 'square', from: 780, to: 780, decay: 0.1, gain: 0.1, delay: 0.05 },
    ],
    minGapMs: 60,
  },
  uiBack: {
    tones: [
      { wave: 'square', from: 520, to: 520, decay: 0.05, gain: 0.09 },
      { wave: 'square', from: 360, to: 360, decay: 0.09, gain: 0.09, delay: 0.05 },
    ],
    minGapMs: 60,
  },
  uiBuy: {
    tones: [
      { wave: 'square', from: 988, to: 988, decay: 0.07, gain: 0.1 },
      { wave: 'square', from: 1319, to: 1319, decay: 0.22, gain: 0.1, delay: 0.07 },
    ],
    noises: [{ filter: 'highpass', from: 5000, to: 8000, decay: 0.18, gain: 0.08, delay: 0.07 }],
    minGapMs: 80,
  },
  uiDenied: {
    tones: [{ wave: 'square', from: 150, to: 110, decay: 0.14, gain: 0.12 }],
    minGapMs: 120,
  },
  // Fim de run
  death: {
    noises: [{ filter: 'lowpass', from: 1500, to: 120, decay: 1.6, gain: 0.45 }],
    tones: [
      { wave: 'sawtooth', from: 220, to: 55, decay: 1.6, gain: 0.3 },
      { wave: 'triangle', from: 165, to: 41, decay: 1.8, gain: 0.26, delay: 0.1 },
    ],
    minGapMs: 1500,
  },
  victory: {
    tones: [
      { wave: 'triangle', from: N.c5, to: N.c5, decay: 0.3, gain: 0.26 },
      { wave: 'triangle', from: N.e5, to: N.e5, decay: 0.3, gain: 0.26, delay: 0.16 },
      { wave: 'triangle', from: N.g5, to: N.g5, decay: 0.3, gain: 0.26, delay: 0.32 },
      { wave: 'triangle', from: N.c6, to: N.c6, decay: 0.9, gain: 0.3, delay: 0.5 },
      { wave: 'sine', from: N.e6, to: N.e6, decay: 1, gain: 0.2, delay: 0.5 },
    ],
    minGapMs: 1500,
  },
} as const satisfies Record<string, SfxRecipe>;

export type SfxName = keyof typeof SFX;

// --- Trilhas ----------------------------------------------------------------------------------

/**
 * Cada trilha é um estilo musical: a música é gerada compasso a compasso (ver
 * logic/audio/music.ts) com acordes lentos, baixo e uma melodia esparsa. Os tons de cada voz estão
 * em MUSIC_VOICES.
 */
export interface MusicTrackStyle {
  rootMidi: number;
  scale: readonly number[];
  bpm: number;
  beatsPerBar: number;
  progression: readonly (readonly number[])[];
  leadDensity: number;
  leadOctave: number;
  bassOctave: number;
  /** Semente da melodia (a mesma trilha sempre toca igual). */
  seed: number;
}

const MINOR = [0, 2, 3, 5, 7, 8, 10] as const;
const HARMONIC = [0, 2, 3, 5, 7, 8, 11] as const;
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10] as const;
const PHRYGIAN_DOMINANT = [0, 1, 4, 5, 7, 8, 10] as const;
const PENTATONIC = [0, 2, 4, 7, 9] as const;
const DORIAN = [0, 2, 3, 5, 7, 9, 10] as const;
const MINOR_PENTATONIC = [0, 3, 5, 7, 10] as const;

export const MUSIC_TRACKS = {
  // Título e Muralhas: menor natural, lento, vento e sinos distantes
  title: {
    rootMidi: 50,
    scale: MINOR,
    bpm: 54,
    beatsPerBar: 4,
    progression: [
      [0, 2, 4],
      [5, 0, 2],
      [3, 5, 0],
      [4, 6, 1],
    ],
    leadDensity: 0.2,
    leadOctave: 1,
    bassOctave: -1,
    seed: 11,
  },
  muralhas: {
    rootMidi: 50,
    scale: MINOR,
    bpm: 60,
    beatsPerBar: 4,
    progression: [
      [0, 2, 4],
      [3, 5, 0],
      [5, 0, 2],
      [4, 6, 1],
    ],
    leadDensity: 0.16,
    leadOctave: 1,
    bassOctave: -1,
    seed: 21,
  },
  // Salões: menor harmônico, mais dramático
  saloes: {
    rootMidi: 52,
    scale: HARMONIC,
    bpm: 58,
    beatsPerBar: 4,
    progression: [
      [0, 2, 4],
      [5, 0, 2],
      [3, 5, 0],
      [4, 6, 1],
    ],
    leadDensity: 0.2,
    leadOctave: 1,
    bassOctave: -1,
    seed: 31,
  },
  // Catacumbas: frígio, grave e esparso
  catacumbas: {
    rootMidi: 45,
    scale: PHRYGIAN,
    bpm: 50,
    beatsPerBar: 4,
    progression: [
      [0, 2, 4],
      [1, 3, 5],
      [0, 2, 4],
      [6, 1, 3],
    ],
    leadDensity: 0.1,
    leadOctave: 1,
    bassOctave: -1,
    seed: 41,
  },
  // Santuário: pentatônica suave, sinos
  sanctuary: {
    rootMidi: 57,
    scale: PENTATONIC,
    bpm: 52,
    beatsPerBar: 4,
    progression: [
      [0, 2, 4],
      [1, 3, 5],
      [2, 4, 6],
      [0, 2, 5],
    ],
    leadDensity: 0.3,
    leadOctave: 1,
    bassOctave: -1,
    seed: 51,
  },
  // Chefe: frígio dominante, mais rápido e tenso
  boss: {
    rootMidi: 43,
    scale: PHRYGIAN_DOMINANT,
    bpm: 84,
    beatsPerBar: 4,
    progression: [
      [0, 2, 4],
      [1, 3, 5],
      [0, 2, 4],
      [3, 5, 0],
    ],
    leadDensity: 0.28,
    leadOctave: 1,
    bassOctave: -1,
    seed: 61,
  },
  // Floresta: dórico, lento e aberto, com sinos de vento
  floresta: {
    rootMidi: 47,
    scale: DORIAN,
    bpm: 56,
    beatsPerBar: 4,
    progression: [
      [0, 2, 4],
      [3, 5, 0],
      [4, 6, 1],
      [2, 4, 6],
    ],
    leadDensity: 0.22,
    leadOctave: 1,
    bassOctave: -1,
    seed: 71,
  },
  // Pântano: pentatônica menor, muito lenta e esparsa, com sinos que ecoam na névoa
  pantano: {
    rootMidi: 48,
    scale: MINOR_PENTATONIC,
    bpm: 46,
    beatsPerBar: 4,
    progression: [
      [0, 2, 4],
      [1, 3, 5],
      [3, 5, 7],
      [2, 4, 6],
    ],
    leadDensity: 0.14,
    leadOctave: 1,
    bassOctave: -1,
    seed: 81,
  },
  // Cemitério: frígio, lento e grave, com um sino fúnebre ao longe
  cemiterio: {
    rootMidi: 45,
    scale: PHRYGIAN,
    bpm: 50,
    beatsPerBar: 4,
    progression: [
      [0, 2, 4],
      [1, 3, 5],
      [0, 2, 4],
      [6, 1, 3],
    ],
    leadDensity: 0.16,
    leadOctave: 1,
    bassOctave: -1,
    seed: 91,
  },
  // Minas: frígio dominante, grave e esparso, com pingos que ecoam na rocha
  minas: {
    rootMidi: 43,
    scale: PHRYGIAN_DOMINANT,
    bpm: 52,
    beatsPerBar: 4,
    progression: [
      [0, 2, 4],
      [3, 5, 0],
      [0, 2, 4],
      [1, 3, 5],
    ],
    leadDensity: 0.12,
    leadOctave: 1,
    bassOctave: -1,
    seed: 101,
  },
  // Vila queimada: frígio, um pouco mais vivo e dissonante, como brasas estalando
  vila: {
    rootMidi: 41,
    scale: PHRYGIAN,
    bpm: 60,
    beatsPerBar: 4,
    progression: [
      [0, 2, 4],
      [1, 3, 5],
      [3, 5, 0],
      [0, 2, 4],
    ],
    leadDensity: 0.2,
    leadOctave: 1,
    bassOctave: -1,
    seed: 111,
  },
} as const satisfies Record<string, MusicTrackStyle>;

export type MusicTrackId = keyof typeof MUSIC_TRACKS;

/** Timbre e volume de cada voz da música. `cutoff` é o corte (Hz) do filtro de cada voz. */
export const MUSIC_VOICES = {
  pad: { wave: 'sawtooth', detuneCents: 7, cutoff: 700, attack: 1.6, release: 1.8, gain: 0.07 },
  bass: { wave: 'sine', detuneCents: 0, cutoff: 400, attack: 0.08, release: 0.9, gain: 0.34 },
  lead: { wave: 'triangle', detuneCents: 0, cutoff: 3200, attack: 0.01, release: 1.4, gain: 0.16 },
} as const;

/** Eco da melodia (um atraso com realimentação) e a duração das trocas de trilha. */
export const MUSIC_FX = {
  echoSeconds: 0.42,
  echoFeedback: 0.38,
  echoWet: 0.4,
  /** Agendamos as notas com esta antecedência (s) e conferimos a fila neste intervalo (ms). */
  lookaheadSeconds: 0.8,
  tickMs: 120,
  fadeInSeconds: 1.6,
  fadeOutSeconds: 1.2,
} as const;
