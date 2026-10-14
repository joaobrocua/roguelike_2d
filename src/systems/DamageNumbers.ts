import type Phaser from 'phaser';
import { DEPTH } from '../data/atmosphere';
import { DAMAGE_NUMBER_FX } from '../data/fx';
import { easeOutQuad, lifeProgress } from '../logic/floatingText';
import { pixelText } from './pixelFont';

/**
 * Números de dano flutuantes, na fonte de pixels (nítidos). Os textos são criados uma vez
 * (pool) e reaproveitados, então o update não aloca nada.
 */
export class DamageNumbers {
  private readonly texts: Phaser.GameObjects.BitmapText[] = [];
  private readonly ages: number[] = [];
  private readonly startY: number[] = [];
  private next = 0;

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < DAMAGE_NUMBER_FX.poolSize; i++) {
      const text = pixelText(scene, 0, 0, '', {
        originX: 0.5,
        originY: 0.5,
        depth: DEPTH.numbers,
      }).setVisible(false);
      this.texts.push(text);
      this.ages.push(0);
      this.startY.push(0);
    }
  }

  /** Mostra um número em (x, y). Se o pool estiver cheio, reaproveita o mais antigo. */
  spawn(x: number, y: number, value: number, color: number, size = 1): void {
    const i = this.next;
    this.next = (this.next + 1) % this.texts.length;
    const text = this.texts[i];
    if (!text) return;
    text.setText(String(value));
    text.setTint(color);
    text.setScale(size); // sempre inteiro: o pixel do texto tem o mesmo tamanho do resto
    text.setPosition(x, y);
    text.setAlpha(1);
    text.setVisible(true);
    this.ages[i] = 0;
    this.startY[i] = y;
  }

  update(dtMs: number): void {
    for (let i = 0; i < this.texts.length; i++) {
      const text = this.texts[i];
      if (!text || !text.visible) continue;
      const age = (this.ages[i] ?? 0) + dtMs;
      this.ages[i] = age;
      const progress = lifeProgress(age, DAMAGE_NUMBER_FX.lifeMs);
      text.setY((this.startY[i] ?? 0) - DAMAGE_NUMBER_FX.risePx * easeOutQuad(progress));
      text.setAlpha(1 - progress * progress);
      if (progress >= 1) text.setVisible(false);
    }
  }
}
