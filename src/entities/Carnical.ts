import type Phaser from 'phaser';
import { CARNICAL } from '../data/enemies';
import { createGroundMelee, updateGroundMelee } from '../logic/ai/groundMelee';
import { Enemy, type EnemyOptions, type EnemyWorld } from './Enemy';

/** Carniçal: patrulha, avança quando vê o jogador e golpeia de perto. */
export class Carnical extends Enemy {
  private readonly ai = createGroundMelee();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    world: EnemyWorld,
    options?: EnemyOptions,
  ) {
    super(scene, x, y, CARNICAL, world, options);
  }

  protected think(dtMs: number): void {
    updateGroundMelee(this.ai, this.out, this.sense, dtMs, CARNICAL.ai);
  }

  protected override resetAi(): void {
    Object.assign(this.ai, createGroundMelee());
  }
}
