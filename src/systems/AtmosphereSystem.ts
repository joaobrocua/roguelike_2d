import Phaser from 'phaser';
import { ATMOSPHERE, DECOR_MARKERS, DEPTH } from '../data/atmosphere';
import { GAME_SIZE } from '../data/balance';
import { BIOME_LOOK, type BiomeLook } from '../data/biomeLook';
import type { BiomeId } from '../data/mapRules';
import { PALETTE } from '../data/palette';
import { TILE_SIZE } from '../data/rooms';
import type { ParsedRoom } from '../logic/roomParser';
import { backgroundKey, ENV_TEXTURE } from './environmentTextures';
import { TEXTURE } from './textures';

/** Uma tocha acesa: sprite da chama, brilho quente e o relógio da sua oscilação. */
interface Torch {
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  /** Fase própria, para as tochas não piscarem todas juntas. */
  phase: number;
  frameClockMs: number;
  emberClockMs: number;
  nextEmberMs: number;
}

/** O mínimo que um objeto precisa ter para iluminar a sua volta. */
export interface LightSource {
  x: number;
  y: number;
  visible: boolean;
  /** Alcance e força próprios (px); sem eles vale a luz fraca padrão dos inimigos. */
  lightRadius?: number;
  lightStrength?: number;
}

const HALF_GLOW = 64; // metade do tamanho da textura de brilho (128 px)
const TORCH_FRAMES = [
  ENV_TEXTURE.torchA,
  ENV_TEXTURE.torchB,
  ENV_TEXTURE.torchC,
  ENV_TEXTURE.torchB,
];

/**
 * Atmosfera da sala: fundo em camadas com parallax, névoa, tochas com luz que oscila,
 * escuridão ambiente (com "buracos" de luz), cinzas, brasas e vinheta. Todos os valores
 * vêm de src/data/atmosphere.ts. O update só mexe em objetos já criados.
 */
export class AtmosphereSystem {
  private readonly far: Phaser.GameObjects.Image;
  private readonly mid: Phaser.GameObjects.Image;
  private readonly near: Phaser.GameObjects.Image;
  private readonly fogBack: Phaser.GameObjects.TileSprite;
  private readonly fogFront: Phaser.GameObjects.TileSprite;
  private readonly darkness: Phaser.GameObjects.RenderTexture;
  private readonly lightBrush: Phaser.GameObjects.Image;
  private readonly embers: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly torches: Torch[] = [];
  private clockMs = 0;
  private readonly roomWidthPx: number;
  private readonly look: BiomeLook;

