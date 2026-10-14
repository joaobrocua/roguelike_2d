import Phaser from 'phaser';
import { ATMOSPHERE, DEPTH } from '../data/atmosphere';
import { BIOME_LOOK } from '../data/biomeLook';
import { PALETTE } from '../data/palette';
import type { BiomeId } from '../data/mapRules';
import { SANCTUARY_DECOR as D, SANCTUARY_LOOK } from '../data/sanctuaryRoom';
import type { LightSource } from './AtmosphereSystem';
import { ENV_TEXTURE } from './environmentTextures';
import {
  BRAZIER_FRAMES,
  CANDLE_FRAMES,
  ensureSanctuaryTextures,
  SANCTUARY_TEXTURE,
} from './sanctuaryArt';
import { TEXTURE } from './textures';

/** Uma chama (braseiro ou vela): o desenho, o brilho e a luz que ela solta na escuridão. */
interface Flame {
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  light: SanctuaryLight;
  baseRadius: number;
  glowScale: number;
  glowAlpha: number;
  frames: number;
  frameMs: number;
  clockMs: number;
  phase: number;
  /** Nome da textura de cada quadro e o quadro mostrado agora. */
  keys: string[];
  frame: number;
}

/** Luz que o santuário passa para a atmosfera (ver AtmosphereSystem.LightSource). */
type SanctuaryLight = LightSource & { lightRadius: number; lightStrength: number };

const HALF_GLOW = 64; // metade da textura de brilho (128 px)

/**
 * O cenário próprio da sala do santuário: colunas ao fundo, vitral com um feixe de luz sobre a
 * estátua, estandartes que balançam, braseiros e velas que tremem e iluminam, um círculo de
 * runas no chão e poeira subindo pelo feixe. Veste as cores do bioma. Os objetos são criados
 * uma vez; o update só muda quadro, brilho e luz.
 */
export class SanctuaryDecor {
  /** Luzes das chamas, para a escuridão da sala "abrir" em volta delas. */
  readonly lights: SanctuaryLight[] = [];
  private readonly flames: Flame[] = [];
  private readonly runes: Phaser.GameObjects.Image;
  private readonly shaft: Phaser.GameObjects.Image;
  private readonly halo: Phaser.GameObjects.Image;
  private clockMs = 0;

