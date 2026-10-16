import type Phaser from 'phaser';
import { NECROMANTE, NECROMANTE_ORBS } from '../data/enemies';
import { createRanged, updateRanged } from '../logic/ai/ranged';
import { Enemy, type EnemyOptions, type EnemyWorld } from './Enemy';

/** Necromante: mantém distância e, depois de erguer o cajado, solta três orbes em leque. */
export class Necromante extends Enemy {
  private readonly ai = createRanged();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    world: EnemyWorld,
    options?: EnemyOptions,
  ) {
    super(scene, x, y, NECROMANTE, world, options);
  }

  protected think(dtMs: number): void {
    updateRanged(this.ai, this.out, this.sense, dtMs, NECROMANTE.ai);
  }

  protected override onFire(): void {
    const x = this.x + this.facing * (NECROMANTE.width / 2);
    for (const orb of NECROMANTE_ORBS) {
      this.world.arrows.fire(x, this.y + orb.spawnOffsetY, this.facing, orb);
    }
  }

  protected override resetAi(): void {
    Object.assign(this.ai, createRanged());
  }
}
