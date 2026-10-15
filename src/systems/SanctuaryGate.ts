import Phaser from 'phaser';
import { ATMOSPHERE, DEPTH } from '../data/atmosphere';
import { BIOME_LOOK } from '../data/biomeLook';
import type { BiomeId } from '../data/mapRules';
import { PALETTE } from '../data/palette';
import { SANCTUARY_DECOR as D } from '../data/sanctuaryRoom';
import { PIXEL_FONT, TEXT_COLORS } from '../data/ui';
import { createBox, type Box } from '../logic/geometry';
import type { LightSource } from './AtmosphereSystem';
import { ENV_TEXTURE } from './environmentTextures';
import { pixelText } from './pixelFont';
import { ensureGateTextures, SANCTUARY_TEXTURE } from './sanctuaryArt';
import { TEXTURE } from './textures';

const HALF_GLOW = 64; // metade da textura de brilho (128 px)

/**
 * A passagem da sala do santuário: um arco de pedra aberto para a região seguinte, com a paisagem
 * dela do outro lado (o mesmo fundo do jogo, uma estrada que some no horizonte) e uma placa de
 * madeira com o nome do lugar. Nada de mágica: é um caminho. A luz de fora entra pelo arco.
 */
export class SanctuaryGate {
  /** Região em que o herói "entra" na passagem (o jogo troca de sala quando ele a toca). */
  readonly box: Box = createBox();
  /** A área que fica do outro lado desta passagem. */
  readonly dest: BiomeId;
  /** Luz que entra pelo arco, para a escuridão da sala abrir em volta dele. */
  readonly light: LightSource & { lightRadius: number; lightStrength: number };
  private readonly glow: Phaser.GameObjects.Image;
  private clockMs = 0;

  /**
   * `x` é o centro da passagem e `floorY` o chão; `dest` é a área do outro lado (dá a paisagem e
   * a cor da luz) e `label` o texto da placa ("ATO II" ou o nome da área).
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
    this.dest = dest;
    ensureGateTextures(scene, biome, dest);
    const look = BIOME_LOOK[dest];
    const centerY = floorY - g.height / 2;

    this.glow = scene.add
      .image(x, floorY - g.opening.bottom / 2 - 12, ENV_TEXTURE.glow)
      .setTint(look.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(g.light.radius / HALF_GLOW)
      .setAlpha(g.glowAlpha)
      .setDepth(DEPTH.warmGlow);
    scene.add.image(x, centerY, SANCTUARY_TEXTURE.view(dest)).setDepth(D.depth.view);
    scene.add.image(x, centerY, SANCTUARY_TEXTURE.gate(biome)).setDepth(D.depth.gate);
    this.addSign(scene, x, floorY - g.height - g.labelDy, label);

    // Poeira e vaga-lumes da região que entram pelo arco
    scene.add
      .particles(0, 0, TEXTURE.spark, {
        frequency: g.dust.frequencyMs,
        lifespan: g.dust.lifespanMs,
        speedY: g.dust.speedY,
        speedX: { min: -g.dust.speedX, max: g.dust.speedX },
        alpha: { start: g.dust.alpha, end: 0 },
        scale: 1,
        tint: look.glow,
        blendMode: 'ADD',
        emitZone: {
          type: 'random',
          source: new Phaser.Geom.Rectangle(
            x - g.opening.width / 2 + 4,
            floorY - g.height + g.opening.bottom - 50,
            g.opening.width - 8,
            40,
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

  /** Uma placa de madeira pendurada por duas correntes, com o nome do lugar. */
  private addSign(scene: Phaser.Scene, x: number, y: number, label: string): void {
    const g = D.gate.sign;
    const width = label.length * PIXEL_FONT.glyphSize + g.padX * 2;
    const left = Math.round(x - width / 2);
    const top = Math.round(y - g.height / 2);
    const depth = D.depth.gate;
    scene.add
      .rectangle(left - 1, top - 1, width + 2, g.height + 2, PALETTE.void)
      .setOrigin(0, 0)
      .setDepth(depth);
    scene.add.rectangle(left, top, width, g.height, g.wood).setOrigin(0, 0).setDepth(depth);
    scene.add.rectangle(left, top, width, 1, g.woodLight).setOrigin(0, 0).setDepth(depth);
    scene.add
      .rectangle(left, top + g.height - 1, width, 1, g.woodDark)
      .setOrigin(0, 0)
      .setDepth(depth);
    for (const cx of [left + 3, left + width - 4]) {
      scene.add
        .rectangle(cx, top + g.height, 1, g.chain, PALETTE.stoneLight)
        .setOrigin(0, 0)
        .setDepth(depth);
      scene.add
        .rectangle(cx, top + 2, 1, 1, PALETTE.deep)
        .setOrigin(0, 0)
        .setDepth(depth + 0.01);
    }
    pixelText(scene, x, top + g.height / 2, label, {
      color: TEXT_COLORS.normal,
      originX: 0.5,
      originY: 0.5,
      depth: depth + 0.02,
    });
  }

  update(dtMs: number): void {
    const g = D.gate;
    this.clockMs += dtMs;
    const t = ATMOSPHERE.torch;
    const seconds = this.clockMs / 1000;
    const wave = Math.sin((this.clockMs / g.glowPulseMs) * Math.PI * 2);
    // A luz de fora oscila de leve (nuvens, folhas), bem menos que uma chama
    this.light.lightRadius =
      g.light.radius * (1 + t.flickerAmplitude * 0.5 * Math.sin(seconds * 0.9));
    this.glow.setAlpha(g.glowAlpha * (D.pulse.shaftBase + D.pulse.shaftSwing * wave));
  }
}
