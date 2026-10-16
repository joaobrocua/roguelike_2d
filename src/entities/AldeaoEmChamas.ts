import type Phaser from 'phaser';
import { ALDEAO_EM_CHAMAS } from '../data/enemies';
import { createGroundMelee, updateGroundMelee } from '../logic/ai/groundMelee';
import { Enemy, type EnemyOptions, type EnemyWorld } from './Enemy';

/** Aldeão em Chamas: corre em pânico até o herói e se agarra a ele; a chama ilumina a sala. */
export class AldeaoEmChamas extends Enemy {
  private readonly ai = createGroundMelee();
  /** Alcance e força da luz da chama (a escuridão da sala abre em volta dele). */
  readonly lightRadius: number = ALDEAO_EM_CHAMAS.light.radius;
  readonly lightStrength: number = ALDEAO_EM_CHAMAS.light.strength;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    world: EnemyWorld,
    options?: EnemyOptions,
  ) {
    super(scene, x, y, ALDEAO_EM_CHAMAS, world, options);
  }

  protected think(dtMs: number): void {
    updateGroundMelee(this.ai, this.out, this.sense, dtMs, ALDEAO_EM_CHAMAS.ai);
  }

  protected override resetAi(): void {
    Object.assign(this.ai, createGroundMelee());
  }
}
