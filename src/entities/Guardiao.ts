import Phaser from 'phaser';
import { GUARDIAO, type BossDef } from '../data/boss';
import type { MeleeShape } from '../data/enemies';
import { createBoss, updateBoss, type BossSense, type BossState } from '../logic/ai/boss';
import { createAiSense } from '../logic/ai/types';
import type { AttackConfig } from '../logic/attack';
import { RageAura } from '../systems/RageAura';
import { Enemy, type EnemyTarget, type EnemyWorld } from './Enemy';

/**
 * O Guardião Partido, chefe da fortaleza, e também os mini-chefes das áreas (data/miniBosses.ts):
 * todos usam esta classe com a sua `BossDef`. Três golpes (pancada, investida e, na fase 2, a
 * onda no chão); o comportamento vem de logic/ai/boss.ts e os valores de data/boss.ts.
 */
export class Guardiao extends Enemy {
  private readonly ai: BossState;
  private readonly rng: () => number;
  private readonly bossDef: BossDef;
  private lastPhase: 1 | 2 = 1;
  /** A aura da fase 2 (brilho e brasas); nasce quando a vida cai abaixo da metade. */
  private rage: RageAura | null = null;

  /** Mesmo objeto de percepção da base, com a vida acrescentada (a IA do chefe lê a fase). */
  protected override readonly sense: BossSense = { ...createAiSense(), hpFraction: 1 };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    world: EnemyWorld,
    rng: () => number,
    def: BossDef = GUARDIAO,
  ) {
    super(scene, x, y, def, world);
    this.rng = rng;
    this.bossDef = def;
    this.ai = createBoss(def.ai.introMs);
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.rage?.destroy());
  }

  override get isBoss(): boolean {
    return true;
  }

  /** É o mini-chefe de uma área (e não o Guardião, que encerra a run)? */
  override get isMiniBoss(): boolean {
    return this.bossDef !== GUARDIAO;
  }

  /** Nome mostrado na barra de vida do chefe. */
  get bossName(): string {
    return this.bossDef.name;
  }

  /** Fração de vida restante (a barra do chefe lê isto). */
  get hpFraction(): number {
    return this.health.hp / this.health.maxHp;
  }

  protected override get attackDef(): AttackConfig {
    return this.bossDef.attacks[this.ai.attackKind].attack;
  }

  protected override get attackShape(): MeleeShape {
    return this.bossDef.attacks[this.ai.attackKind].shape;
  }

  protected think(dtMs: number): void {
    this.sense.hpFraction = this.hpFraction;
    updateBoss(this.ai, this.out, this.sense, dtMs, this.bossDef.ai, this.rng);
    if (this.ai.phase !== this.lastPhase) {
      this.lastPhase = this.ai.phase;
      this.world.onBossPhase?.();
      this.rage ??= new RageAura(
        this.scene,
        this.bossDef.rage,
        this.bossDef.width,
        this.bossDef.height,
      );
    }
  }

  override update(dtMs: number, target: EnemyTarget): void {
    super.update(dtMs, target);
    const rage = this.rage;
    if (!rage) return;
    if (!this.alive) {
      // O chefe caiu: a aura se apaga com ele
      rage.destroy();
      this.rage = null;
      return;
    }
    const body = this.body as Phaser.Physics.Arcade.Body;
    rage.update(dtMs, body.center.x, body.center.y);
  }
}
