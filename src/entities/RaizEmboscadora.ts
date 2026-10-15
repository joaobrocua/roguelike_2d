import type Phaser from 'phaser';
import { RAIZ_EMBOSCADORA } from '../data/enemies';
import { createAmbusher, isExposed, updateAmbusher } from '../logic/ai/ambusher';
import type { EnemyAnimState } from '../logic/enemyAnim';
import { Enemy, type EnemyOptions, type EnemyWorld } from './Enemy';

/**
 * Raiz Emboscadora: estacionária. Dorme como um monte de raízes (sem poder ser acertada e sem
 * barra de vida), acorda quando o herói chega perto, chicoteia e afunda de volta quando ele some.
 */
export class RaizEmboscadora extends Enemy {
  private readonly ai = createAmbusher();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    world: EnemyWorld,
    options: EnemyOptions = {},
  ) {
    super(scene, x, y, RAIZ_EMBOSCADORA, world, options);
  }

  protected think(dtMs: number): void {
    updateAmbusher(this.ai, this.out, this.sense, dtMs, RAIZ_EMBOSCADORA.ai);
  }

  protected override hurtable(): boolean {
    return isExposed(this.ai);
  }

  /** Parada, a animação conta a fase: monte (idle), subindo (jump), erguida (walk), afundando (recover). */
  protected override overrideAnimState(state: EnemyAnimState): EnemyAnimState {
    if (state !== 'idle' && state !== 'walk') return state;
    switch (this.ai.mode) {
      case 'rising':
        return 'jump';
      case 'awake':
        return 'walk';
      case 'sinking':
        return 'recover';
      default:
        return 'idle';
    }
  }

  protected override resetAi(): void {
    Object.assign(this.ai, createAmbusher());
  }
}
