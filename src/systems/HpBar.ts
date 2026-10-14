import Phaser from 'phaser';
import { DEPTH } from '../data/atmosphere';
import { PALETTE } from '../data/palette';
import { HUD, TEXT_COLORS } from '../data/ui';
import { clampFraction, trailFraction } from '../logic/gauge';
import { ensureGauge } from './gaugeArt';
import { panelImage } from './hudArt';
import { canvasTexture, rect } from './pixelCanvas';
import { pixelText } from './pixelFont';

/**
 * Vida do jogador, no canto superior esquerdo: painel de pedra com o coração, a barra com
 * moldura, marcas e brilho, os números e um rastro claro que demora a alcançar a vida nova
 * (mostra o tamanho do dano). Abaixo de um quarto de vida a barra e o coração pulsam.
 */
const HEART_KEY = 'hud-hp-heart';
const HEART = [
  '.XX...XX.',
  'XXXX.XXXX',
  'XXXXXXXXX',
  'XXXXXXXXX',
  '.XXXXXXX.',
  '..XXXXX..',
  '...XXX...',
  '....X....',
] as const;
const HEART_SIZE = { width: 11, height: 10 } as const;

function drawHeart(ctx: CanvasRenderingContext2D): void {
  HEART.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== 'X') continue;
      const lit = y < 2 && x < 4;
      rect(ctx, lit ? 0xe8627a : y > 4 ? PALETTE.bloodDark : PALETTE.blood, x + 1, y + 1, 1, 1);
    }
  });
  // Contorno escuro
  for (let y = 0; y < HEART.length; y++) {
    const row = HEART[y] ?? '';
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== 'X') continue;
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as const) {
        const near = HEART[y + dy]?.[x + dx];
        if (near !== 'X') rect(ctx, PALETTE.void, x + 1 + dx, y + 1 + dy, 1, 1);
      }
    }
  }
}

export class HpBar {
  private readonly ghost: Phaser.GameObjects.Image;
  private readonly fill: Phaser.GameObjects.Image;
  private readonly heart: Phaser.GameObjects.Image;
  private readonly numbers: Phaser.GameObjects.BitmapText;
  private ghostFraction: number;
  private clockMs = 0;
  private shownHp = -1;

  /** `hp` é a vida ao criar a barra: o rastro já nasce nela (entrar numa sala não é levar dano). */
  constructor(
    scene: Phaser.Scene,
    private readonly maxHp: number,
    hp: number,
  ) {
    this.ghostFraction = clampFraction(hp / maxHp);
    const { plate, heart, bar, text } = HUD.hp;
    const keys = ensureGauge(scene, {
      prefix: 'hud-hp',
      width: bar.width,
      height: bar.height,
      border: bar.border,
      divisions: 5,
    });
    canvasTexture(scene, HEART_KEY, HEART_SIZE.width, HEART_SIZE.height, drawHeart);

    panelImage(scene, plate.x, plate.y, plate.width, plate.height);
    const create = (key: string, x: number, y: number, depth: number) =>
      scene.add.image(x, y, key).setOrigin(0, 0).setScrollFactor(0).setDepth(depth);
    const inner = { x: bar.x + bar.border, y: bar.y + bar.border };
    this.heart = create(HEART_KEY, heart.x, heart.y, DEPTH.hud + 1);
    create(keys.frame, bar.x, bar.y, DEPTH.hud + 1);
    this.ghost = create(keys.ghost, inner.x, inner.y, DEPTH.hud + 1.1);
    this.fill = create(keys.fill, inner.x, inner.y, DEPTH.hud + 1.2);
    create(keys.marks, inner.x, inner.y, DEPTH.hud + 1.3);
    this.numbers = pixelText(scene, text.x, text.y, `${Math.ceil(hp)}/${maxHp}`, {
      color: TEXT_COLORS.dim,
      depth: DEPTH.hud + 1,
      fixed: true,
    });
    this.shownHp = Math.ceil(hp);
  }

  /** `dtMs` em tempo real (o rastro e o pulso seguem rodando em câmera lenta); `hp` é a vida atual. */
  update(dtMs: number, hp: number): void {
    const { bar, ghostDelayRate, lowFraction, pulseMs, pulseDepth } = HUD.hp;
    this.clockMs += dtMs;
    const f = clampFraction(hp / this.maxHp);
    this.fill.setCrop(0, 0, Math.round(bar.width * f), bar.height);
    this.ghostFraction = trailFraction(this.ghostFraction, f, ghostDelayRate, dtMs);
    this.ghost.setCrop(0, 0, Math.round(bar.width * this.ghostFraction), bar.height);
    const low = f > 0 && f <= lowFraction;
    const wave = Math.sin((this.clockMs / pulseMs) * Math.PI * 2);
    const pulse = low ? 1 - pulseDepth * (0.5 + 0.5 * wave) : 1;
    this.fill.setAlpha(pulse);
    this.heart.setAlpha(pulse);

    const whole = Math.ceil(hp);
    if (whole !== this.shownHp) {
      this.shownHp = whole;
      this.numbers.setText(`${whole}/${this.maxHp}`);
      this.numbers.setTint(low ? TEXT_COLORS.danger : TEXT_COLORS.dim);
    }
  }
}
