import type Phaser from 'phaser';
import { VULTO } from '../data/enemies';
import { createFlyer, updateFlyer } from '../logic/ai/flyer';
import { Enemy, type EnemyOptions, type EnemyWorld } from './Enemy';

/** Vulto: flutua, atravessa plataformas e ataca em mergulho depois de uma telegrafia. */
export class Vulto extends Enemy {
  private readonly ai = createFlyer();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    world: EnemyWorld,
    options?: EnemyOptions,
  ) {
    super(scene, x, y, VULTO, world, options);
  }

  protected think(dtMs: number): void {
    updateFlyer(this.ai, this.out, this.sense, dtMs, VULTO.ai);
  }

  protected override resetAi(): void {
    Object.assign(this.ai, createFlyer());
  }
}
