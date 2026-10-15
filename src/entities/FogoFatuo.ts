import type Phaser from 'phaser';
import { FOGO_FATUO } from '../data/enemies';
import { createFlyer, updateFlyer } from '../logic/ai/flyer';
import { Enemy, type EnemyOptions, type EnemyWorld } from './Enemy';

/** Fogo-Fátuo: paira sobre o charco e mergulha depois de uma telegrafia; a chama ilumina a sala. */
export class FogoFatuo extends Enemy {
  private readonly ai = createFlyer();
  /** Alcance e força da luz que ele solta (a escuridão da sala abre em volta dele). */
  readonly lightRadius: number = FOGO_FATUO.light.radius;
  readonly lightStrength: number = FOGO_FATUO.light.strength;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    world: EnemyWorld,
    options?: EnemyOptions,
  ) {
    super(scene, x, y, FOGO_FATUO, world, options);
  }

  protected think(dtMs: number): void {
    updateFlyer(this.ai, this.out, this.sense, dtMs, FOGO_FATUO.ai);
  }

  protected override resetAi(): void {
    Object.assign(this.ai, createFlyer());
  }
}
