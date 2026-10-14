import Phaser from 'phaser';
import { PROP_FX } from '../data/fx';
import { createBox, type Box } from '../logic/geometry';
import { ENV_TEXTURE } from '../systems/environmentTextures';
import { PROP_CELL, PROP_FRAME, PROP_SHEET_KEY } from '../systems/propTextures';

export type PropKind = 'chest' | 'fire' | 'door';

/**
 * Objeto tocável do cenário: baú, fogueira de descanso ou porta do próximo bioma.
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

  /** (x, floorY): centro horizontal e altura do chão onde o objeto se apoia, em pixels. */
  constructor(scene: Phaser.Scene, kind: PropKind, x: number, floorY: number) {
    super(
      scene,
      x,
      floorY - PROP_FX.baseY + PROP_CELL / 2,
      PROP_SHEET_KEY,
      Prop.frameFor(kind, false),
    );
    this.kind = kind;
    scene.add.existing(this);
    this.setDepth(PROP_FX.depth);
    const reach = PROP_FX.reach;
    this.box.x = x - PROP_CELL / 2 + 8 - reach;
    this.box.y = floorY - 28 - reach;
    this.box.width = PROP_CELL - 16 + reach * 2;
    this.box.height = 28 + reach;
    // Brilho quente aditivo por cima do desenho (a luz de verdade é a da escuridão, na atmosfera)
    const look = PROP_FX[kind];
    this.glow = scene.add
      .image(x, floorY - 12, ENV_TEXTURE.glow)
      .setTint(look.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(PROP_FX.glowDepth)
      .setScale(look.radius / 64)
      .setAlpha(look.glowAlpha);
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.glow.destroy());
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
    }
  }

  /** Marca como usado e troca o desenho (baú aberto, fogueira apagada). */
  markUsed(): void {
    this.used = true;
    this.setFrame(Prop.frameFor(this.kind, true));
    this.glow.setVisible(this.kind === 'door');
  }

  update(dtMs: number): void {
    this.clockMs += dtMs;
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
