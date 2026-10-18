import Phaser from 'phaser';
import { sfx } from '../systems/AudioSystem';
import { INVULNERABLE_FX, JUMP_FORGIVENESS, PLAYER, ROLL } from '../data/balance';
import { PERFECT_DODGE, PLAYER_COMBAT } from '../data/combat';
import {
  HERO_BODY_OFFSET,
  HERO_MARKER_OFFSET_Y,
  HERO_RUN_THRESHOLD,
  HERO_SHEET_KEY,
  HERO_TOME_FLOAT,
  HERO_APEX_THRESHOLD,
  HERO_ATTACK_SETS,
  HERO_LAND_MIN_SPEED,
  HERO_LAND_MS,
  HERO_WEAPON_ANGLE,
  HERO_WEAPON_HIDDEN,
  HERO_WEAPON_SWAY,
  HERO_WEAPON_TRAIL,
  heroFramePose,
  heroAnimationKey,
  type AttackStyle,
  type HeroState,
} from '../data/hero';
import { DEPTH } from '../data/atmosphere';
import { DUST_FX, SWAP_FX } from '../data/fx';
import { PALETTE } from '../data/palette';
import {
  RELICS,
  relicIconKey,
  STARTING_LOADOUT,
  SWAP,
  type PassiveStats,
  type RelicId,
  type PlayerAttackDef,
  type RelicDef,
  type SwapStrikeDef,
} from '../data/relics';
import {
  canCancelRecovery,
  cancelAttack,
  createAttackState,
  isHitboxActive,
  startAttack,
  updateAttack,
  type HitData,
} from '../logic/attack';
import {
  advanceCombo,
  createCombo,
  openComboWindow,
  resetCombo,
  updateCombo,
} from '../logic/combo';
import {
  clearInputBuffer,
  consumePress,
  createInputBuffer,
  isBuffered,
  rememberPress,
  tickInputBuffer,
} from '../logic/inputBuffer';
import {
  cooldownFraction,
  createCooldown,
  isReady,
  startCooldown,
  updateCooldown,
} from '../logic/cooldown';
import { computeDamage, directionAway } from '../logic/damage';
import { attackFrameIndex, heroAnimState, type HeroAnimInput } from '../logic/heroAnim';
import { createBox, placeHitbox, type Box } from '../logic/geometry';
import {
  createHealth,
  heal,
  isDead,
  isHurtInvulnerable,
  isStunned,
  takeDamage,
  updateHealth,
  type HealthState,
} from '../logic/health';
import { createJumpState, resetJump, updateJump } from '../logic/movement';
import { consumeDodgeBonus, createDodgeBonus, grantDodgeBonus } from '../logic/perfectDodge';
import {
  activeRelic,
  createLoadout,
  registerHit,
  replaceRelic,
  startingSlots,
  trySwap,
  updateLoadout,
  type Loadout,
} from '../logic/relics';
import {
  cancelRoll,
  createRollState,
  isInvulnerable,
  tryStartRoll,
  updateRoll,
} from '../logic/roll';
import type { InputIntent } from '../systems/InputSystem';
import type { ProjectileSystem } from '../systems/ProjectileSystem';
import { ActorShadow } from '../systems/ActorShadow';
import { SlashVisual } from '../systems/SlashVisual';
import { WEAPON_HOLD, heldOffhandKey, heldWeaponKey } from '../data/weapons';
import { guardResult, type GuardResult } from '../logic/guard';
import { getHeroHand, getHeroHandBack } from '../systems/heroSprites';
import { TEXTURE } from '../systems/textures';
import { approachZero } from '../utils/math';
import { Barrier } from './Barrier';

/** O que o jogador leva de uma sala para a outra (a cena é recriada a cada sala). */
export interface PlayerSnapshot {
  hp: number;
  slots: [RelicId, RelicId];
  active: 0 | 1;
  cooldowns: [{ remainingMs: number; totalMs: number }, { remainingMs: number; totalMs: number }];
  dodgeBonusReady: boolean;
}

/**
 * O jogador. Esta classe só traduz a intenção do input em velocidade do corpo
 * Arcade; as regras (coyote, buffer, rolagem, ataque, combo, recarga, troca de relíquia,
 * vida) vivem em src/logic e os valores de cada relíquia em src/data/relics.ts.
 */
