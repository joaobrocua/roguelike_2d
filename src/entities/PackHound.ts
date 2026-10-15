import type Phaser from 'phaser';
import type { EnemyBody } from '../data/enemies';
import {
  createGroundMelee,
  updateGroundMelee,
  type GroundMeleeConfig,
} from '../logic/ai/groundMelee';
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

/**
 * Base dos cães de bando (Cão de Ossos, Lobo Espectral): rápidos, perseguem e dão botes; em bando,
 * os ataques são escalonados. Cada tipo só informa o seu corpo e os seus números de IA.
 */
export class PackHound extends Enemy {
  private readonly ai = createGroundMelee();
  private readonly pack: PackState;
  private readonly packId: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: EnemyBody & { ai: GroundMeleeConfig },
    world: EnemyWorld,
    options: PackOptions,
  ) {
    super(scene, x, y, def, world, options);
    this.houndAi = def.ai;
    this.pack = options.pack;
    this.packId = options.packId;
  }

  private readonly houndAi: GroundMeleeConfig;

  protected think(dtMs: number): void {
    updateGroundMelee(this.ai, this.out, this.sense, dtMs, this.houndAi);
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
