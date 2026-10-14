import Phaser from 'phaser';
import { DEPTH } from '../data/atmosphere';
import { PROP_FX } from '../data/fx';
import { SHRINE } from '../data/rooms';
import { TEXT_COLORS } from '../data/ui';
import { createBox, type Box } from '../logic/geometry';
import { ENV_TEXTURE } from '../systems/environmentTextures';
import { ensureKeycap } from '../systems/hudArt';
import { pixelText } from '../systems/pixelFont';
import {
  PROP_CELL,
  PROP_FRAME,
  PROP_SHEET_KEY,
  SHRINE_BASE_ROW,
  SHRINE_CELL,
  SHRINE_FRAME,
  SHRINE_ORB_KEY,
  SHRINE_SHEET_KEY,
} from '../systems/propTextures';

export type PropKind = 'chest' | 'fire' | 'door' | 'shrine';

/**
 * Objeto tocável do cenário: baú, fogueira de descanso, porta do próximo bioma ou o altar do
 * santuário (este mostra o aviso "[E] SANTUÁRIO" quando o herói está perto).
 * O que cada um faz é decidido pela cena (ela lê `kind` e `used`).
 */
export class Prop extends Phaser.GameObjects.Image {
  readonly kind: PropKind;
  readonly box: Box = createBox();
  /** Já foi aberto/usado (baú aberto, fogueira apagada). */
  used = false;
  /** Identifica o objeto na run (ver propKey em logic/run.ts). */
  key = '';
  private clockMs = 0;
  private readonly glow: Phaser.GameObjects.Image;
  /** Aviso "[E] nome" (só o altar do santuário tem). */
  private readonly prompt: (Phaser.GameObjects.BitmapText | Phaser.GameObjects.Image)[] = [];
  private near = false;
  /** O orbe de almas que flutua sobre o altar (só o altar do santuário tem). */
  private readonly orb: Phaser.GameObjects.Image | null = null;
  private readonly orbY: number = 0;

  /** (x, floorY): centro horizontal e altura do chão onde o objeto se apoia, em pixels. */
  constructor(scene: Phaser.Scene, kind: PropKind, x: number, floorY: number) {
    const shrine = kind === 'shrine';
    super(
      scene,
      x,
      floorY -
        (shrine ? SHRINE_BASE_ROW : PROP_FX.baseY) +
        (shrine ? SHRINE_CELL.height : PROP_CELL) / 2,
      shrine ? SHRINE_SHEET_KEY : PROP_SHEET_KEY,
      Prop.frameFor(kind, false),
    );
    this.kind = kind;
    scene.add.existing(this);
    this.setDepth(PROP_FX.depth);
    const reach = PROP_FX.reach;
    // O altar é usado de cima dos degraus e de um pouco mais longe que os outros objetos
    const boxHeight = shrine ? SHRINE.boxHeight : 28;
    const below = shrine ? SHRINE.boxBelow : 0;
    const reachX = shrine ? SHRINE.reachX : reach;
    this.box.x = x - this.width / 2 + 8 - reachX;
    this.box.y = floorY - boxHeight - reach;
    this.box.width = this.width - 16 + reachX * 2;
    this.box.height = boxHeight + reach + below;
    // Brilho quente aditivo por cima do desenho (a luz de verdade é a da escuridão, na atmosfera)
    const look = PROP_FX[kind];
    this.glow = scene.add
      .image(x, floorY - (shrine ? SHRINE.glowDy : 12), ENV_TEXTURE.glow)
      .setTint(look.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(PROP_FX.glowDepth)
      .setScale(look.radius / 64)
      .setAlpha(look.glowAlpha);
    if (shrine) {
      this.orbY = floorY - SHRINE.orb.dy;
      this.orb = scene.add
        .image(x, this.orbY, SHRINE_ORB_KEY, SHRINE_FRAME)
        .setDepth(PROP_FX.depth + 0.01);
      const depth = DEPTH.hud - 1;
      this.prompt.push(
        pixelText(scene, x, floorY - SHRINE.promptDy.name, SHRINE.label, {
          color: TEXT_COLORS.normal,
          originX: 0.5,
          originY: 0.5,
          depth,
        }),
        scene.add.image(x, floorY - SHRINE.promptDy.key, ensureKeycap(scene, 'E')).setDepth(depth),
      );
      for (const item of this.prompt) item.setVisible(false);
    }
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.glow.destroy();
      this.orb?.destroy();
      for (const item of this.prompt) item.destroy();
    });
  }

  /** Alcance (px) da luz que o objeto solta agora: a fogueira apagada e o baú aberto não clareiam. */
  get lightRadius(): number {
    if (this.used && this.kind !== 'door') return 0;
    return PROP_FX[this.kind].radius;
  }

  get lightStrength(): number {
    return PROP_FX[this.kind].strength;
  }

  private static frameFor(kind: PropKind, used: boolean): string {
    switch (kind) {
      case 'chest':
        return used ? PROP_FRAME.chestOpen : PROP_FRAME.chestClosed;
      case 'fire':
        return used ? PROP_FRAME.fireOut : PROP_FRAME.fireOn0;
      case 'door':
        return PROP_FRAME.door;
      case 'shrine':
        return SHRINE_FRAME;
    }
  }

  /** O herói está perto o bastante para usar? Liga e desliga o aviso (só o altar tem aviso). */
  setNear(near: boolean): void {
    if (near === this.near) return;
    this.near = near;
    for (const item of this.prompt) item.setVisible(near);
  }

  /** Marca como usado e troca o desenho (baú aberto, fogueira apagada). */
  markUsed(): void {
    this.used = true;
    this.setFrame(Prop.frameFor(this.kind, true));
    this.glow.setVisible(this.kind === 'door');
  }

  update(dtMs: number): void {
    this.clockMs += dtMs;
    // O orbe de almas sobe e desce devagar
    this.orb?.setY(
      this.orbY + Math.sin((this.clockMs / SHRINE.orb.bobMs) * Math.PI * 2) * SHRINE.orb.bob,
    );
    const look = PROP_FX[this.kind];
    // O brilho respira devagar (a fogueira também treme mais depressa)
    const wave = Math.sin((this.clockMs / look.pulseMs) * Math.PI * 2);
    this.glow.setAlpha(look.glowAlpha * (0.85 + 0.15 * wave));
    if (this.kind !== 'fire' || this.used) return;
    this.setFrame(
      Math.floor(this.clockMs / PROP_FX.fireFrameMs) % 2 === 0
        ? PROP_FRAME.fireOn0
        : PROP_FRAME.fireOn1,
    );
  }
}
