import type Phaser from 'phaser';
import { ARQUEIRO_OCO } from '../data/enemies';
import { createRanged, updateRanged } from '../logic/ai/ranged';
import { Enemy, type EnemyOptions, type EnemyWorld } from './Enemy';

/** Arqueiro Oco: mantém distância e atira flechas depois de mirar (telegrafia). */
export class ArqueiroOco extends Enemy {
  private readonly ai = createRanged();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    world: EnemyWorld,
    options?: EnemyOptions,
  ) {
    super(scene, x, y, ARQUEIRO_OCO, world, options);
  }

  protected think(dtMs: number): void {
    updateRanged(this.ai, this.out, this.sense, dtMs, ARQUEIRO_OCO.ai);
  }

  protected override onFire(): void {
    const arrow = ARQUEIRO_OCO.arrow;
    this.world.arrows.fire(
      this.x + this.facing * (ARQUEIRO_OCO.width / 2),
      this.y + arrow.spawnOffsetY,
      this.facing,
      arrow,
    );
  }

  protected override resetAi(): void {
    Object.assign(this.ai, createRanged());
  }
}
