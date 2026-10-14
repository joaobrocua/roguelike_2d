import { describe, expect, it } from 'vitest';
import {
  barDurationSeconds,
  degreeToMidi,
  generateBar,
  midiToFrequency,
  type MusicStyle,
} from '../src/logic/audio/music';

const style: MusicStyle = {
  rootMidi: 57,
  scale: [0, 2, 3, 5, 7, 8, 10],
  bpm: 60,
  beatsPerBar: 4,
  progression: [
    [0, 2, 4],
    [5, 7, 9],
    [3, 5, 7],
  ],
  leadDensity: 1,
  leadOctave: 1,
  bassOctave: -1,
};

describe('midiToFrequency', () => {
  it('mapeia 69 para 440 Hz', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 6);
  });

  it('mapeia 60 (dó central) para cerca de 261,63 Hz', () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.6256, 3);
  });

  it('dobra a frequência a cada oitava', () => {
    expect(midiToFrequency(81)).toBeCloseTo(880, 6);
    expect(midiToFrequency(57)).toBeCloseTo(220, 6);
  });
});

describe('degreeToMidi', () => {
  it('usa o semitom da escala para graus dentro dela', () => {
    expect(degreeToMidi(style, 0)).toBe(57);
    expect(degreeToMidi(style, 2)).toBe(60);
    expect(degreeToMidi(style, 6)).toBe(67);
  });

  it('sobe oitavas para graus acima da escala', () => {
    expect(degreeToMidi(style, 7)).toBe(69);
    expect(degreeToMidi(style, 9)).toBe(72);
    expect(degreeToMidi(style, 14)).toBe(81);
  });

  it('desce oitavas para graus negativos, sem módulo negativo', () => {
    expect(degreeToMidi(style, -1)).toBe(57 - 12 + 10);
    expect(degreeToMidi(style, -7)).toBe(45);
    expect(degreeToMidi(style, -8)).toBe(45 - 2);
  });

  it('aplica o deslocamento de oitavas', () => {
    expect(degreeToMidi(style, 0, -1)).toBe(45);
    expect(degreeToMidi(style, 2, 1)).toBe(72);
  });

  it('com escala vazia devolve a tônica deslocada', () => {
    const empty = { ...style, scale: [] };
    expect(degreeToMidi(empty, 3)).toBe(57);
    expect(degreeToMidi(empty, -5, 2)).toBe(81);
  });
});

describe('barDurationSeconds', () => {
  it('calcula a duração a partir do andamento', () => {
    expect(barDurationSeconds(style)).toBe(4);
    expect(barDurationSeconds({ ...style, bpm: 120, beatsPerBar: 3 })).toBeCloseTo(1.5, 9);
  });

  it('devolve 0 com andamento inválido', () => {
    expect(barDurationSeconds({ ...style, bpm: 0 })).toBe(0);
  });
});