  constructor(scene: Phaser.Scene, biome: BiomeId) {
    ensureSanctuaryTextures(scene, biome);
    const look = BIOME_LOOK[biome];
    const sanct = SANCTUARY_LOOK[biome];
    const tex = SANCTUARY_TEXTURE;
    const depth = D.depth;

    // Colunas e vitral ficam ao fundo, atrás de tudo o que se move
    const pillarHeight = D.floorY - D.pillar.top;
    for (const x of D.pillars) {
      scene.add.image(x, D.pillar.top + pillarHeight / 2, tex.pillar(biome)).setDepth(depth.pillar);
    }
    const colossus = D.colossus;
    scene.add
      .image(colossus.x, colossus.top + colossus.height / 2, tex.colossus(biome))
      .setDepth(depth.colossus);
    // Brilho atrás da cabeça do anjo e a luz que ele solta na sala
    const headY = colossus.top + colossus.haloY;
    this.halo = scene.add
      .image(colossus.x, headY, ENV_TEXTURE.glow)
      .setTint(PALETTE.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(D.halo.radius / HALF_GLOW)
      .setAlpha(D.halo.alpha)
      .setDepth(depth.colossus + 0.1);
    this.lights.push({
      x: colossus.x,
      y: D.halo.light.y,
      visible: true,
      lightRadius: D.halo.light.radius,
      lightStrength: D.halo.light.strength,
    });
    const shaft = D.shaft;
    this.shaft = scene.add
      .image(colossus.x, (shaft.topY + shaft.bottomY) / 2, tex.shaft)
      .setDisplaySize(shaft.bottomWidth, shaft.bottomY - shaft.topY)
      .setTint(look.shaft)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(shaft.alpha)
      .setDepth(depth.shaft);
    scene.add
      .particles(0, 0, TEXTURE.spark, {
        frequency: D.motes.frequencyMs,
        lifespan: D.motes.lifespanMs,
        speedY: D.motes.speedY,
        speedX: { min: -D.motes.speedX, max: D.motes.speedX },
        alpha: { start: D.motes.alpha, end: 0 },
        scale: 1,
        tint: look.shaft,
        blendMode: 'ADD',
        emitZone: {
          type: 'random',
          source: new Phaser.Geom.Rectangle(
            colossus.x - D.motes.width / 2,
            shaft.bottomY - D.motes.zoneTop,
            D.motes.width,
            D.motes.zoneHeight,
          ),
        } as Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig,
      })
      .setDepth(DEPTH.warmGlow);

    // Círculo de runas no chão, em volta da escada
    const runes = D.runes;
    this.runes = scene.add
      .image(runes.x, runes.y, tex.runes)
      .setTint(sanct.rune)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(runes.alpha)
      .setDepth(depth.runes);

    // Estandartes pendurados do teto, balançando devagar (cada um com a sua fase)
    D.banners.forEach((x, i) => {
      const banner = scene.add
        .image(x, D.banner.top, tex.banner(biome))
        .setOrigin(0.5, 0)
        .setDepth(depth.banner)
        .setAngle(i === 0 ? -D.banner.swayDeg : D.banner.swayDeg);
      scene.tweens.add({
        targets: banner,
        angle: i === 0 ? D.banner.swayDeg : -D.banner.swayDeg,
        duration: D.banner.swayMs,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    });

    // Braseiros dos dois lados da escada e velas nos degraus
    const brazier = D.brazier;
    D.braziers.forEach((x, i) => {
      const y = D.floorY - brazier.centerDy; // centro do desenho (a base toca o chão)
      this.addFlame(scene, {
        x,
        y,
        glowY: D.floorY - brazier.glowDy,
        color: sanct.flame[1],
        light: brazier.light,
        glowAlpha: brazier.glowAlpha,
        frames: BRAZIER_FRAMES,
        frameMs: brazier.frameMs,
        keyOf: (frame) => tex.brazier(biome, frame),
        phase: i * D.flame.braziersPhase,
      });
    });
    const candle = D.candle;
    D.candles.forEach(([x, floor], i) => {
      this.addFlame(scene, {
        x: x ?? 0,
        y: (floor ?? 0) - candle.centerDy,
        glowY: (floor ?? 0) - candle.glowDy,
        color: sanct.flame[1],
        light: candle.light,
        glowAlpha: candle.glowAlpha,
        frames: CANDLE_FRAMES,
        frameMs: candle.frameMs,
        keyOf: (frame) => tex.candle(biome, frame),
        phase: i * D.flame.candlesPhase,
      });
    });
  }

  private addFlame(
    scene: Phaser.Scene,
    cfg: {
      x: number;
      y: number;
      glowY: number;
      color: number;
      light: { radius: number; strength: number };
      glowAlpha: number;
      frames: number;
      frameMs: number;
      keyOf: (frame: number) => string;
      phase: number;
    },
  ): void {
    const glowScale = cfg.light.radius / HALF_GLOW;
    // Os nomes das texturas são montados uma vez aqui (o update só troca de um para outro)
    const keys = Array.from({ length: cfg.frames }, (_, frame) => cfg.keyOf(frame));
    const light: SanctuaryLight = {
      x: cfg.x,
      y: cfg.glowY,
      visible: true,
      lightRadius: cfg.light.radius,
      lightStrength: cfg.light.strength,
    };
    this.lights.push(light);
    this.flames.push({
      sprite: scene.add.image(cfg.x, cfg.y, keys[0] ?? '').setDepth(D.depth.floorDecor),
      glow: scene.add
        .image(cfg.x, cfg.glowY, ENV_TEXTURE.glow)
        .setTint(cfg.color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(glowScale * D.flame.glowShrink)
        .setAlpha(cfg.glowAlpha)
        .setDepth(DEPTH.warmGlow),
      light,
      baseRadius: cfg.light.radius,
      glowScale,
      glowAlpha: cfg.glowAlpha,
      frames: cfg.frames,
      frameMs: cfg.frameMs,
      clockMs: cfg.phase * D.flame.startClockMs,
      frame: 0,
      phase: cfg.phase,
      keys,
    });
  }

  update(dtMs: number): void {
    this.clockMs += dtMs;
    const seconds = this.clockMs / 1000;
    for (const flame of this.flames) {
      flame.clockMs += dtMs;
      const frame = Math.floor(flame.clockMs / flame.frameMs) % flame.frames;
      if (frame !== flame.frame) {
        flame.frame = frame;
        flame.sprite.setTexture(flame.keys[frame] ?? '');
      }
      // Duas ondas somadas: a luz treme sem repetir o ritmo
      const t = ATMOSPHERE.torch;
      const wobble =
        1 +
        t.flickerAmplitude *
          (0.6 * Math.sin(seconds * t.flickerSpeedA + flame.phase) +
            0.4 * Math.sin(seconds * t.flickerSpeedB + flame.phase * 2.3));
      flame.light.lightRadius = flame.baseRadius * wobble;
      flame.glow.setScale(flame.glowScale * D.flame.glowShrink * wobble);
      flame.glow.setAlpha(flame.glowAlpha * wobble);
    }
    const pulse = 0.5 + 0.5 * Math.sin((this.clockMs / D.runes.pulseMs) * Math.PI * 2);
    const p = D.pulse;
    this.runes.setAlpha(D.runes.alpha * (p.runesBase + p.runesSwing * pulse));
    this.halo.setAlpha(
      D.halo.alpha * (p.shaftBase + p.shaftSwing * Math.sin(seconds * p.shaftSpeed + 1)),
    );
    this.shaft.setAlpha(
      D.shaft.alpha * (p.shaftBase + p.shaftSwing * Math.sin(seconds * p.shaftSpeed)),
    );
  }
}
