import type { SwapStrikeDef } from '../data/relics';
import type { HitData } from '../logic/attack';
import { boxesOverlap, createBox } from '../logic/geometry';
import { isPerfectDodge } from '../logic/perfectDodge';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { Projectile } from '../entities/Projectile';
import type { ProjectileSystem } from './ProjectileSystem';

/** O que o CombatSystem avisa à cena; a cena decide os efeitos (feedback, bônus, drops). */
export interface CombatEvents {
  /** `empowered`: o golpe veio de uma esquiva perfeita (dano multiplicado). */
  onEnemyHit(enemy: Enemy, damage: number, empowered: boolean): void;
  onEnemyKilled(enemy: Enemy): void;
  onPlayerHit(damage: number): void;
  onPerfectDodge(): void;
  /** A barreira do Tomo parou um projétil. */
  onProjectileBlocked(projectile: Projectile): void;
  /** A guarda do escudo do jogador bloqueou um golpe ou um projétil. */
  onPlayerBlocked?(): void;
  /** O escudo de um inimigo bloqueou um golpe do jogador (nenhum dano). */
  onEnemyBlocked?(enemy: Enemy): void;
  /** O golpe de troca foi resolvido (para o anel de luz). */
  onSwapStrike(strike: SwapStrikeDef): void;
}

/** Só o que o CombatSystem lê de um pool de projéteis (facilita testar com objetos falsos). */
export type ProjectilePool = Pick<ProjectileSystem, 'pool'>;

/**
 * Resolve quem acertou quem a cada frame: golpes, raios e golpe de troca do jogador nos
 * inimigos, e golpes e flechas dos inimigos no jogador (com a esquiva perfeita e a barreira).
 * As regras de dano, vida e janela de esquiva ficam em src/logic; aqui só se junta tudo.
 */
export class CombatSystem {
  /** Área do golpe de troca, reaproveitada (sem alocar). */
  private readonly strikeBox = createBox();

  /** Dificuldade da etapa: multiplica o dano das flechas e raios dos inimigos comuns. */
  projectileDamageScale = 1;

  constructor(
    private readonly player: Player,
    private readonly enemies: readonly Enemy[],
    private readonly arrows: ProjectilePool,
    private readonly bolts: ProjectilePool,
    private readonly events: CombatEvents,
  ) {}

  update(): void {
    const player = this.player;
    if (player.isDead()) return;

    this.resolvePlayerMelee();
    this.resolveSwapStrike();
    this.resolveBolts();
    this.resolveEnemyMelee();
    this.resolveArrows();
  }

