import type Phaser from 'phaser';
import { CORVO_CARNICEIRO } from '../data/enemies';
import { createStrafer, updateStrafer } from '../logic/ai/strafer';
import { Enemy, type EnemyOptions, type EnemyWorld } from './Enemy';

/** Corvo Carniceiro: espera de lado, no alto, e cruza a sala em rasante na altura do herói. */
export class CorvoCarniceiro extends Enemy {
  private readonly ai = createStrafer();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    world: EnemyWorld,
    options?: EnemyOptions,
  ) {
    super(scene, x, y, CORVO_CARNICEIRO, world, options);
  }

  protected think(dtMs: number): void {
    updateStrafer(this.ai, this.out, this.sense, dtMs, CORVO_CARNICEIRO.ai);
  }

  protected override resetAi(): void {
    Object.assign(this.ai, createStrafer());
  }
}
