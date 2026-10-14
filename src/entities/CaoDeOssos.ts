import type Phaser from 'phaser';
import { CAO_DE_OSSOS } from '../data/enemies';
import { createGroundMelee, updateGroundMelee } from '../logic/ai/groundMelee';
import {
  canAcquireAttack,
  releaseAttack,
  tryAcquireAttack,
  type PackState,
} from '../logic/ai/pack';
import { Enemy, type EnemyOptions, type EnemyWorld } from './Enemy';

export interface PackOptions extends EnemyOptions {
  /** Bando compartilhado: só alguns cães atacam ao mesmo tempo. */
  pack: PackState;
  /** Identifica este cão dentro do bando (precisa ser único e >= 0). */
  packId: number;
}

/** Cão de Ossos: rápido, persegue e dá botes; em bando, os ataques são escalonados. */
export class CaoDeOssos extends Enemy {
  private readonly ai = createGroundMelee();
  private readonly pack: PackState;
  private readonly packId: number;

  constructor(scene: Phaser.Scene, x: number, y: number, world: EnemyWorld, options: PackOptions) {
    super(scene, x, y, CAO_DE_OSSOS, world, options);
    this.pack = options.pack;
    this.packId = options.packId;
  }

  protected think(dtMs: number): void {
    updateGroundMelee(this.ai, this.out, this.sense, dtMs, CAO_DE_OSSOS.ai);
  }

  protected override attackAllowed(): boolean {
    return canAcquireAttack(this.pack, this.packId);
  }

  protected override mayStartAttack(): boolean {
    return tryAcquireAttack(this.pack, this.packId);
  }

  protected override onAttackFinished(): void {
    releaseAttack(this.pack, this.packId);
  }

  protected override resetAi(): void {
    Object.assign(this.ai, createGroundMelee());
  }
}
