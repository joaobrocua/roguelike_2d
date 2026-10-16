import type Phaser from 'phaser';
import { SOLDADO_CAIDO } from '../data/enemies';
import { createGroundMelee, updateGroundMelee } from '../logic/ai/groundMelee';
import { isStunned } from '../logic/health';
import { blocksHit, createGuard, shownDirection, updateGuard } from '../logic/shield';
import { Enemy, type EnemyOptions, type EnemyWorld } from './Enemy';

/**
 * Soldado Caído: marcha até o herói com o escudo na frente e estoca com a lança. A guarda só cai
 * enquanto ele ataca (preparação, estocada e recuperação) e demora a virar quando o herói passa
 * para as costas dele.
 */
export class SoldadoCaido extends Enemy {
  private readonly ai = createGroundMelee();
  private readonly guard = createGuard();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    world: EnemyWorld,
    options?: EnemyOptions,
  ) {
    super(scene, x, y, SOLDADO_CAIDO, world, options);
  }

  protected think(dtMs: number): void {
    updateGroundMelee(this.ai, this.out, this.sense, dtMs, SOLDADO_CAIDO.ai);
    const attacking = this.sense.attackPhase !== 'idle';
    updateGuard(this.guard, this.out.facing >= 0 ? 1 : -1, dtMs, SOLDADO_CAIDO.guard, attacking);
  }

  private guardUp(): boolean {
    return this.attack.phase === 'idle' && !isStunned(this.health);
  }

  protected override blocks(sourceX: number): boolean {
    return blocksHit(this.guard, this.guardUp(), this.x, sourceX);
  }

  protected override visualFacing(): number {
    return shownDirection(this.guard, this.guardUp(), this.facing >= 0 ? 1 : -1);
  }

  protected override resetAi(): void {
    Object.assign(this.ai, createGroundMelee());
    Object.assign(this.guard, createGuard());
  }
}
