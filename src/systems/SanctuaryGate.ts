import Phaser from 'phaser';
import { ATMOSPHERE, DEPTH } from '../data/atmosphere';
import { BIOME_LOOK } from '../data/biomeLook';
import type { BiomeId } from '../data/mapRules';
import { SANCTUARY_DECOR as D } from '../data/sanctuaryRoom';
import { TEXT_COLORS } from '../data/ui';
import { createBox, type Box } from '../logic/geometry';
import type { LightSource } from './AtmosphereSystem';
import { ENV_TEXTURE } from './environmentTextures';
import { pixelText } from './pixelFont';
import { ensureGateTextures, SANCTUARY_TEXTURE } from './sanctuaryArt';
import { TEXTURE } from './textures';

const HALF_GLOW = 64; // metade da textura de brilho (128 px)

/** O portal gigante da sala do santuário: o caminho para o próximo bioma (ou para a run nova). */
export class SanctuaryGate {
  /** Região em que o herói "entra" no portal (o jogo troca de sala quando ele a toca). */
  readonly box: Box = createBox();
  /** Luz que o portal solta, para a escuridão da sala abrir em volta dele. */
  readonly light: LightSource & { lightRadius: number; lightStrength: number };
  private readonly portal: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly keys: string[];
  private frame = 0;
  private clockMs = 0;

  /**
   * `x` é o centro do portal e `floorY` o chão; `dest` é o bioma do outro lado (dá a cor da
   * energia) e `label` o letreiro sobre o arco ("ATO II").
   */
  constructor(
    scene: Phaser.Scene,
    biome: BiomeId,
    dest: BiomeId,
    x: number,
    floorY: number,
    label: string,
  ) {
    const g = D.gate;
    ensureGateTextures(scene, biome, dest);
    const look = BIOME_LOOK[dest];
    const centerY = floorY - g.height / 2;
    this.keys = Array.from({ length: g.portalFrames }, (_, f) => SANCTUARY_TEXTURE.portal(dest, f));

    this.glow = scene.add
      .image(x, floorY - g.opening.bottom / 2 - 12, ENV_TEXTURE.glow)
      .setTint(look.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(g.light.radius / HALF_GLOW)
      .setAlpha(g.glowAlpha)
      .setDepth(DEPTH.warmGlow);
    this.portal = scene.add.image(x, centerY, this.keys[0] ?? '').setDepth(D.depth.portal);
    scene.add.image(x, centerY, SANCTUARY_TEXTURE.gate(biome, dest)).setDepth(D.depth.gate);
    pixelText(scene, x, floorY - g.height - g.labelDy, label, {
      color: TEXT_COLORS.normal,
      originX: 0.5,
      originY: 0.5,
      depth: D.depth.gate,
    });

    // Fagulhas da cor do destino subindo do vão
    scene.add
      .particles(0, 0, TEXTURE.spark, {
        frequency: g.sparks.frequencyMs,
        lifespan: g.sparks.lifespanMs,
        speedY: g.sparks.speedY,
        speedX: { min: -4, max: 4 },
        alpha: { start: g.sparks.alpha, end: 0 },
        scale: 1,
        tint: look.glow,
        blendMode: 'ADD',
        emitZone: {
          type: 'random',
          source: new Phaser.Geom.Rectangle(
            x - g.opening.width / 2 + 4,
            floorY - g.height + g.opening.bottom - 20,
            g.opening.width - 8,
            12,
          ),
        } as Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig,
      })
      .setDepth(DEPTH.warmGlow);

    this.light = {
      x,
      y: floorY - g.opening.bottom / 2,
      visible: true,
      lightRadius: g.light.radius,
      lightStrength: g.light.strength,
    };
    this.box.x = x - g.trigger.halfWidth;
    this.box.y = floorY - g.trigger.height;
    this.box.width = g.trigger.halfWidth * 2;
    this.box.height = g.trigger.height;
  }

  update(dtMs: number): void {
    const g = D.gate;
    this.clockMs += dtMs;
    const frame = Math.floor(this.clockMs / g.portalFrameMs) % g.portalFrames;
    if (frame !== this.frame) {
      this.frame = frame;
      this.portal.setTexture(this.keys[frame] ?? '');
    }
    const t = ATMOSPHERE.torch;
    const seconds = this.clockMs / 1000;
    const wave = Math.sin((this.clockMs / g.glowPulseMs) * Math.PI * 2);
    this.light.lightRadius =
      g.light.radius *
      (1 + t.flickerAmplitude * (0.6 * Math.sin(seconds * t.flickerSpeedA) + 0.4 * wave));
    this.glow.setAlpha(g.glowAlpha * (D.pulse.shaftBase + D.pulse.shaftSwing * wave));
  }
}
