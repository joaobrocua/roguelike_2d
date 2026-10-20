import Phaser from 'phaser';
import type { EnemyBody, MeleeShape } from '../data/enemies';
import {
  ENEMY_ANIM_STATES,
  ENEMY_DEATH_FADE,
  ENEMY_WALK_THRESHOLD,
  ENEMY_WARN_FLICKER,
} from '../data/enemySprites';
import { SLASH_FX } from '../data/fx';
import { DEPTH } from '../data/atmosphere';
import { PALETTE } from '../data/palette';
import { createAiOutput, createAiSense } from '../logic/ai/types';
import {
  cancelAttack,
  createAttackState,
  isHitboxActive,
  startAttack,
  updateAttack,
  type AttackConfig,
  type HitData,
} from '../logic/attack';
import { computeDamage, directionAway } from '../logic/damage';
import { scaledHp } from '../logic/difficulty';
import {
  enemyAnimKey,
  enemyAnimState,
  type EnemyAnimInput,
  type EnemyAnimState,
} from '../logic/enemyAnim';
import { createBox, placeHitbox, type Box } from '../logic/geometry';
import {
  createHealth,
  isDead,
  isStunned,
  takeDamage,
  updateHealth,
  type HealthState,
} from '../logic/health';
import { hasLineOfSight } from '../logic/lineOfSight';
import { isSolidAt, type ParsedRoom } from '../logic/roomParser';
import { enemyFramePad } from '../systems/enemySprites';
import { ActorShadow } from '../systems/ActorShadow';
import { SlashVisual } from '../systems/SlashVisual';
import type { ProjectileSystem } from '../systems/ProjectileSystem';
import { TILE_SIZE } from '../data/rooms';
import { approachZero } from '../utils/math';

/** Onde fica a caixa de acerto de um inimigo escondido (longe de qualquer sala). */
const HIDDEN_X = -100000;
const BAR_WIDTH = 20;
const BAR_HEIGHT = 3;
const BAR_OFFSET_Y = 6;
/** Folga (px) além do corpo para os sensores de parede e de beira. */
const SENSE_MARGIN = 2;
const LEDGE_DEPTH = 4;
/** Quanto acima dos pés (px) fica o sensor baixo de parede: pega degraus de um bloco. */
const LOW_WALL_PROBE = 3;

/** O que o inimigo sabe do alvo (o jogador). */
export interface EnemyTarget {
  x: number;
  y: number;
  alive: boolean;
}

/** O que o mundo oferece ao inimigo: o terreno e o pool de flechas. */
export interface EnemyWorld {
  room: ParsedRoom;
  arrows: ProjectileSystem;
  /** O chefe entrou na fase 2 (a cena treme a tela e faz um clarão). */
  onBossPhase?: () => void;
  /** O chefe pousou de um salto (poeira e tremor). */
  onBossLand?: (x: number, y: number) => void;
}

export interface EnemyOptions {
  /** Se > 0, o inimigo renasce no ponto de origem depois deste tempo (só a sala de teste usa). */
  respawnMs?: number;
}

/**
 * Base dos inimigos. Esta classe cuida do que é comum (vida, dano, knockback, caixas de
 * acerto, visual); cada tipo só decide o comportamento em `think`, chamando uma IA pura
 * de src/logic/ai. A IA devolve uma "decisão" (`out`) e a base a traduz em movimento.
 */