/** O que os upgrades permanentes mudam no jogador (ver src/logic/meta/effects.ts). */
export interface PlayerStats {
  maxHp: number;
  damageMultiplier: number;
  /** Milissegundos a mais na janela da esquiva perfeita. */
  dodgeWindowBonusMs: number;
  /** Relíquia escolhida para começar a run (ou null para a padrão). */
  startRelic: RelicId | null;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly health: HealthState;
  readonly attack = createAttackState();
  readonly roll = createRollState();
  readonly loadout: Loadout;
  /** Recarga do especial de cada slot de relíquia (as duas correm ao mesmo tempo). */
  readonly cooldowns = [createCooldown(), createCooldown()] as const;
  readonly barrier: Barrier;
  /** Caixas lidas pelo CombatSystem; atualizadas a cada update. */
  readonly hurtBox: Box = createBox();
  readonly attackBox: Box = createBox();
  /** Golpe em andamento (básico ou especial): dano, forma, roubo de vida. */
  currentAttack: PlayerAttackDef;
  /** Multiplicador de dano do golpe em andamento (esquiva perfeita × passiva). */
  swingMultiplier = 1;
  /** O golpe em andamento veio de uma esquiva perfeita (efeitos de destaque). */
  swingEmpowered = false;
  /** Golpe de troca a ser resolvido pelo CombatSystem neste frame (ou null). */
  pendingSwapStrike: SwapStrikeDef | null = null;

  private readonly jump = createJumpState();
  private readonly combo = createCombo();
  /** Apertos feitos um pouco antes de poder agir (ataque, especial, rolagem). */
  private readonly inputBuffer = createInputBuffer();
  private readonly dodgeBonus = createDodgeBonus();
  private readonly slash: SlashVisual;
  private readonly bonusMarker: Phaser.GameObjects.Image;
  /** Chamado ao pousar e ao começar a rolar: poeira nos pés (a cena liga ao FxSystem). */
  onDust: ((x: number, y: number, count: number) => void) | null = null;

