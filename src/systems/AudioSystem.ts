import {
  AUDIO_FX,
  AUDIO_LEVELS,
  AUDIO_STORAGE,
  MUSIC_FX,
  MUSIC_TRACKS,
  MUSIC_VOICES,
  SFX,
  type MusicTrackId,
  type SfxName,
  type SfxNoise,
  type SfxRecipe,
  type SfxTone,
} from '../data/audio';
import {
  barDurationSeconds,
  generateBar,
  midiToFrequency,
  type MusicNote,
} from '../logic/audio/music';
import {
  readAudioSettings,
  stepVolume,
  writeAudioSettings,
  type AudioSettings,
} from '../logic/audio/settings';
import type { StorageLike } from '../logic/meta/save';
import { browserStorage } from './safeStorage';

/** A trilha que está tocando: o barramento dela, o próximo compasso a agendar e o relógio. */
interface PlayingTrack {
  id: MusicTrackId;
  bus: GainNode;
  /** Entrada da melodia (vai ao barramento e ao eco). */
  leadIn: GainNode;
  nextBarTime: number;
  barIndex: number;
}

const SILENCE = AUDIO_FX.silence;
const NO_TONES: readonly SfxTone[] = [];
const NO_NOISES: readonly SfxNoise[] = [];

/**
 * Todo o som do jogo, sintetizado por WebAudio (sem arquivos): efeitos pelas receitas de
 * data/audio.ts e uma trilha ambiente gerada compasso a compasso (logic/audio/music.ts).
 * O navegador só libera o áudio depois de um clique ou tecla; até lá os pedidos de som são
 * ignorados e a trilha pedida começa sozinha assim que o áudio destrava.
 */