describe('generateBar', () => {
  it('é determinístico: mesma entrada, mesma saída', () => {
    expect(generateBar(style, 3, 1234)).toEqual(generateBar(style, 3, 1234));
  });

  it('com semente diferente muda a melodia', () => {
    expect(generateBar(style, 0, 1)).not.toEqual(generateBar(style, 0, 2));
  });

  it('com compasso diferente (mesmo acorde) muda a melodia', () => {
    const loop = { ...style, progression: [[0, 2, 4]] };
    expect(generateBar(loop, 0, 7)).not.toEqual(generateBar(loop, 1, 7));
  });

  it('nunca estoura o compasso e mantém velocity em 0..1', () => {
    for (const beatsPerBar of [2, 3, 4, 6, 7]) {
      for (let seed = 0; seed < 40; seed++) {
        const bar = generateBar({ ...style, beatsPerBar }, seed, seed * 31);
        for (const note of bar) {
          expect(note.startBeat).toBeGreaterThanOrEqual(0);
          expect(note.durBeats).toBeGreaterThan(0);
          expect(note.startBeat + note.durBeats).toBeLessThanOrEqual(beatsPerBar);
          expect(note.velocity).toBeGreaterThanOrEqual(0);
          expect(note.velocity).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('devolve as notas ordenadas por startBeat', () => {
    for (let seed = 0; seed < 40; seed++) {
      const starts = generateBar(style, seed, seed).map((n) => n.startBeat);
      expect(starts).toEqual([...starts].sort((a, b) => a - b));
    }
  });

  it('devolve vazio para progressão vazia, acorde vazio ou compasso sem tempos', () => {
    expect(generateBar({ ...style, progression: [] }, 0, 1)).toEqual([]);
    expect(generateBar({ ...style, progression: [[]] }, 0, 1)).toEqual([]);
    expect(generateBar({ ...style, beatsPerBar: 0 }, 0, 1)).toEqual([]);
    expect(generateBar({ ...style, beatsPerBar: -4 }, 0, 1)).toEqual([]);
  });

  it('usa o acorde do compasso com módulo seguro para índices negativos', () => {
    const quiet = { ...style, leadDensity: 0 };
    const pads = (index: number) =>
      generateBar(quiet, index, 9)
        .filter((n) => n.voice === 'pad')
        .map((n) => n.midi);
    expect(pads(-1)).toEqual(pads(2));
    expect(pads(-3)).toEqual(pads(0));
    expect(pads(3)).toEqual(pads(0));
    expect(pads(-1)).not.toEqual(pads(0));
  });

  it('gera um pad por grau do acorde, no início e com duração do compasso', () => {
    const pads = generateBar(style, 0, 5).filter((n) => n.voice === 'pad');
    expect(pads.map((n) => n.midi)).toEqual([57, 60, 64]);
    for (const pad of pads) {
      expect(pad.startBeat).toBe(0);
      expect(pad.durBeats).toBe(4);
      expect(pad.velocity).toBe(0.5);
    }
  });

  it('gera o baixo na tônica do acorde, duas vezes em compasso de 4 tempos', () => {
    const bass = generateBar(style, 1, 5).filter((n) => n.voice === 'bass');
    // Acorde 1 começa no grau 5 (8 semitons), uma oitava abaixo.
    expect(bass.map((n) => n.midi)).toEqual([45 + 8, 45 + 8]);
    expect(bass.map((n) => n.startBeat)).toEqual([0, 2]);
    expect(bass.map((n) => n.durBeats)).toEqual([2, 2]);
    expect(bass.every((n) => n.velocity === 0.7)).toBe(true);
  });

  it('gera o baixo uma única vez em compasso curto', () => {
    const bass = generateBar({ ...style, beatsPerBar: 3 }, 0, 5).filter((n) => n.voice === 'bass');
    expect(bass).toHaveLength(1);
    expect(bass[0]?.startBeat).toBe(0);
  });

  it('sem melodia quando leadDensity é 0 e com melodia em toda colcheia quando é 1', () => {
    const none = generateBar({ ...style, leadDensity: 0 }, 0, 3);
    expect(none.some((n) => n.voice === 'lead')).toBe(false);
    const full = generateBar({ ...style, leadDensity: 5 }, 0, 3).filter((n) => n.voice === 'lead');
    expect(full.map((n) => n.startBeat)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
    expect(full.every((n) => n.durBeats === 0.5)).toBe(true);
  });

  it('melodia usa só graus do acorde ou vizinhos de escala, na oitava pedida', () => {
    const allowed = new Set(
      [-1, 0, 1, 1, 2, 3, 3, 4, 5].map((degree) => degreeToMidi(style, degree, 1)),
    );
    for (let seed = 0; seed < 30; seed++) {
      const lead = generateBar({ ...style, progression: [[0, 2, 4]] }, 0, seed).filter(
        (n) => n.voice === 'lead',
      );
      expect(lead.length).toBeGreaterThan(0);
      for (const note of lead) {
        expect(allowed.has(note.midi)).toBe(true);
        expect(note.velocity).toBeGreaterThanOrEqual(0.3);
        expect(note.velocity).toBeLessThanOrEqual(0.6);
      }
    }
  });

  it('raramente repete a mesma nota em sequência', () => {
    let repeats = 0;
    let pairs = 0;
    for (let seed = 0; seed < 50; seed++) {
      const lead = generateBar(style, 0, seed).filter((n) => n.voice === 'lead');
      for (let i = 1; i < lead.length; i++) {
        pairs++;
        if (lead[i]?.midi === lead[i - 1]?.midi) repeats++;
      }
    }
    // Sem o segundo sorteio seriam cerca de 1/9 dos pares; com ele, cerca de 1/81.
    expect(repeats / pairs).toBeLessThan(0.05);
  });

  it('notas longas da melodia só acontecem quando a colcheia seguinte está livre', () => {
    for (let seed = 0; seed < 60; seed++) {
      const lead = generateBar({ ...style, leadDensity: 0.5 }, 0, seed).filter(
        (n) => n.voice === 'lead',
      );
      for (const note of lead) {
        if (note.durBeats !== 1) continue;
        const clash = lead.some((o) => o.startBeat === note.startBeat + 0.5);
        expect(clash).toBe(false);
      }
    }
  });
});