  /** Golpe da relíquia acerta cada inimigo uma única vez. */
  private resolvePlayerMelee(): void {
    const player = this.player;
    if (!player.hitboxLive) return;
    const swingId = player.attack.swingId;
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.lastHitSwingId === swingId) continue;
      if (!boxesOverlap(player.attackBox, enemy.hurtBox)) continue;
      enemy.lastHitSwingId = swingId;
      const attack = player.currentAttack;
      const damage = this.hitEnemy(
        enemy,
        player.x,
        attack,
        player.swingMultiplier,
        player.swingEmpowered,
      );
      // Roubo de vida (Foice): parte do dano causado volta como vida
      if (damage > 0 && attack.lifeSteal > 0) player.heal(damage * attack.lifeSteal);
    }
  }

  /** Golpe de troca: acerta de uma vez todos os inimigos dentro do alcance. */
  private resolveSwapStrike(): void {
    const player = this.player;
    const strike = player.pendingSwapStrike;
    if (!strike) return;
    player.pendingSwapStrike = null;

    const hurt = player.hurtBox;
    const box = this.strikeBox;
    box.x = hurt.x + hurt.width / 2 - strike.radius;
    box.width = strike.radius * 2;
    box.y = hurt.y - strike.radius / 2;
    box.height = hurt.height + strike.radius;

    for (const enemy of this.enemies) {
      if (!enemy.alive || !boxesOverlap(box, enemy.hurtBox)) continue;
      // registersHit = false: o golpe de troca não abre a janela de um novo golpe de troca
      this.hitEnemy(enemy, player.x, strike, 1, false, false);
    }
    this.events.onSwapStrike(strike);
  }

  /** Raios do jogador acertam o primeiro inimigo que encontram e somem. */
  private resolveBolts(): void {
    for (const bolt of this.bolts.pool) {
      if (!bolt.live || !bolt.cfg) continue;
      for (const enemy of this.enemies) {
        if (!enemy.alive || bolt.hasHit(enemy) || !boxesOverlap(bolt.box, enemy.hurtBox)) continue;
        const dealt = this.hitEnemy(enemy, bolt.x, bolt.cfg, bolt.multiplier, bolt.empowered);
        // Quem atravessa segue em frente; um golpe bloqueado ou ignorado para o tiro
        if (dealt <= 0 || bolt.registerHit(enemy)) {
          bolt.despawn();
          break;
        }
      }
    }
  }

  /** Aplica um golpe do jogador em um inimigo e avisa a cena. Retorna o dano causado. */
  private hitEnemy(
    enemy: Enemy,
    sourceX: number,
    hit: HitData,
    multiplier: number,
    empowered: boolean,
    registersHit = true,
  ): number {
    const damage = enemy.receiveHit(sourceX, hit, multiplier);
    if (damage <= 0) {
      if (enemy.consumeBlocked()) this.events.onEnemyBlocked?.(enemy);
      return 0;
    }
    if (registersHit) this.player.notifyHit();
    this.events.onEnemyHit(enemy, damage, empowered);
    if (!enemy.alive) this.events.onEnemyKilled(enemy);
    return damage;
  }

  /** Golpes corpo a corpo dos inimigos acertam o jogador. */
  private resolveEnemyMelee(): void {
    const player = this.player;
    for (const enemy of this.enemies) {
      const attack = enemy.attack;
      if (!enemy.alive || !enemy.hitboxLive || attack.resolved) continue;
      if (!boxesOverlap(enemy.attackBox, player.hurtBox)) continue;
      attack.resolved = true; // um golpe só é resolvido uma vez (acerta, é esquivado ou ignorado)
      this.resolveHit(enemy.x, enemy.attackConfig, enemy.damageScale);
    }
  }

  /** Flechas: a barreira para; acertar consome a flecha; esquivar (rolagem) deixa ela voar. */
  private resolveArrows(): void {
    const player = this.player;
    const barrier = player.barrier;
    for (const arrow of this.arrows.pool) {
      if (!arrow.live || arrow.resolved || !arrow.cfg) continue;
      if (barrier.live && boxesOverlap(arrow.box, barrier.box)) {
        this.events.onProjectileBlocked(arrow);
        arrow.despawn();
        continue;
      }
      if (!boxesOverlap(arrow.box, player.hurtBox)) continue;
      arrow.resolved = true;
      if (this.resolveHit(arrow.x, arrow.cfg, this.projectileDamageScale)) arrow.despawn();
    }
  }

  /** Aplica um golpe hostil ao jogador. Retorna true se causou dano. */
  private resolveHit(sourceX: number, hit: HitData, damageScale = 1): boolean {
    const player = this.player;
    if (player.isRollInvulnerable()) {
      if (isPerfectDodge(player.rollElapsedMs, true, player.dodgeWindowMs)) {
        this.events.onPerfectDodge();
      }
      return false;
    }
    const damage = player.receiveHit(sourceX, hit, damageScale);
    const guard = player.consumeGuard();
    if (guard !== 0) {
      // O escudo bloqueou: o golpe (ou o projétil) acaba aqui; a defesa perfeita vale como esquiva perfeita
      this.events.onPlayerBlocked?.();
      if (guard === 2) this.events.onPerfectDodge();
      return true;
    }
    if (damage > 0) this.events.onPlayerHit(damage);
    return damage > 0;
  }
}