export class AudioSystem {
  settings: AudioSettings;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private readonly lastPlayedMs = new Map<SfxName, number>();
  private track: PlayingTrack | null = null;
  private wanted: MusicTrackId | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly storage: StorageLike) {
    this.settings = readAudioSettings(storage);
    const unlock = (): void => this.unlock();
    for (const type of ['keydown', 'pointerdown', 'touchstart'] as const) {
      window.addEventListener(type, unlock);
    }
    window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyM' && !event.repeat) this.toggleMuted();
    });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume().then(() => this.syncTrack());
    });
  }

  // --- Configurações -----------------------------------------------------------------------

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.applySettings();
  }

  toggleMuted(): void {
    this.setMuted(!this.settings.muted);
  }

  /** Muda um volume em passos (direction = 1 sobe, -1 desce). */
  adjustVolume(kind: 'music' | 'sfx', direction: 1 | -1): void {
    this.settings[kind] = stepVolume(this.settings[kind], direction);
    this.applySettings();
  }

  private applySettings(): void {
    writeAudioSettings(this.storage, this.settings);
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.sfxBus || !this.musicBus) return;
    const t = ctx.currentTime;
    this.master.gain.setTargetAtTime(
      this.settings.muted ? 0 : AUDIO_LEVELS.master,
      t,
      AUDIO_FX.smoothing,
    );
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx * AUDIO_LEVELS.sfx, t, AUDIO_FX.smoothing);
    this.musicBus.gain.setTargetAtTime(
      this.settings.music * AUDIO_LEVELS.music,
      t,
      AUDIO_FX.smoothing,
    );
  }

  // --- Contexto ----------------------------------------------------------------------------

  /** Cria o contexto de áudio (uma vez) e o destrava; chamado nos primeiros cliques e teclas. */
  private unlock(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended' && !document.hidden) void ctx.resume();
    this.syncTrack();
  }

  /** Garante que a trilha pedida é a que toca (o pedido pode ter vindo com o áudio suspenso). */
  private syncTrack(): void {
    if (!this.wanted || !this.running) return;
    if (this.track?.id !== this.wanted) this.startTrack(this.wanted);
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      const sfxBus = ctx.createGain();
      const musicBus = ctx.createGain();
      sfxBus.connect(master);
      musicBus.connect(master);
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      this.sfxBus = sfxBus;
      this.musicBus = musicBus;
      this.noise = this.makeNoise(ctx);
      this.applySettings();
      return ctx;
    } catch {
      return null; // sem WebAudio: o jogo segue mudo
    }
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * AUDIO_FX.noiseSeconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private get running(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  // --- Efeitos -----------------------------------------------------------------------------

  /** Toca um efeito (ignorado se o áudio ainda não destravou ou se o mesmo som tocou há pouco). */
  play(name: SfxName): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || !this.running || this.settings.muted) return;
    const recipe: SfxRecipe = SFX[name];
    const now = performance.now();
    const last = this.lastPlayedMs.get(name) ?? -Infinity;
    if (now - last < recipe.minGapMs) return;
    this.lastPlayedMs.set(name, now);
    this.playRecipe(ctx, this.sfxBus, recipe, ctx.currentTime);
  }

  private playRecipe(ctx: AudioContext, out: AudioNode, recipe: SfxRecipe, t0: number): void {
    for (const tone of recipe.tones ?? NO_TONES) {
      const start = t0 + (tone.delay ?? 0);
      const end = start + tone.decay;
      const osc = ctx.createOscillator();
      osc.type = tone.wave;
      osc.frequency.setValueAtTime(tone.from, start);
      if (tone.to !== tone.from) osc.frequency.exponentialRampToValueAtTime(tone.to, end);
      const gain = ctx.createGain();
      this.envelope(gain, start, tone.attack ?? 0.004, tone.decay, tone.gain);
      osc.connect(gain).connect(out);
      osc.start(start);
      osc.stop(end + AUDIO_FX.stopPad);
    }
    for (const noise of recipe.noises ?? NO_NOISES) {
      if (!this.noise) break;
      const start = t0 + (noise.delay ?? 0);
      const end = start + noise.decay;
      const source = ctx.createBufferSource();
      source.buffer = this.noise;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = noise.filter;
      filter.Q.value = noise.q ?? 0.7;
      filter.frequency.setValueAtTime(noise.from, start);
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, noise.to), end);
      const gain = ctx.createGain();
      this.envelope(gain, start, noise.attack ?? 0.004, noise.decay, noise.gain);
      source.connect(filter).connect(gain).connect(out);
      source.start(start);
      source.stop(end + AUDIO_FX.stopPad);
    }
  }

  /** Sobe até `peak` em `attack` segundos e some exponencialmente até `attack + decay`. */
  private envelope(
    gain: GainNode,
    start: number,
    attack: number,
    decay: number,
    peak: number,
  ): void {
    gain.gain.setValueAtTime(SILENCE, start);
    gain.gain.linearRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(SILENCE, start + attack + decay);
  }

  // --- Música ------------------------------------------------------------------------------

  /** Pede uma trilha. A mesma trilha já tocando não reinicia; trilhas diferentes se cruzam. */
  playMusic(id: MusicTrackId): void {
    this.wanted = id;
    if (this.track?.id === id) return;
    if (!this.running) return; // começa quando o áudio destravar (ver unlock)
    this.startTrack(id);
  }

  stopMusic(): void {
    this.wanted = null;
    this.fadeOutTrack();
  }

  private startTrack(id: MusicTrackId): void {
    const ctx = this.ctx;
    const out = this.musicBus;
    if (!ctx || !out) return;
    this.fadeOutTrack();
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(SILENCE, ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(1, ctx.currentTime + MUSIC_FX.fadeInSeconds);
    bus.connect(out);
    // A melodia passa por um eco (atraso com realimentação) que dá o ar de salão vazio
    const leadIn = ctx.createGain();
    const delay = ctx.createDelay(AUDIO_FX.delayMaxSeconds);
    delay.delayTime.value = MUSIC_FX.echoSeconds;
    const feedback = ctx.createGain();
    feedback.gain.value = MUSIC_FX.echoFeedback;
    const wet = ctx.createGain();
    wet.gain.value = MUSIC_FX.echoWet;
    leadIn.connect(bus);
    leadIn.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(bus);
    this.track = {
      id,
      bus,
      leadIn,
      nextBarTime: ctx.currentTime + AUDIO_FX.startDelay,
      barIndex: 0,
    };
    this.timer ??= setInterval(() => this.tick(), MUSIC_FX.tickMs);
    this.tick();
  }

  private fadeOutTrack(): void {
    const ctx = this.ctx;
    const old = this.track;
    this.track = null;
    if (!ctx || !old) {
      this.clearTimer();
      return;
    }
    const end = ctx.currentTime + MUSIC_FX.fadeOutSeconds;
    old.bus.gain.cancelScheduledValues(ctx.currentTime);
    old.bus.gain.setValueAtTime(Math.max(SILENCE, old.bus.gain.value), ctx.currentTime);
    old.bus.gain.exponentialRampToValueAtTime(SILENCE, end);
    // As notas já agendadas morrem no fim da saída; depois solta o barramento
    window.setTimeout(() => old.bus.disconnect(), (MUSIC_FX.fadeOutSeconds + 2) * 1000);
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  /** Agenda os compassos que cabem na antecedência (os sons são criados com hora marcada). */
  private tick(): void {
    const ctx = this.ctx;
    const track = this.track;
    if (!ctx || !track || !this.running) return;
    const style = MUSIC_TRACKS[track.id];
    const barSeconds = barDurationSeconds(style);
    const beatSeconds = barSeconds / style.beatsPerBar;
    // Se a página travou e o relógio ficou para trás, recomeça de agora (senão tocaria tudo junto)
    if (track.nextBarTime < ctx.currentTime)
      track.nextBarTime = ctx.currentTime + AUDIO_FX.startDelay;
    while (track.nextBarTime < ctx.currentTime + MUSIC_FX.lookaheadSeconds) {
      for (const note of generateBar(style, track.barIndex, style.seed)) {
        this.playNote(
          ctx,
          track,
          note,
          track.nextBarTime + note.startBeat * beatSeconds,
          beatSeconds,
        );
      }
      track.nextBarTime += barSeconds;
      track.barIndex += 1;
    }
  }

  private playNote(
    ctx: AudioContext,
    track: PlayingTrack,
    note: MusicNote,
    start: number,
    beatSeconds: number,
  ): void {
    const voice = MUSIC_VOICES[note.voice];
    const length = note.durBeats * beatSeconds;
    const peak = voice.gain * note.velocity;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(SILENCE, start);
    gain.gain.linearRampToValueAtTime(peak, start + Math.min(voice.attack, length));
    gain.gain.setValueAtTime(peak, start + Math.max(0, length - AUDIO_FX.noteTailPad));
    gain.gain.exponentialRampToValueAtTime(SILENCE, start + length + voice.release);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = voice.cutoff;
    filter.connect(gain).connect(note.voice === 'lead' ? track.leadIn : track.bus);
    const detunes = voice.detuneCents > 0 ? [-voice.detuneCents, voice.detuneCents] : [0];
    for (const cents of detunes) {
      const osc = ctx.createOscillator();
      osc.type = voice.wave;
      osc.frequency.value = midiToFrequency(note.midi);
      osc.detune.value = cents;
      osc.connect(filter);
      osc.start(start);
      osc.stop(start + length + voice.release + AUDIO_FX.startDelay);
    }
  }
}

let instance: AudioSystem | null = null;

/** O áudio do jogo (um só por página). */
export function getAudio(): AudioSystem {
  instance ??= new AudioSystem(browserStorage(AUDIO_STORAGE.key));
  return instance;
}

/** Atalho para tocar um efeito. */
export function sfx(name: SfxName): void {
  getAudio().play(name);
}
