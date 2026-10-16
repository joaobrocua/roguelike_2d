import type Phaser from 'phaser';
import { GOLEM_DE_PEDRA } from '../data/enemies';
import { createGroundMelee, updateGroundMelee } from '../logic/ai/groundMelee';
import { Enemy, type EnemyOptions, type EnemyWorld } from './Enemy';

/** Golem de Pedra: caminha devagar até o herói e bate no chão com uma onda em volta de si. */
export class GolemDePedra extends Enemy {
  private readonly ai = createGroundMelee();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    world: EnemyWorld,
    options?: EnemyOptions,
  ) {
    super(scene, x, y, GOLEM_DE_PEDRA, world, options);
  }

  protected think(dtMs: number): void {
    updateGroundMelee(this.ai, this.out, this.sense, dtMs, GOLEM_DE_PEDRA.ai);
  }

  protected override resetAi(): void {
    Object.assign(this.ai, createGroundMelee());
  }
}
