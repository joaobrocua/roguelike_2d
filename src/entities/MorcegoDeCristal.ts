import type Phaser from 'phaser';
import { MORCEGO_DE_CRISTAL } from '../data/enemies';
import { createFlyer, updateFlyer } from '../logic/ai/flyer';
import { Enemy, type EnemyOptions, type EnemyWorld } from './Enemy';

/** Morcego de Cristal: paira nervoso e mergulha depois de dobrar as asas; os cristais iluminam. */
export class MorcegoDeCristal extends Enemy {
  private readonly ai = createFlyer();
  /** Alcance e força da luz dos cristais (a escuridão da sala abre em volta dele). */
  readonly lightRadius: number = MORCEGO_DE_CRISTAL.light.radius;
  readonly lightStrength: number = MORCEGO_DE_CRISTAL.light.strength;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    world: EnemyWorld,
    options?: EnemyOptions,
  ) {
    super(scene, x, y, MORCEGO_DE_CRISTAL, world, options);
  }

  protected think(dtMs: number): void {
    updateFlyer(this.ai, this.out, this.sense, dtMs, MORCEGO_DE_CRISTAL.ai);
  }

  protected override resetAi(): void {
    Object.assign(this.ai, createFlyer());
  }
}
