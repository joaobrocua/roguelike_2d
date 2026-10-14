import type Phaser from 'phaser';
import { DEPTH } from '../data/atmosphere';
import { PALETTE } from '../data/palette';
import { HUD, TEXT_COLORS } from '../data/ui';
import { panelImage } from './hudArt';
import { canvasTexture, mix, rect, type Ctx } from './pixelCanvas';
import { pixelText } from './pixelFont';

/**
 * Almas carregadas na run, embaixo da barra de vida: uma gema e o número. Ao ganhar almas o
 * número acende por um instante. (As almas só vão para a base ao passar de bioma ou vencer.)
 */
const GEM_KEY = 'hud-soul-gem';
const GEM = ['..#..', '.###.', '#####', '#####', '.###.', '..#..'] as const;

function drawGem(ctx: Ctx): void {
  const light = mix(PALETTE.soul, 0xffffff, 0.55);
  GEM.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '#') continue;
      const lit = (x + y) % 3 === 0 && y < 3;
      rect(
        ctx,
        lit ? light : y > 3 ? mix(PALETTE.soul, 0x000000, 0.35) : PALETTE.soul,
        x + 1,
        y + 1,
        1,
        1,
      );
    }
  });
  for (let y = 0; y < GEM.length; y++) {
    const row = GEM[y] ?? '';
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '#') continue;
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as const) {
        if (GEM[y + dy]?.[x + dx] !== '#') rect(ctx, PALETTE.void, x + 1 + dx, y + 1 + dy, 1, 1);
      }
    }
  }
}

/** Garante a textura da gema de alma e devolve a chave (também usada no Santuário). */
export function ensureSoulGem(scene: Phaser.Scene): string {
  canvasTexture(scene, GEM_KEY, GEM[0].length + 2, GEM.length + 2, drawGem);
  return GEM_KEY;
}

export class SoulCounter {
  private readonly text: Phaser.GameObjects.BitmapText;
  private readonly gem: Phaser.GameObjects.Image;
  private shown = -1;
  private flashMs = 0;

  constructor(scene: Phaser.Scene, souls: number) {
    const { x, y, width, height, gem, textX, textY } = HUD.souls;
    ensureSoulGem(scene);
    panelImage(scene, x, y, width, height);
    this.gem = scene.add
      .image(x + gem.x, y + gem.y, GEM_KEY)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud + 1);
    this.text = pixelText(scene, x + textX, y + textY, String(souls), {
      color: PALETTE.soul,
      depth: DEPTH.hud + 1,
      fixed: true,
    });
    this.shown = souls;
  }

  /** `dtMs` em tempo real; `souls` é o total carregado agora. */
  update(dtMs: number, souls: number): void {
    if (souls !== this.shown) {
      if (souls > this.shown) this.flashMs = HUD.souls.flashMs;
      this.shown = souls;
      this.text.setText(String(souls));
    }
    this.flashMs = Math.max(0, this.flashMs - dtMs);
    const lit = this.flashMs > 0;
    this.text.setTint(lit ? TEXT_COLORS.normal : PALETTE.soul);
    this.gem.setAlpha(lit ? 1 : 0.85);
  }
}