export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly health: HealthState;
  readonly attack = createAttackState();
  readonly hurtBox: Box = createBox();
  readonly attackBox: Box = createBox();
  /** Último golpe do jogador que já o acertou (cada golpe acerta uma vez só). */
  lastHitSwingId = 0;

  protected readonly sense = createAiSense();
  protected readonly out = createAiOutput();
  protected facing = -1;

  private readonly slash: SlashVisual | null;
  private readonly barBack: Phaser.GameObjects.Rectangle;
  private readonly barFront: Phaser.GameObjects.Rectangle;
  private readonly spawnX: number;
  private readonly spawnY: number;
  private readonly respawnMs: number;
  private respawnTimerMs = 0;
  private blockedFlag = false;
  private clockMs = 0;
  /** O inimigo tem quadros desenhados (os que ainda são blocos lisos não animam). */
  private readonly animated: boolean;
  private readonly animInput: EnemyAnimInput;
  /** Chave de cada animação, montada uma vez (nada de texto novo a cada frame). */
  private readonly animKeys = {} as Record<EnemyAnimState, string>;
  /** Estado da animação em curso: só troca de animação quando ele muda. */
  private animState: EnemyAnimState | null = null;
  private fadeTween: Phaser.Tweens.Tween | null = null;
  /** Estava no chão no frame anterior (para detectar o pouso de um salto). */
  private wasGrounded = true;
  private readonly shadow: ActorShadow | null;

  protected constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    protected readonly def: EnemyBody,
    protected readonly world: EnemyWorld,
    options: EnemyOptions = {},
  ) {
    super(scene, x, y, def.id);
    this.spawnX = x;
    this.spawnY = y;
    this.respawnMs = options.respawnMs ?? 0;
    this.health = createHealth(def.maxHp);
    this.out.facing = this.facing;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(DEPTH.actor);
    // Quem voa não pisa em nada: sem sombra
    this.shadow = def.flying ? null : new ActorShadow(scene, def.width);
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.shadow?.destroy());
    if (def.flying) (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // O quadro do desenho é maior que o corpo de colisão: o corpo fica no centro dele
    const pad = enemyFramePad(def.id);
    this.animated = pad !== undefined;
    for (const state of ENEMY_ANIM_STATES) this.animKeys[state] = enemyAnimKey(def.id, state);
    this.animInput = {
      velX: 0,
      velY: 0,
      flying: def.flying,
      airborne: false,
      attackPhase: 'idle',
      stunned: false,
      dead: false,
    };
    if (pad)
      (this.body as Phaser.Physics.Arcade.Body)
        .setSize(def.width, def.height)
        .setOffset(pad.x, pad.y);

    this.slash = def.meleeShape !== 'none' ? new SlashVisual(scene, SLASH_FX.enemyTint) : null;
    this.barBack = scene.add
      .rectangle(x, y, BAR_WIDTH, BAR_HEIGHT, PALETTE.stoneDark)
      .setOrigin(0, 0.5)
      .setDepth(7);
    this.barFront = scene.add
      .rectangle(x, y, BAR_WIDTH, BAR_HEIGHT, PALETTE.blood)
      .setOrigin(0, 0.5)
      .setDepth(7);
  }

  /** Identificador do tipo de inimigo (o mesmo de src/data/enemies.ts). */
  get enemyId(): string {
    return this.def.id;
  }

  /** É o chefe da fortaleza (a barra de vida e a vitória dependem disso)? */
  get isBoss(): boolean {
    return false;
  }

  /** É o mini-chefe de uma área (também conta como `isBoss`)? */
  get isMiniBoss(): boolean {
    return false;
  }

  get alive(): boolean {
    return !isDead(this.health);
  }

  /** Multiplica o dano que os golpes deste inimigo causam ao herói (a dificuldade da etapa). */
  damageScale = 1;

  /** Ajusta a vida máxima pela dificuldade da etapa (chamado ao nascer, com o inimigo cheio). */
  scaleHealth(hpMult: number): void {
    this.health.maxHp = scaledHp(this.def.maxHp, hpMult);
    this.health.hp = this.health.maxHp;
  }

  /** Golpe em andamento. Chefes com vários golpes sobrescrevem `attackDef` e `attackShape`. */
  get attackConfig(): AttackConfig {
    return this.attackDef;
  }

  protected get attackDef(): AttackConfig {
    return this.def.attack;
  }

  protected get attackShape(): MeleeShape {
    return this.def.meleeShape;
  }

  /** O golpe corpo a corpo está em fase ativa (e este inimigo tem golpe corpo a corpo)? */
  get hitboxLive(): boolean {
    return this.attackShape !== 'none' && isHitboxActive(this.attack);
  }

  /**
   * Aplica um golpe do jogador. Retorna o dano causado (0 se não acertou ou se o escudo bloqueou:
   * nesse caso `consumeBlocked` devolve true, uma vez).
   */
  receiveHit(sourceX: number, cfg: HitData, multiplier: number): number {
    if (this.blocks(sourceX)) {
      this.blockedFlag = true;
      this.onBlocked(sourceX);
      return 0;
    }
    const damage = computeDamage(cfg.damage, multiplier);
    if (
      !takeDamage(
        this.health,
        damage,
        0,
        cfg.stunMs !== undefined && cfg.stunMs > 0 ? cfg.stunMs : this.def.hitStunMs,
      )
    )
      return 0;

    cancelAttack(this.attack);
    this.onAttackFinished();
    const dir = directionAway(sourceX, this.x);
    const scale = this.def.knockbackScale ?? 1;
    this.setVelocity(dir * cfg.knockbackX * scale, cfg.knockbackY * scale);
    if (isDead(this.health)) this.die();
    return damage;
  }

  /** O último golpe foi bloqueado pelo escudo? Lê e apaga o aviso (a cena toca o som e as faíscas). */
  consumeBlocked(): boolean {
    const blocked = this.blockedFlag;
    this.blockedFlag = false;
    return blocked;
  }

  update(dtMs: number, target: EnemyTarget): void {
    if (!this.alive) {
      this.updateDead(dtMs);
      return;
    }

    this.clockMs += dtMs;
    updateHealth(this.health, dtMs);
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (isStunned(this.health)) {
      // Sem controle: o knockback perde velocidade pelo atrito.
      const loss = this.def.knockbackFriction * (dtMs / 1000);
      this.setVelocityX(approachZero(body.velocity.x, loss));
      if (this.def.flying) this.setVelocityY(approachZero(body.velocity.y, loss));
    } else {
      this.fillSense(target, body);
      this.think(dtMs);
      this.facing = this.out.facing;

      if (this.out.startAttack && this.attack.phase === 'idle' && this.mayStartAttack()) {
        startAttack(this.attack);
      }
      if (this.out.fire) this.onFire();

      if (this.def.flying) this.setVelocity(this.out.velX, this.out.velY);
      else this.setVelocityX(this.out.velX);
      // Pulo pedido pela IA (só do chão)
      if (this.out.jumpVelocity < 0 && this.sense.grounded)
        this.setVelocityY(this.out.jumpVelocity);
    }

    const phaseBefore = this.attack.phase;
    updateAttack(this.attack, dtMs, this.attackDef);
    if (phaseBefore !== 'idle' && this.attack.phase === 'idle') this.onAttackFinished();

    this.refreshBoxes(body);
    this.updateVisuals();
    this.shadow?.update(body.center.x, body.bottom, body.blocked.down, true);
    // O chefe pousando de um salto bate no chão
    if (this.isBoss && body.blocked.down && !this.wasGrounded) {
      this.world.onBossLand?.(body.center.x, body.bottom);
    }
    this.wasGrounded = body.blocked.down;
  }

  /** Cada tipo chama a sua IA pura aqui: lê `this.sense` e preenche `this.out`. */
  protected abstract think(dtMs: number): void;

  /** O bando (ou outra regra) autoriza este inimigo a atacar agora? Só consulta. */
  protected attackAllowed(): boolean {
    return true;
  }

  /** Chamado quando a IA pede um ataque: pode negar (ex.: o bando não deixa). */
  protected mayStartAttack(): boolean {
    return true;
  }

  /** O ataque terminou ou foi interrompido (golpe recebido, morte). */
  protected onAttackFinished(): void {}

  /** A IA mandou soltar um projétil (arqueiro). */
  protected onFire(): void {}

  /** Chamado ao renascer, para o tipo reiniciar o estado da sua IA. */
  protected resetAi(): void {}

  /** Para onde o desenho olha (o soldado mostra o lado em que o escudo ainda está). */
  protected visualFacing(): number {
    return this.facing;
  }

  /** O escudo para o golpe que vem de `sourceX`? Só quem tem escudo sobrescreve. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected blocks(_sourceX: number): boolean {
    return false;
  }

  /** O escudo acabou de bloquear um golpe vindo de `sourceX`. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onBlocked(_sourceX: number): void {}

  /** Pode ser acertado agora? Quem se esconde (a raiz dormindo) devolve false. */
  protected hurtable(): boolean {
    return true;
  }

  /** Troca o estado de animação escolhido pelo padrão (a raiz tem fases próprias de parada). */
  protected overrideAnimState(state: EnemyAnimState): EnemyAnimState {
    return state;
  }

  private fillSense(target: EnemyTarget, body: Phaser.Physics.Arcade.Body): void {
    const sense = this.sense;
    sense.dx = target.x - this.x;
    sense.dy = target.y - this.y;
    sense.targetAlive = target.alive;
    sense.attackPhase = this.attack.phase;
    sense.attackAllowed = this.attackAllowed();
    sense.targetVisible =
      !this.def.sightBlocked ||
      this.attack.phase !== 'idle' ||
      hasLineOfSight(this.world.room, this.x, this.y, target.x, target.y, TILE_SIZE);
    sense.grounded = this.def.flying || body.blocked.down;

    if (this.def.flying) {
      sense.wallAhead = false;
      sense.ledgeAhead = false;
      sense.wallBehind = false;
      sense.ledgeBehind = false;
      return;
    }
    // Sensores de terreno na direção em que o inimigo olha: parede na altura do peito
    // e chão logo à frente dos pés.
    const reach = this.def.width / 2 + SENSE_MARGIN;
    const feetY = this.y + this.def.height / 2 + LEDGE_DEPTH;
    const room = this.world.room;
    const aheadX = this.x + this.facing * reach;
    // "Atrás" = o lado oposto ao alvo, que é para onde um recuo iria
    const behindX = this.x - (sense.dx >= 0 ? 1 : -1) * reach;
    // Parede à frente: no peito, nos pés (degrau de um bloco) ou o corpo já está encostado nela
    const lowY = this.y + this.def.height / 2 - LOW_WALL_PROBE;
    sense.wallAhead =
      isSolidAt(room, aheadX, this.y, TILE_SIZE) ||
      isSolidAt(room, aheadX, lowY, TILE_SIZE) ||
      (this.facing > 0 ? body.blocked.right : body.blocked.left);
    sense.ledgeAhead = !isSolidAt(room, aheadX, feetY, TILE_SIZE);
    sense.wallBehind = isSolidAt(room, behindX, this.y, TILE_SIZE);
    sense.ledgeBehind = !isSolidAt(room, behindX, feetY, TILE_SIZE);
  }

  private refreshBoxes(body: Phaser.Physics.Arcade.Body): void {
    const hurt = this.hurtBox;
    hurt.x = body.x;
    hurt.y = body.y;
    hurt.width = body.width;
    hurt.height = body.height;
    if (!this.hurtable()) hurt.x = HIDDEN_X; // escondido: nenhum golpe encontra o corpo

    const hitbox = this.attackDef.hitbox;
    const shape = this.attackShape;
    if (shape === 'front') {
      // body.center: o sprite (this.x/y) só sincroniza com o corpo depois do passo da física
      placeHitbox(
        this.attackBox,
        body.center.x,
        body.center.y,
        this.def.width / 2,
        this.facing,
        hitbox,
      );
    } else if (shape === 'around') {
      // Onda no chão: centrada no inimigo, com a base nos pés
      this.attackBox.width = hitbox.width;
      this.attackBox.height = hitbox.height;
      this.attackBox.x = body.center.x - hitbox.width / 2;
      this.attackBox.y = body.bottom - hitbox.height + hitbox.offsetY;
    } else if (shape === 'body') {
      this.attackBox.width = hitbox.width;
      this.attackBox.height = hitbox.height;
      this.attackBox.x = body.center.x - hitbox.width / 2;
      this.attackBox.y = body.center.y - hitbox.height / 2 + hitbox.offsetY;
    }
  }

  private updateVisuals(): void {
    this.setFlipX(this.visualFacing() < 0);
    this.playAnimation();

    if (isStunned(this.health)) {
      this.setTintFill(PALETTE.playerAccent);
    } else if (this.attack.phase === 'windup') {
      // Telegrafia: pisca em laranja para avisar que o golpe vem aí.
      const flicker = ENEMY_WARN_FLICKER;
      if (Math.floor(this.clockMs / flicker.periodMs) % flicker.litEvery === 0) {
        this.setTintFill(PALETTE.ember);
      } else {
        this.clearTint();
      }
    } else {
      this.clearTint();
    }

    const shape = this.attackShape;
    this.slash?.update(
      isHitboxActive(this.attack) && (shape === 'front' || shape === 'around'),
      this.attackBox,
      this.facing,
      this.attack.elapsedMs / this.attackDef.activeMs,
    );

    const barX = this.x - BAR_WIDTH / 2;
    const barY = this.y - this.def.height / 2 - BAR_OFFSET_Y;
    this.barBack.setPosition(barX, barY);
    this.barFront.setPosition(barX, barY);
    this.barFront.setDisplaySize(BAR_WIDTH * (this.health.hp / this.health.maxHp), BAR_HEIGHT);
    const showBar = this.hurtable();
    this.barBack.setVisible(showBar);
    this.barFront.setVisible(showBar);
  }

  /** Escolhe a animação pelo que o inimigo está fazendo. */
  private playAnimation(): void {
    if (!this.animated) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const input = this.animInput;
    input.velX = body.velocity.x;
    input.velY = body.velocity.y;
    input.attackPhase = this.attack.phase;
    input.stunned = isStunned(this.health);
    input.airborne = !this.def.flying && !body.blocked.down;
    input.dead = false;
    const state = this.overrideAnimState(enemyAnimState(input, ENEMY_WALK_THRESHOLD));
    // Uma animação sem repetição que terminou não pode ser reiniciada por tocar de novo
    if (state === this.animState) return;
    this.animState = state;
    this.anims.play(this.animKeys[state]);
  }

  private updateDead(dtMs: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.shadow?.update(body.center.x, body.bottom, body.blocked.down && this.visible, true);
    if (this.respawnMs <= 0) return;
    this.respawnTimerMs += dtMs;
    if (this.respawnTimerMs >= this.respawnMs) this.respawn();
  }

  private die(): void {
    this.respawnTimerMs = 0;
    const body = this.body as Phaser.Physics.Arcade.Body;
    // Quem anda ainda cai até o chão antes de ficar parado; quem voa se desfaz onde está
    if (this.animated && !this.def.flying) {
      this.setVelocityX(0);
    } else {
      this.setVelocity(0, 0);
      body.enable = false;
    }
    this.slash?.hide();
    this.barBack.setVisible(false);
    this.barFront.setVisible(false);
    this.clearTint();
    if (!this.animated) {
      this.setVisible(false);
      return;
    }
    // Cai no chão, fica um instante e some devagar
    this.animState = 'dead';
    this.anims.play(this.animKeys.dead);
    this.fadeTween = this.scene.tweens.add({
      targets: this,
      alpha: 0,
      delay: ENEMY_DEATH_FADE.holdMs,
      duration: ENEMY_DEATH_FADE.fadeMs,
      onComplete: () => this.setVisible(false),
    });
  }

  private respawn(): void {
    this.health.hp = this.health.maxHp;
    this.health.stunMs = 0;
    this.health.iframeMs = 0;
    this.lastHitSwingId = 0;
    cancelAttack(this.attack);
    this.resetAi();
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    this.fadeTween?.remove();
    this.fadeTween = null;
    this.animState = null;
    this.setAlpha(1);
    this.setPosition(this.spawnX, this.spawnY);
    this.setVelocity(0, 0);
    this.refreshBoxes(body);
    this.setVisible(true);
    this.barBack.setVisible(true);
    this.barFront.setVisible(true);
  }
}
