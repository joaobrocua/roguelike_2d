import type Phaser from 'phaser';
import { SAPO_PECONHENTO } from '../data/enemies';
import { createHopper, updateHopper } from '../logic/ai/hopper';
import { Enemy, type EnemyOptions, type EnemyWorld } from './Enemy';

/** Sapo Peçonhento: dá pulinhos para manter a distância e cospe veneno em arco depois de inchar a papada. */
export class SapoPeconhento extends Enemy {
  private readonly ai = createHopper();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    world: EnemyWorld,
    options?: EnemyOptions,
  ) {
    super(scene, x, y, SAPO_PECONHENTO, world, options);
  }

  protected think(dtMs: number): void {
    updateHopper(this.ai, this.out, this.sense, dtMs, SAPO_PECONHENTO.ai);
  }

  protected override onFire(): void {
    const spit = SAPO_PECONHENTO.spit;
    this.world.arrows.fire(
      this.x + this.facing * (SAPO_PECONHENTO.width / 2),
      this.y + spit.spawnOffsetY,
      this.facing,
      spit,
    );
  }

  protected override resetAi(): void {
    Object.assign(this.ai, createHopper());
  }
}