  constructor(
    private readonly scene: Phaser.Scene,
    room: ParsedRoom,
    /** Grupos de fontes de luz que mudam durante a sala (inimigos, objetos): posição e visibilidade. */
    private readonly lightGroups: readonly (readonly LightSource[])[],
    biome: BiomeId,
    /** Opacidade da escuridão ambiente (cada bioma tem a sua). */
    private readonly darknessAlpha: number = ATMOSPHERE.darkness.alpha,
  ) {
    this.look = BIOME_LOOK[biome];
    const { width, height } = GAME_SIZE;
    this.roomWidthPx = room.cols * TILE_SIZE;
    const layerX = width / 2;
    const layerY = height / 2;

    this.far = scene.add
      .image(layerX, layerY, backgroundKey(biome, 'far'))
      .setScrollFactor(0)
      .setDepth(DEPTH.bgFar);
    this.mid = scene.add
      .image(layerX, layerY, backgroundKey(biome, 'mid'))
      .setScrollFactor(0)
      .setDepth(DEPTH.bgMid);
    this.near = scene.add
      .image(layerX, layerY, backgroundKey(biome, 'near'))
      .setScrollFactor(0)
      .setDepth(DEPTH.bgNear);

    const fog = ATMOSPHERE.fog;
    this.fogBack = scene.add
      .tileSprite(0, fog.back.y, width, fog.back.height, ENV_TEXTURE.fog)
      .setOrigin(0, 0)
      .setTint(this.look.fog)
      .setAlpha(fog.back.alpha)
      .setScrollFactor(0)
      .setDepth(DEPTH.fogBack);
    this.fogFront = scene.add
      .tileSprite(0, fog.front.y, width, fog.front.height, ENV_TEXTURE.fog)
      .setOrigin(0, 0)
      .setTint(this.look.fog)
      .setAlpha(fog.front.alpha)
      .setScrollFactor(0)
      .setDepth(DEPTH.fogFront);

    this.createAsh();
    this.embers = scene.add
      .particles(0, 0, TEXTURE.spark, {
        lifespan: 1100,
        speedY: { min: -34, max: -16 },
        speedX: { min: -6, max: 6 },
        scale: { start: 1.2, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: [PALETTE.glow, PALETTE.ember],
        emitting: false,
      })
      .setDepth(DEPTH.warmGlow);

    for (const marker of room.markers) {
      if (!(marker.char in DECOR_MARKERS)) continue;
      this.torches.push(
        this.createTorch(marker.col * TILE_SIZE + TILE_SIZE / 2, marker.row * TILE_SIZE + 8),
      );
    }

    // Escuridão: uma textura do tamanho da tela, refeita a cada frame
    this.darkness = scene.add
      .renderTexture(0, 0, width, height)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.darkness);
    this.lightBrush = scene.add.image(0, 0, ENV_TEXTURE.glow).setVisible(false);

    scene.add
      .image(0, 0, ENV_TEXTURE.vignette)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.vignette);
  }

  /**
   * `focusX/focusY`: posição do jogador (a luz do jogador o acompanha); `scrollX/scrollY`: rolagem
   * da câmera (o parallax desliza em sentido contrário e as luzes do mundo viram coordenadas de tela). `dtMs` segue o tempo do jogo (para na pausa e fica lento na esquiva).
   */
  update(dtMs: number, focusX: number, focusY: number, scrollX: number, scrollY: number): void {
    this.clockMs += dtMs;
    const seconds = this.clockMs / 1000;

    // Parallax: cada camada desliza um pouco contra o deslocamento do jogador
    // (a câmera rola em salas maiores que a tela; o centro da vista em relação ao centro da sala)
    const shift = scrollX + GAME_SIZE.width / 2 - this.roomWidthPx / 2;
    const { far, mid, near } = ATMOSPHERE.parallax;
    const center = GAME_SIZE.width / 2;
    this.far.x = center - shift * far;
    this.mid.x = center - shift * mid;
    this.near.x = center - shift * near;

    // Névoa deslizando
    const fog = ATMOSPHERE.fog;
    this.fogBack.tilePositionX += fog.back.speed * (dtMs / 1000);
    this.fogFront.tilePositionX += fog.front.speed * (dtMs / 1000);

    this.updateTorches(dtMs, seconds);
    this.redrawDarkness(focusX, focusY, scrollX, scrollY);
  }

  private createAsh(): void {
    const { frequencyMs, lifespanMs, speedMin, speedMax, alpha } = ATMOSPHERE.ash;
    this.scene.add
      .particles(0, 0, TEXTURE.spark, {
        frequency: frequencyMs,
        lifespan: lifespanMs,
        speedY: { min: speedMin, max: speedMax },
        speedX: { min: -8, max: 4 },
        alpha: { start: alpha, end: 0 },
        scale: 1,
        tint: PALETTE.bone,
        emitZone: {
          type: 'random',
          source: new Phaser.Geom.Rectangle(0, -8, GAME_SIZE.width, 6),
        } as Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.fogFront);
  }

  private createTorch(x: number, y: number): Torch {
    const phase = (x * 0.37 + y * 0.91) % (Math.PI * 2);
    return {
      x,
      y,
      phase,
      sprite: this.scene.add.image(x, y, ENV_TEXTURE.torchA).setDepth(DEPTH.torch),
      glow: this.scene.add
        .image(x, y - 4, ENV_TEXTURE.glow)
        .setTint(PALETTE.glow)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(ATMOSPHERE.torch.glowAlpha)
        .setDepth(DEPTH.warmGlow),
      frameClockMs: phase * 100,
      emberClockMs: 0,
      nextEmberMs: ATMOSPHERE.torch.emberMinMs,
    };
  }

  /** Oscilação suave e irregular da luz: duas ondas somadas, com fase própria por tocha. */
  private flicker(seconds: number, phase: number): number {
    const t = ATMOSPHERE.torch;
    return (
      1 +
      t.flickerAmplitude *
        (0.6 * Math.sin(seconds * t.flickerSpeedA + phase) +
          0.4 * Math.sin(seconds * t.flickerSpeedB + phase * 2.3))
    );
  }

  private updateTorches(dtMs: number, seconds: number): void {
    const t = ATMOSPHERE.torch;
    for (const torch of this.torches) {
      torch.frameClockMs += dtMs;
      const frame = Math.floor(torch.frameClockMs / t.frameMs) % TORCH_FRAMES.length;
      torch.sprite.setTexture(TORCH_FRAMES[frame] ?? ENV_TEXTURE.torchA);

      const scale = (t.radius / HALF_GLOW) * this.flicker(seconds, torch.phase);
      torch.glow.setScale(scale * 0.8);
      torch.glow.setAlpha(t.glowAlpha * this.flicker(seconds, torch.phase));

      torch.emberClockMs += dtMs;
      if (torch.emberClockMs >= torch.nextEmberMs) {
        torch.emberClockMs = 0;
        torch.nextEmberMs = t.emberMinMs + Math.random() * (t.emberMaxMs - t.emberMinMs);
        this.embers.emitParticleAt(torch.x + (Math.random() - 0.5) * 3, torch.y - 6, 1);
      }
    }
  }

  /** Escurece a tela inteira e "apaga" a escuridão em volta das tochas e do jogador. */
  private redrawDarkness(focusX: number, focusY: number, scrollX: number, scrollY: number): void {
    const rt = this.darkness;
    rt.clear();
    rt.fill(this.look.ambient, this.darknessAlpha);

    const seconds = this.clockMs / 1000;
    const t = ATMOSPHERE.torch;
    for (const torch of this.torches) {
      const scale = (t.radius / HALF_GLOW) * this.flicker(seconds, torch.phase);
      this.lightBrush.setScale(scale).setAlpha(t.strength);
      rt.erase(this.lightBrush, torch.x - scrollX, torch.y - 4 - scrollY);
    }

    const e = ATMOSPHERE.enemyLight;
    for (const group of this.lightGroups) {
      for (const light of group) {
        if (!light.visible) continue;
        const radius = light.lightRadius ?? e.radius;
        if (radius <= 0) continue;
        this.lightBrush.setScale(radius / HALF_GLOW).setAlpha(light.lightStrength ?? e.strength);
        rt.erase(this.lightBrush, light.x - scrollX, light.y - scrollY);
      }
    }

    const p = ATMOSPHERE.playerLight;
    this.lightBrush.setScale(p.radius / HALF_GLOW).setAlpha(p.strength);
    rt.erase(this.lightBrush, focusX - scrollX, focusY - scrollY);
  }
}
