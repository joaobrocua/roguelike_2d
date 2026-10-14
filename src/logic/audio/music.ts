import { createRng, randomInt } from '../../utils/rng';

/** Descrição de uma trilha: tom, escala, andamento e a progressão de acordes que se repete. */
export interface MusicStyle {
  /** Nota MIDI da tônica (60 = dó central). */
  rootMidi: number;
  /** Semitons a partir da tônica, ex.: [0, 2, 3, 5, 7, 8, 10]. */
  scale: readonly number[];
  bpm: number;
  beatsPerBar: number;
  /**
   * Cada acorde é uma lista de graus da escala (0-based). Graus além do tamanho da escala sobem
   * de oitava; graus negativos descem.
   */
  progression: readonly (readonly number[])[];
  /** Chance (0..1) de nascer uma nota de melodia em cada colcheia. */
  leadDensity: number;
  /** Deslocamento de oitavas da melodia em relação à tônica. */
  leadOctave: number;
  /** Deslocamento de oitavas do baixo (normalmente negativo). */
  bassOctave: number;
}

export type MusicVoice = 'pad' | 'bass' | 'lead';

export interface MusicNote {
  voice: MusicVoice;
  midi: number;
  /** Posição em tempos, relativa ao início do compasso. */
  startBeat: number;
  durBeats: number;
  /** Intensidade de 0 a 1. */
  velocity: number;
}

const SEMITONES_PER_OCTAVE = 12;
const A4_MIDI = 69;
const A4_HZ = 440;
/** A melodia anda em colcheias: duas por tempo. */
const LEAD_SLOT_BEATS = 0.5;
const PAD_VELOCITY = 0.5;
const BASS_VELOCITY = 0.7;
/** Chance de uma nota de melodia durar um tempo inteiro quando há espaço. */
const LEAD_LONG_CHANCE = 0.5;
const LEAD_VELOCITY_MIN = 0.3;
const LEAD_VELOCITY_RANGE = 0.3;
/** Multiplicador de mistura (razão áurea em 32 bits) para espalhar a semente de cada compasso. */
const BAR_SEED_MIX = 2654435761;

/** Frequência em Hz de uma nota MIDI (69 = 440 Hz). */
export function midiToFrequency(midi: number): number {
  return A4_HZ * Math.pow(2, (midi - A4_MIDI) / SEMITONES_PER_OCTAVE);
}

/** Nota MIDI de um grau da escala; graus fora do intervalo sobem/descem oitavas inteiras. */
export function degreeToMidi(style: MusicStyle, degree: number, octaveShift = 0): number {
  const size = style.scale.length;
  const base = style.rootMidi + SEMITONES_PER_OCTAVE * octaveShift;
  if (size === 0) return base;
  const whole = Math.round(degree);
  const octave = Math.floor(whole / size);
  const index = whole - octave * size;
  return base + SEMITONES_PER_OCTAVE * octave + (style.scale[index] ?? 0);
}

/** Duração de um compasso em segundos. */
export function barDurationSeconds(style: MusicStyle): number {
  if (!(style.bpm > 0)) return 0;
  return (style.beatsPerBar * 60) / style.bpm;
}

function clamp01(value: number): number {
  if (!(value > 0)) return 0;
  return value > 1 ? 1 : value;
}

/** Módulo que nunca devolve negativo. */
function safeMod(value: number, size: number): number {
  return ((value % size) + size) % size;
}

/**
 * Gera as notas de um compasso. Determinístico: mesma trilha, compasso e semente dão sempre as
 * mesmas notas. O resultado vem ordenado por `startBeat` e nunca passa do fim do compasso.
 */
export function generateBar(style: MusicStyle, barIndex: number, seed: number): MusicNote[] {
  const beats = style.beatsPerBar;
  if (!(beats > 0) || style.progression.length === 0) return [];
  const chord = style.progression[safeMod(barIndex, style.progression.length)];
  const first = chord?.[0];
  if (chord === undefined || first === undefined) return [];

  const notes: MusicNote[] = [];

  for (const degree of chord) {
    notes.push({
      voice: 'pad',
      midi: degreeToMidi(style, degree),
      startBeat: 0,
      durBeats: beats,
      velocity: PAD_VELOCITY,
    });
  }

  const bassMidi = degreeToMidi(style, first, style.bassOctave);
  notes.push({
    voice: 'bass',
    midi: bassMidi,
    startBeat: 0,
    durBeats: beats / 2,
    velocity: BASS_VELOCITY,
  });
  if (beats >= 4) {
    notes.push({
      voice: 'bass',
      midi: bassMidi,
      startBeat: beats / 2,
      durBeats: beats / 2,
      velocity: BASS_VELOCITY,
    });
  }

  pushLead(notes, style, chord, createRng((seed ^ Math.imul(barIndex + 1, BAR_SEED_MIX)) >>> 0));

  // Array.prototype.sort é estável: no mesmo tempo, mantém a ordem pad, baixo, melodia.
  return notes.sort((a, b) => a.startBeat - b.startBeat);
}

function pushLead(
  notes: MusicNote[],
  style: MusicStyle,
  chord: readonly number[],
  rng: () => number,
): void {
  const beats = style.beatsPerBar;
  const slots = Math.floor(beats / LEAD_SLOT_BEATS);
  const density = clamp01(style.leadDensity);

  // Sorteia antes quais colcheias têm nota, para saber se a seguinte está livre.
  const occupied: boolean[] = [];
  for (let slot = 0; slot < slots; slot++) occupied.push(rng() < density);

  // Candidatas: graus do acorde e seus vizinhos de escala, sem repetição.
  const candidates: number[] = [];
  for (const degree of chord) {
    for (const neighbour of [degree - 1, degree, degree + 1]) {
      const midi = degreeToMidi(style, neighbour, style.leadOctave);
      if (!candidates.includes(midi)) candidates.push(midi);
    }
  }

  const pick = (): number => candidates[randomInt(rng, 0, candidates.length)] ?? style.rootMidi;
  let previous: number | null = null;
  for (let slot = 0; slot < slots; slot++) {
    if (!occupied[slot]) continue;
    let midi = pick();
    if (midi === previous) midi = pick();
    const startBeat = slot * LEAD_SLOT_BEATS;
    const nextFree = slot + 1 < slots && !occupied[slot + 1];
    const longFits = startBeat + 2 * LEAD_SLOT_BEATS <= beats;
    const long = nextFree && longFits && rng() < LEAD_LONG_CHANCE;
    notes.push({
      voice: 'lead',
      midi,
      startBeat,
      durBeats: long ? 2 * LEAD_SLOT_BEATS : LEAD_SLOT_BEATS,
      velocity: LEAD_VELOCITY_MIN + rng() * LEAD_VELOCITY_RANGE,
    });
    previous = midi;
  }
}
