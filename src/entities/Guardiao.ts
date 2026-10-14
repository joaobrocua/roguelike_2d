import type Phaser from 'phaser';
import { GUARDIAO } from '../data/boss';
import type { MeleeShape } from '../data/enemies';
import { createBoss, updateBoss, type BossSense } from '../logic/ai/boss';
import { createAiSense } from '../logic/ai/types';
import type { AttackConfig } from '../logic/attack';
import { Enemy, type EnemyWorld } from './Enemy';

/**
 * O Guardião Partido, chefe da fortaleza. Três golpes (pancada, investida e, na fase 2, a
 * onda no chão); o comportamento vem de logic/ai/boss.ts e os valores de data/boss.ts.
 */
export class Guardiao extends Enemy {
  private readonly ai = createBoss(GUARDIAO.ai.introMs);
  private readonly rng: () => number;
  private lastPhase: 1 | 2 = 1;

  /** Mesmo objeto de percepção da base, com a vida acrescentada (a IA do chefe lê a fase). */
  protected override readonly sense: BossSense = { ...createAiSense(), hpFraction: 1 };

  constructor(scene: Phaser.Scene, x: number, y: number, world: EnemyWorld, rng: () => number) {
    super(scene, x, y, GUARDIAO, world);
    this.rng = rng;
  }

  override get isBoss(): boolean {
    return true;
  }

  /** Fração de vida restante (a barra do chefe lê isto). */
  get hpFraction(): number {
    return this.health.hp / this.health.maxHp;
  }

  protected override get attackDef(): AttackConfig {
    return GUARDIAO.attacks[this.ai.attackKind].attack;
  }

  protected override get attackShape(): MeleeShape {
    return GUARDIAO.attacks[this.ai.attackKind].shape;
  }

  protected think(dtMs: number): void {
    this.sense.hpFraction = this.hpFraction;
    updateBoss(this.ai, this.out, this.sense, dtMs, GUARDIAO.ai, this.rng);
    if (this.ai.phase !== this.lastPhase) {
      this.lastPhase = this.ai.phase;
      this.world.onBossPhase?.();
    }
  }
}
