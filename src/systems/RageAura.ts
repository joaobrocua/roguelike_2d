import Phaser from 'phaser';
import { DEPTH } from '../data/atmosphere';
import { RAGE_AURA, type RageSpec } from '../data/boss';
import { ragePulse } from '../logic/rage';
import { ENV_TEXTURE } from './environmentTextures';
import { TEXTURE } from './textures';

const HALF_GLOW = 64; // metade da textura de brilho (128 px)

/**
 * A aura da fase 2 de um chefe: um brilho aditivo que pulsa atrás dele e brasas que sobem do corpo,
 * na cor de cada chefe (src/data/boss.ts). Nasce quando ele entra na fase 2 e some com ele.
 */
export class RageAura {
  private readonly glow: Phaser.GameObjects.Image;
  private readonly embers: Phaser.GameObjects.Particles.ParticleEmitter;
  private clockMs = 0;

  constructor(scene: Phaser.Scene, spec: RageSpec, bodyWidth: number, bodyHeight: number) {
    const size = Math.max(bodyWidth, bodyHeight) * RAGE_AURA.glowScale;
    this.glow = scene.add
      .image(0, 0, ENV_TEXTURE.glow)
      .setTint(spec.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(size / (HALF_GLOW * 2))
      .setAlpha(0)
      .setDepth(DEPTH.warmGlow);
    this.embers = scene.add
      .particles(0, 0, TEXTURE.spark, {
        lifespan: RAGE_AURA.emberLifeMs,
        speedY: RAGE_AURA.emberSpeedY,
        speedX: { min: -8, max: 8 },
        scale: { start: RAGE_AURA.emberScale, end: 0 },
        alpha: { start: 0.95, end: 0 },
        tint: [spec.emberColor, spec.color],
        blendMode: 'ADD',
        frequency: 1000 / spec.embersPerSecond,
        emitZone: {
          type: 'random',
          source: new Phaser.Geom.Rectangle(-bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight),
        } as Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig,
      })
      .setDepth(DEPTH.warmGlow);
  }

  /** `x` e `y` são o centro do corpo do chefe. */
  update(dtMs: number, x: number, y: number): void {
    this.clockMs += dtMs;
    this.glow
      .setPosition(x, y)
      .setAlpha(ragePulse(this.clockMs, RAGE_AURA.pulseMs, RAGE_AURA.alphaMin, RAGE_AURA.alphaMax));
    this.embers.setPosition(x, y);
  }

  destroy(): void {
    this.glow.destroy();
    this.embers.destroy();
  }
}