  private readonly weapon: Phaser.GameObjects.Image;
  /** A segunda arma ou o escudo, na mão de trás (só algumas relíquias têm). */
  private readonly offhand: Phaser.GameObjects.Image;
  /** O que a guarda fez com o último golpe recebido (lido uma vez pelo CombatSystem). */
  private guardOutcome: GuardResult = 0;
  /** Imagens-fantasma da arma durante o golpe (o rastro): as três posições mais recentes. */
  private readonly trail: Phaser.GameObjects.Image[] = [];
  private readonly trailX = [0, 0, 0];
  private readonly trailY = [0, 0, 0];
  private readonly trailRot = [0, 0, 0];
  private trailCount = 0;
  private trailHead = 0;
  /** Estilo do golpe em andamento (escolhe os quadros da animação de ataque). */
  private attackStyle: AttackStyle = 'slashA';
  /** Até quando (relógio do herói, ms) o quadro de pouso fica na tela. */
  private landUntilMs = 0;
  private readonly shadow: ActorShadow;
  private readonly animInput: HeroAnimInput = {
    grounded: true,
    velX: 0,
    velY: 0,
    rolling: false,
    attackPhase: 'idle',
    stunned: false,
    dead: false,
    landing: false,
  };
  private heroState: HeroState | null = null;
  private weaponRelicId: string | null = null;
  private offhandKey: string | null = null;
  private wasGrounded = true;
  private lastVelY = 0;
  private currentIsSpecial = false;
  private barrierOffsetX = 0;
  /** Lado em que a barreira foi erguida: ela não vira junto com o jogador. */
  private barrierFacing = 1;
  private swapFlashMs = 0;
  private facing = 1;
  private clockMs = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly bolts: ProjectileSystem,
    private stats: PlayerStats,
  ) {
    super(scene, x, y, HERO_SHEET_KEY, 'idle-0');
    this.health = createHealth(stats.maxHp);
    const [first, second] = startingSlots(stats.startRelic, STARTING_LOADOUT);
    this.loadout = createLoadout(first, second);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // O corpo de colisão é menor que o quadro 32x32 do desenho: o centro dele é o centro do quadro
    (this.body as Phaser.Physics.Arcade.Body)
      .setSize(PLAYER.width, PLAYER.height)
      .setOffset(HERO_BODY_OFFSET.x, HERO_BODY_OFFSET.y);
    this.setCollideWorldBounds(true);
    this.setMaxVelocity(PLAYER.maxSpeedX, PLAYER.maxFallSpeed);
    this.setDepth(DEPTH.actor);
    this.shadow = new ActorShadow(scene, PLAYER.width);
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.shadow.destroy());

    const relic = this.relic;
    this.currentAttack = relic.basic.steps[0] as PlayerAttackDef;
    this.slash = new SlashVisual(scene, relic.color);
    this.weapon = scene.add
      .image(x, y, relicIconKey(relic.id))
      .setDepth(DEPTH.actor + 0.01)
      .setVisible(false);
    this.offhand = scene.add
      .image(x, y, relicIconKey(relic.id))
      .setDepth(DEPTH.actor + 0.012)
      .setVisible(false);
    for (let i = 0; i < HERO_WEAPON_TRAIL.length; i++) {
      this.trail.push(
        scene.add
          .image(x, y, relicIconKey(relic.id))
          .setDepth(DEPTH.actor + 0.005)
          .setVisible(false),
      );
    }
    this.bonusMarker = scene.add.image(x, y, TEXTURE.marker).setVisible(false);
    this.barrier = new Barrier(scene, relic.color);
  }

  /** Janela (ms) da esquiva perfeita: a base mais o bônus dos upgrades. */
  get dodgeWindowMs(): number {
    return PERFECT_DODGE.windowMs + this.stats.dodgeWindowBonusMs;
  }

  /**
   * Aplica melhorias compradas no santuário no meio da run: a vida máxima nova entra cheia só na
   * parte que cresceu (quem tinha 40/100 e ganha +10 fica com 50/110), sem curar o resto.
   */
  applyStats(next: PlayerStats): void {
    const grown = next.maxHp - this.health.maxHp;
    this.health.maxHp = next.maxHp;
    if (grown > 0 && this.health.hp > 0) this.health.hp += grown;
    this.health.hp = Math.min(this.health.hp, this.health.maxHp);
    this.stats = next;
    this.refreshActiveRelic();
  }

  /** Guarda o estado que precisa sobreviver à troca de sala. */
  snapshot(): PlayerSnapshot {
    const [first, second] = this.cooldowns;
    return {
      hp: this.health.hp,
      slots: [this.loadout.slots[0], this.loadout.slots[1]],
      active: this.loadout.active,
      cooldowns: [
        { remainingMs: first.remainingMs, totalMs: first.totalMs },
        { remainingMs: second.remainingMs, totalMs: second.totalMs },
      ],
      dodgeBonusReady: this.dodgeBonus.ready,
    };
  }

  /** Aplica um estado guardado (ao entrar numa sala nova). */
  restore(saved: PlayerSnapshot): void {
    this.health.hp = Math.min(saved.hp, this.health.maxHp);
    this.loadout.slots[0] = saved.slots[0];
    this.loadout.slots[1] = saved.slots[1];
    this.loadout.active = saved.active;
    for (const slot of [0, 1] as const) {
      this.cooldowns[slot].remainingMs = saved.cooldowns[slot].remainingMs;
      this.cooldowns[slot].totalMs = saved.cooldowns[slot].totalMs;
    }
    this.dodgeBonus.ready = saved.dodgeBonusReady;
    this.refreshActiveRelic();
  }

  /** Relíquia ativa. */
  get relic(): RelicDef {
    return RELICS[activeRelic(this.loadout)];
  }

  /** Bônus passivos da relíquia ativa. */
  get passive(): PassiveStats {
    return this.relic.passive;
  }

  isDead(): boolean {
    return isDead(this.health);
  }

  /** O golpe em andamento tem uma caixa de acerto ativa (e não é só projétil/barreira)? */
  get hitboxLive(): boolean {
    return this.currentAttack.shape !== 'none' && isHitboxActive(this.attack);
  }

  /** Invulnerável por causa da rolagem (não inclui a invulnerabilidade pós-dano). */
  isRollInvulnerable(): boolean {
    return isInvulnerable(this.roll, ROLL);
  }

  get rollElapsedMs(): number {
    return this.roll.elapsedMs;
  }

  /** Fração (0 pronto .. 1 recém usado) da recarga do especial do slot. */
  specialCooldownFraction(slot: 0 | 1): number {
    return cooldownFraction(this.cooldowns[slot]);
  }

  /** Esquiva perfeita: o próximo ataque causa dano multiplicado. */
  grantDodgeBonus(): void {
    grantDodgeBonus(this.dodgeBonus);
  }

  /** Avisa que um golpe acertou um inimigo (abre a janela do golpe de troca). */
  notifyHit(): void {
    registerHit(this.loadout);
  }

  /** Recupera vida (roubo de vida). Retorna quanto recuperou. */
  heal(amount: number): number {
    return heal(this.health, amount);
  }

  /** Põe uma relíquia nova no slot (descartando a antiga): o especial dela começa pronto. */
  equipRelic(slot: 0 | 1, id: RelicId): void {
    if (replaceRelic(this.loadout, slot, id) === null) return;
    this.cooldowns[slot].remainingMs = 0;
    if (slot === this.loadout.active) {
      cancelAttack(this.attack);
      resetCombo(this.combo);
      this.refreshActiveRelic();
    }
  }

  /** Aplica um golpe inimigo. Retorna o dano causado (0 se não acertou). */
  receiveHit(sourceX: number, cfg: HitData): number {
    // Guarda do escudo: o golpe de frente é bloqueado (e, no começo da guarda, é uma defesa perfeita)
    const guard = this.relic.special.guard;
    const blocked = guardResult(
      this.isGuarding(),
      this.facing,
      this.x,
      sourceX,
      this.attack.elapsedMs,
      guard?.parryMs ?? 0,
    );
    if (blocked !== 0) {
      this.guardOutcome = blocked;
      this.setVelocityX(directionAway(sourceX, this.x) * PLAYER_COMBAT.guardPushSpeed);
      return 0;
    }
    const damage = computeDamage(cfg.damage, this.passive.damageTakenMult);
    const hit = takeDamage(
      this.health,
      damage,
      PLAYER_COMBAT.hurtInvulnerableMs,
      PLAYER_COMBAT.hitStunMs,
    );
    if (!hit) return 0;
    cancelAttack(this.attack);
    resetCombo(this.combo);
    clearInputBuffer(this.inputBuffer);
    cancelRoll(this.roll, ROLL);
    resetJump(this.jump); // sem coyote/pulo pendente depois do knockback
    const dir = directionAway(sourceX, this.x);
    this.setVelocity(dir * cfg.knockbackX, cfg.knockbackY);
    return damage;
  }

  /** A guarda do escudo está erguida (fase ativa do especial do escudo)? */
  isGuarding(): boolean {
    return (
      this.currentIsSpecial &&
      this.relic.special.guard !== undefined &&
      this.attack.phase === 'active'
    );
  }

  /** Lado para onde o herói olha (-1 ou 1). */
  get lookDir(): number {
    return this.facing;
  }

  /** O que a guarda fez com o último golpe: 0 nada, 1 bloqueou, 2 defesa perfeita. Lê e apaga. */
  consumeGuard(): GuardResult {
    const outcome = this.guardOutcome;
    this.guardOutcome = 0;
    return outcome;
  }

  update(dtMs: number, intent: InputIntent): void {
    this.clockMs += dtMs;
    updateHealth(this.health, dtMs);
    updateLoadout(this.loadout, dtMs);
    // A passiva da relíquia ativa acelera a recarga dos dois especiais
    const cooldownDt = dtMs / this.passive.cooldownMult;
    updateCooldown(this.cooldowns[0], cooldownDt);
    updateCooldown(this.cooldowns[1], cooldownDt);
    updateCombo(this.combo, dtMs);
    this.swapFlashMs = Math.max(0, this.swapFlashMs - dtMs);
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.isDead()) {
      this.barrier.dismiss();
      this.setVelocityX(
        approachZero(body.velocity.x, PLAYER_COMBAT.knockbackFriction * (dtMs / 1000)),
      );
      this.refreshBoxes(body);
      this.updateVisuals();
      return;
    }

    const grounded = body.blocked.down;
    if (grounded && !this.wasGrounded && this.lastVelY > DUST_FX.landMinSpeed) {
      this.onDust?.(body.center.x, body.bottom, DUST_FX.landCount);
      sfx('land');
    }
    if (grounded && !this.wasGrounded && this.lastVelY > HERO_LAND_MIN_SPEED) {
      this.landUntilMs = this.clockMs + HERO_LAND_MS; // agacha um instante no pouso
    }
    this.wasGrounded = grounded;
    this.lastVelY = body.velocity.y;
    const stunned = isStunned(this.health);

    // Aperto adiantado: fica guardado por um instante e vale quando o jogador puder agir
    tickInputBuffer(this.inputBuffer, dtMs);
    if (intent.attackPressed)
      rememberPress(this.inputBuffer, 'attack', PLAYER_COMBAT.inputBufferMs);
    if (intent.specialPressed) {
      rememberPress(this.inputBuffer, 'special', PLAYER_COMBAT.inputBufferMs);
    }
    if (intent.rollPressed) rememberPress(this.inputBuffer, 'roll', PLAYER_COMBAT.inputBufferMs);

    updateRoll(this.roll, dtMs, ROLL);

    if (stunned) {
      // Sem controle: o knockback perde velocidade pelo atrito.
      this.setVelocityX(
        approachZero(body.velocity.x, PLAYER_COMBAT.knockbackFriction * (dtMs / 1000)),
      );
    } else {
      // Q alterna; 1 e 2 vão direto para a casa pedida (se já é a ativa, nada acontece)
      if (intent.swapPressed) this.swapRelic();
      else if (intent.slotPressed >= 0 && intent.slotPressed !== this.loadout.active)
        this.swapRelic();
      const attackPhase = this.attack.phase;
      // Dá para virar até o golpe começar de verdade (preparação e recuperação), não só parado
      if (intent.moveX !== 0 && attackPhase !== 'active') this.facing = intent.moveX;

      // Rolagem: só fora de um golpe ativo (cancela a preparação e a recuperação do ataque).
      if (!this.roll.active && attackPhase !== 'active') {
        // Rola para onde o jogador segura; sem direção, para onde olha (mesmo saindo de um golpe).
        const rollDir = intent.moveX !== 0 ? intent.moveX : this.facing;
        if (tryStartRoll(this.roll, isBuffered(this.inputBuffer, 'roll'), rollDir, grounded)) {
          consumePress(this.inputBuffer, 'roll');
          this.facing = rollDir;
          cancelAttack(this.attack);
          resetCombo(this.combo);
          this.onDust?.(body.center.x, body.bottom, DUST_FX.rollCount);
          sfx('roll');
        }
      }

      // Ataque básico ou especial: não durante a rolagem nem no meio de outro golpe.
      if (!this.roll.active) {
        if (this.attack.phase === 'idle') {
          if (
            isBuffered(this.inputBuffer, 'special') &&
            isReady(this.cooldowns[this.loadout.active])
          ) {
            consumePress(this.inputBuffer, 'special');
            consumePress(this.inputBuffer, 'attack');
            this.beginAttack(true);
          } else if (isBuffered(this.inputBuffer, 'attack')) {
            consumePress(this.inputBuffer, 'attack');
            this.beginAttack(false);
          }
        } else if (this.canChainFromRecovery()) {
          // Combo mais fluido: o próximo golpe entra por cima da metade final da recuperação
          consumePress(this.inputBuffer, 'attack');
          cancelAttack(this.attack);
          openComboWindow(this.combo, this.relic.basic.comboWindowMs);
          this.beginAttack(false);
        }
      }

      if (this.roll.active) {
        this.setVelocityX(this.roll.direction * ROLL.speed);
        // Decisão de design: a rolagem cancela pulo pendente e coyote (sem pulo "fantasma" ao terminar).
        resetJump(this.jump);
      } else {
        this.moveOrLunge(intent);
        if (updateJump(this.jump, dtMs, grounded, intent.jumpPressed, JUMP_FORGIVENESS)) {
          this.setVelocityY(PLAYER.jumpVelocity);
          sfx('jump');
        }
      }
    }

    const phaseBefore = this.attack.phase;
    updateAttack(this.attack, dtMs, this.currentAttack);
    if (phaseBefore !== 'active' && this.attack.phase === 'active') this.onActivePhaseStart();
    if (phaseBefore !== 'idle' && this.attack.phase === 'idle' && !this.currentIsSpecial) {
      // Golpe básico terminou: abre a janela para continuar o combo.
      openComboWindow(this.combo, this.relic.basic.comboWindowMs);
    }

    this.barrier.update(dtMs, this.x, this.y, this.barrierFacing, this.barrierOffsetX);
    this.refreshBoxes(body);
    this.updateVisuals();
  }

  /** Há um aperto guardado e o golpe básico atual pode ser encadeado antes de a recuperação acabar? */
  private canChainFromRecovery(): boolean {
    if (this.currentIsSpecial || !isBuffered(this.inputBuffer, 'attack')) return false;
    const steps = this.relic.basic.steps.length;
    if (this.combo.step < 0 || this.combo.step + 1 >= steps) return false; // não há próximo passo
    return canCancelRecovery(this.attack, this.currentAttack, PLAYER_COMBAT.comboCancelFraction);
  }

  /** Inicia o golpe básico (combo) ou o especial da relíquia ativa. */
  private beginAttack(special: boolean): void {
    const relic = this.relic;
    if (this.attack.phase !== 'idle') return;
    const hold = WEAPON_HOLD[relic.id];
    let style: AttackStyle;
    let def: PlayerAttackDef;
    if (special) {
      def = relic.special.attack;
      style = hold.special;
    } else {
      const step = advanceCombo(this.combo, relic.basic.steps.length);
      def = relic.basic.steps[step] as PlayerAttackDef;
      style = hold.styles[step % hold.styles.length] ?? 'slashA';
    }
    if (!startAttack(this.attack)) return;
    this.attackStyle = style;

    this.currentAttack = def;
    this.currentIsSpecial = special;
    // Recarga e bônus da esquiva perfeita só são gastos quando o golpe de fato acontece
    // (fase ativa); se o golpe for cancelado na preparação, nada se perde.
    this.swingEmpowered = false;
    this.swingMultiplier = relic.passive.damageMult * this.stats.damageMultiplier;
  }

  /** Troca a relíquia ativa; no momento certo (logo após acertar) dispara o golpe de troca. */
  private swapRelic(): void {
    const result = trySwap(this.loadout, SWAP);
    if (result === 'blocked') return;

    cancelAttack(this.attack);
    resetCombo(this.combo);
    this.refreshActiveRelic();
    this.swapFlashMs = SWAP_FX.flashMs;
    if (result === 'swapped-strike') this.pendingSwapStrike = this.relic.swapStrike;
  }

  /** Atualiza o que depende da relíquia ativa (golpe padrão e cor do arco). */
  private refreshActiveRelic(): void {
    const relic = this.relic;
    this.slash.setTint(relic.color);
    this.currentAttack = relic.basic.steps[0] as PlayerAttackDef;
    this.currentIsSpecial = false;
  }

  /** Efeitos do primeiro frame da fase ativa: projétil do Tomo e barreira. */
  private onActivePhaseStart(): void {
    const def = this.currentAttack;
    const relic = this.relic;
    if (this.currentIsSpecial) {
      startCooldown(this.cooldowns[this.loadout.active], relic.special.cooldownMs);
    }
    sfx(this.currentIsSpecial ? 'special' : 'swing');
    // A esquiva perfeita dobra o dano do golpe; a barreira (sem dano) não gasta o bônus
    const shots = def.projectiles ?? (def.projectile ? [def.projectile] : []);
    if (def.damage > 0 || shots.length > 0) {
      const dodgeMultiplier = consumeDodgeBonus(this.dodgeBonus, PERFECT_DODGE.damageMultiplier);
      this.swingEmpowered = dodgeMultiplier > 1;
      this.swingMultiplier =
        dodgeMultiplier * relic.passive.damageMult * this.stats.damageMultiplier;
    }
    for (const shot of shots) {
      const bolt = this.bolts.fire(
        (this.body as Phaser.Physics.Arcade.Body).center.x + this.facing * (PLAYER.width / 2),
        (this.body as Phaser.Physics.Arcade.Body).center.y + shot.spawnOffsetY,
        this.facing,
        shot,
      );
      if (bolt) {
        bolt.multiplier = this.swingMultiplier;
        bolt.empowered = this.swingEmpowered;
      }
    }
    const barrier = relic.special.barrier;
    if (this.currentIsSpecial && barrier) {
      this.barrierOffsetX = barrier.offsetX;
      this.barrierFacing = this.facing;
      this.barrier.raise(barrier.durationMs, barrier.width, barrier.height, relic.color);
    }
  }

  /** Andar (mais devagar durante o golpe) ou, na fase ativa de uma investida, avançar. */
  private moveOrLunge(intent: InputIntent): void {
    const attacking = this.attack.phase !== 'idle';
    const def = this.currentAttack;
    if (this.attack.phase === 'active' && def.lungeSpeed > 0) {
      this.setVelocityX(this.facing * def.lungeSpeed);
      return;
    }
    const factor = attacking ? def.moveFactor : 1;
    const walk = intent.moveX * PLAYER.moveSpeed * this.passive.moveSpeedMult * factor;
    // Passo à frente: golpes corpo a corpo avançam um pouco na preparação e no golpe, parado ou não,
    // o que ajuda a alcançar o inimigo sem o jogador ter que andar até ele
    const stepping =
      def.shape === 'front' &&
      !def.projectile &&
      !def.projectiles &&
      (this.attack.phase === 'windup' || this.attack.phase === 'active');
    this.setVelocityX(
      stepping && intent.moveX === 0 ? this.facing * PLAYER_COMBAT.attackStepSpeed : walk,
    );
  }

  private refreshBoxes(body: Phaser.Physics.Arcade.Body): void {
    const hurt = this.hurtBox;
    hurt.x = body.x;
    hurt.y = body.y;
    hurt.width = body.width;
    hurt.height = body.height;

    // body.center: o sprite (this.x/y) só sincroniza com o corpo depois do passo da física
    const hitbox = this.currentAttack.hitbox;
    const box = this.attackBox;
    switch (this.currentAttack.shape) {
      case 'front':
        placeHitbox(box, body.center.x, body.center.y, PLAYER.width / 2, this.facing, hitbox);
        break;
      case 'body': // investida: a caixa envolve o corpo
        box.width = hitbox.width;
        box.height = hitbox.height;
        box.x = body.center.x - hitbox.width / 2;
        box.y = body.center.y - hitbox.height / 2 + hitbox.offsetY;
        break;
      case 'around': // onda no chão: centrada no jogador, com a base nos pés
        box.width = hitbox.width;
        box.height = hitbox.height;
        box.x = body.center.x - hitbox.width / 2;
        box.y = body.bottom - hitbox.height + hitbox.offsetY;
        break;
      case 'none':
        box.width = 0;
        box.height = 0;
        break;
    }
  }

  private updateVisuals(): void {
    const feet = this.body as Phaser.Physics.Arcade.Body;
    this.shadow.update(feet.center.x, feet.bottom, feet.blocked.down, true);
    this.setFlipX(this.facing < 0);

    if (this.swapFlashMs > 0) this.setTintFill(this.relic.color);
    else if (isStunned(this.health)) this.setTintFill(PALETTE.playerAccent);
    else this.clearTint();

    const flicker = this.isRollInvulnerable() || isHurtInvulnerable(this.health);
    if (flicker) {
      const low = Math.floor(this.clockMs / INVULNERABLE_FX.flickerMs) % 2 === 0;
      this.setAlpha(low ? INVULNERABLE_FX.alphaLow : INVULNERABLE_FX.alphaHigh);
    } else {
      this.setAlpha(1);
    }

    // Arco do golpe (só golpes com caixa visível) e marcador do bônus de esquiva perfeita.
    const shape = this.currentAttack.shape;
    this.slash.update(
      this.hitboxLive && (shape === 'front' || shape === 'around'),
      this.attackBox,
      this.facing,
      this.attack.elapsedMs / this.currentAttack.activeMs,
    );
    this.bonusMarker.setVisible(this.dodgeBonus.ready && !this.isDead());
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.bonusMarker.setPosition(body.center.x, body.center.y + HERO_MARKER_OFFSET_Y);
    this.updateAnimation();
  }

  /** Escolhe a animação do herói pelo estado e posiciona a arma da relíquia na mão. */
  private updateAnimation(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const input = this.animInput;
    input.grounded = body.blocked.down;
    input.velX = body.velocity.x;
    input.velY = body.velocity.y;
    input.rolling = this.roll.active;
    input.attackPhase = this.attack.phase;
    input.stunned = isStunned(this.health);
    input.dead = this.isDead();
    input.landing = this.clockMs < this.landUntilMs;
    const state = heroAnimState(input, HERO_RUN_THRESHOLD, HERO_APEX_THRESHOLD);
    if (state !== this.heroState) {
      this.heroState = state;
      this.anims.play(heroAnimationKey(state), true);
    }
    // Nos golpes o quadro vem do andamento da fase (preparar, golpear, recuperar), não do tempo
    if (state === 'windup' || state === 'swing' || state === 'recover') this.showAttackFrame(state);
    this.updateWeapon(state);
  }

  /** Escolhe o quadro do golpe pela fase e pelo quanto dela já passou. */
  private showAttackFrame(state: 'windup' | 'swing' | 'recover'): void {
    const set = HERO_ATTACK_SETS[this.attackStyle];
    const def = this.currentAttack;
    const names = state === 'windup' ? set.windup : state === 'swing' ? set.swing : set.recover;
    const duration =
      state === 'windup' ? def.windupMs : state === 'swing' ? def.activeMs : def.recoveryMs;
    const name = names[attackFrameIndex(names.length, this.attack.elapsedMs, duration)];
    if (!name) return;
    this.anims.stop();
    this.setFrame(name);
  }

  /** Arma da relíquia: empunhada na mão (o ângulo vem do quadro do golpe) ou, no Tomo, flutuando. */
  private updateWeapon(state: HeroState): void {
    const weapon = this.weapon;
    const relic = this.relic;
    // body.center: o sprite só acompanha o corpo no fim do quadro, então a arma usa o corpo
    const body = this.body as Phaser.Physics.Arcade.Body;
    const cx = body.center.x;
    const cy = body.center.y;
    if (HERO_WEAPON_HIDDEN.includes(state)) {
      weapon.setVisible(false);
      this.offhand.setVisible(false);
      this.hideTrail();
      return;
    }
    const floating = relic.floatingWeapon;
    const texture = floating ? relicIconKey(relic.id) : heldWeaponKey(relic.id);
    if (this.weaponRelicId !== relic.id) {
      this.weaponRelicId = relic.id;
      weapon.setTexture(texture);
      for (const ghost of this.trail) ghost.setTexture(texture).setTint(relic.color);
    }
    weapon
      .setVisible(true)
      .setFlipX(this.facing < 0)
      .setAlpha(this.alpha);

    if (floating) {
      const bob = Math.sin((this.clockMs / HERO_TOME_FLOAT.bobPeriodMs) * Math.PI * 2);
      weapon.setOrigin(0.5, 0.5).setRotation(0);
      weapon.setPosition(
        cx + this.facing * HERO_TOME_FLOAT.offsetX,
        cy + HERO_TOME_FLOAT.offsetY + bob * HERO_TOME_FLOAT.bobPx,
      );
      this.offhand.setVisible(false);
      this.hideTrail();
      return;
    }
    const frameName = String(this.frame.name);
    const hand = getHeroHand(frameName);
    if (!hand) {
      weapon.setVisible(false);
      this.offhand.setVisible(false);
      this.hideTrail();
      return;
    }
    const hold = WEAPON_HOLD[relic.id];
    const attacking = state === 'windup' || state === 'swing' || state === 'recover';
    const frameAngle = heroFramePose(frameName)?.weaponAngle;
    let angle: number;
    if (attacking && frameAngle !== undefined) {
      angle = frameAngle;
    } else {
      // Fora dos golpes: o ângulo do estado, o jeito de cada arma e um balanço leve
      let sway = 0;
      if (state === 'run') {
        sway =
          HERO_WEAPON_SWAY.run *
          Math.sin((this.clockMs / HERO_WEAPON_SWAY.runPeriodMs) * Math.PI * 2);
      } else if (state === 'idle') {
        sway =
          HERO_WEAPON_SWAY.idle *
          Math.sin((this.clockMs / HERO_WEAPON_SWAY.idlePeriodMs) * Math.PI * 2);
      }
      angle = HERO_WEAPON_ANGLE[state] + hold.restBias + sway;
    }
    // Com o herói olhando para a esquerda, a textura é espelhada e o ponto de empunhadura também
    const sprite = hold.sprite;
    const gripX = sprite.gripX / sprite.width;
    weapon.setOrigin(this.facing >= 0 ? gripX : 1 - gripX, sprite.gripY / sprite.height);
    const x = cx + this.facing * (hand.x - 16);
    const y = cy + (hand.y - 16);
    weapon.setRotation(this.facing * angle);
    weapon.setPosition(x, y);
    this.updateOffhand(hold, state, frameName, cx, cy, attacking);
    this.updateTrail(state === 'swing' && hold.trail, x, y, this.facing * angle);
  }

  /** A segunda arma ou o escudo, na mão de trás: gira junto com o quadro do golpe. */
  private updateOffhand(
    hold: (typeof WEAPON_HOLD)[RelicId],
    state: HeroState,
    frameName: string,
    cx: number,
    cy: number,
    attacking: boolean,
  ): void {
    const offhand = this.offhand;
    const spec = hold.offhand;
    const handBack = getHeroHandBack(frameName);
    if (!spec || !handBack) {
      offhand.setVisible(false);
      return;
    }
    const key = heldOffhandKey(this.relic.id);
    if (this.offhandKey !== key) {
      this.offhandKey = key;
      offhand.setTexture(key);
    }
    const framePose = heroFramePose(frameName);
    const angle =
      attacking && framePose?.offWeaponAngle !== undefined
        ? framePose.offWeaponAngle
        : HERO_WEAPON_ANGLE[state] + spec.restBias;
    const gripX = spec.sprite.gripX / spec.sprite.width;
    offhand
      .setVisible(true)
      .setFlipX(this.facing < 0)
      .setAlpha(this.alpha)
      .setOrigin(this.facing >= 0 ? gripX : 1 - gripX, spec.sprite.gripY / spec.sprite.height)
      .setRotation(this.facing * angle)
      .setPosition(cx + this.facing * (handBack.x - 16), cy + (handBack.y - 16));
  }

  /** Rastro do golpe: as posições dos últimos frames da arma, esmaecendo para trás. */
  private updateTrail(active: boolean, x: number, y: number, rotation: number): void {
    if (!active) {
      this.hideTrail();
      return;
    }
    const weapon = this.weapon;
    const size = HERO_WEAPON_TRAIL.length;
    for (let i = 0; i < size; i++) {
      const ghost = this.trail[i];
      if (!ghost) continue;
      if (i >= this.trailCount) {
        ghost.setVisible(false);
        continue;
      }
      const slot = (this.trailHead - 1 - i + size * 2) % size;
      ghost
        .setVisible(true)
        .setOrigin(weapon.originX, weapon.originY)
        .setFlipX(weapon.flipX)
        .setPosition(this.trailX[slot] ?? x, this.trailY[slot] ?? y)
        .setRotation(this.trailRot[slot] ?? rotation)
        .setAlpha(HERO_WEAPON_TRAIL[i] ?? 0);
    }
    this.trailX[this.trailHead] = x;
    this.trailY[this.trailHead] = y;
    this.trailRot[this.trailHead] = rotation;
    this.trailHead = (this.trailHead + 1) % size;
    this.trailCount = Math.min(size, this.trailCount + 1);
  }

  private hideTrail(): void {
    this.trailCount = 0;
    for (const ghost of this.trail) ghost.setVisible(false);
  }
}
