import { describe, expect, it, vi } from 'vitest';
import { PERFECT_DODGE } from '../src/data/combat';
import { createAttackState } from '../src/logic/attack';
import { CombatSystem, type CombatEvents } from '../src/systems/CombatSystem';
import type { Enemy } from '../src/entities/Enemy';
import type { Player } from '../src/entities/Player';

const ENEMY_HIT = { damage: 15, knockbackX: 100, knockbackY: -50 };
const SWORD = { damage: 10, knockbackX: 100, knockbackY: -50, shape: 'front', lifeSteal: 0 };

/** Jogador falso: só o que o CombatSystem lê e chama. */
function fakePlayer(overrides: Record<string, unknown> = {}) {
  const player = {
    x: 100,
    attack: createAttackState(),
    attackBox: { x: 104, y: 0, width: 28, height: 22 },
    hurtBox: { x: 94, y: 0, width: 12, height: 22 },
    currentAttack: SWORD as Record<string, unknown>,
    swingMultiplier: 1,
    swingEmpowered: false,
    pendingSwapStrike: null as { damage: number; radius: number } | null,
    barrier: { live: false, box: { x: 0, y: 0, width: 6, height: 40 } },
    rollElapsedMs: 0,
    dodgeWindowMs: PERFECT_DODGE.windowMs,
    // Como a entidade real: o golpe só vale na fase ativa e se tem forma
    get hitboxLive(): boolean {
      return this.attack.phase === 'active' && this.currentAttack.shape !== 'none';
    },
    isDead: () => false,
    isRollInvulnerable: () => false,
    receiveHit: vi.fn(() => 15),
    notifyHit: vi.fn(),
    heal: vi.fn(() => 0),
    ...overrides,
  };
  return player;
}

/** Inimigo falso, em cima do jogador por padrão (as caixas se sobrepõem). */
function fakeEnemy(overrides: Record<string, unknown> = {}) {
  const enemy = {
    x: 120,
    alive: true,
    lastHitSwingId: 0,
    attack: createAttackState(),
    attackConfig: ENEMY_HIT,
    attackBox: { x: 90, y: 0, width: 44, height: 26 },
    hurtBox: { x: 112, y: 0, width: 16, height: 26 },
    receiveHit: vi.fn(() => 10),
    get hitboxLive(): boolean {
      return this.attack.phase === 'active';
    },
    ...overrides,
  };
  return enemy;
}

function fakeArrow(overrides: Record<string, unknown> = {}) {
  return {
    live: true,
    resolved: false,
    x: 100,
    box: { x: 96, y: 5, width: 10, height: 3 },
    cfg: { damage: 10, knockbackX: 120, knockbackY: -70 },
    multiplier: 1,
    empowered: false,
    despawn: vi.fn(),
    ...overrides,
  };
}

function setup(
  player: ReturnType<typeof fakePlayer>,
  enemies: ReturnType<typeof fakeEnemy>[],
  arrows: ReturnType<typeof fakeArrow>[] = [],
  bolts: ReturnType<typeof fakeArrow>[] = [],
) {
  const events: CombatEvents = {
    onEnemyHit: vi.fn(),
    onEnemyKilled: vi.fn(),
    onPlayerHit: vi.fn(),
    onPerfectDodge: vi.fn(),
    onProjectileBlocked: vi.fn(),
    onSwapStrike: vi.fn(),
  };
  const combat = new CombatSystem(
    player as unknown as Player,
    enemies as unknown as Enemy[],
    { pool: arrows } as never,
    { pool: bolts } as never,
    events,
  );
  return { combat, events };
}

describe('CombatSystem: golpe do jogador', () => {
  it('acerta o inimigo uma única vez por golpe', () => {
    const player = fakePlayer();
    player.attack.phase = 'active';
    player.attack.swingId = 7;
    const enemy = fakeEnemy();
    const { combat, events } = setup(player, [enemy]);

    combat.update();
    combat.update();

    expect(enemy.receiveHit).toHaveBeenCalledTimes(1);
    expect(events.onEnemyHit).toHaveBeenCalledTimes(1);
    expect(player.notifyHit).toHaveBeenCalledTimes(1);
    expect(enemy.lastHitSwingId).toBe(7);
  });

  it('um novo golpe (outro swingId) acerta de novo', () => {
    const player = fakePlayer();
    player.attack.phase = 'active';
    player.attack.swingId = 1;
    const enemy = fakeEnemy();
    const { combat } = setup(player, [enemy]);

    combat.update();
    player.attack.swingId = 2;
    combat.update();

    expect(enemy.receiveHit).toHaveBeenCalledTimes(2);
  });

  it('acerta todos os inimigos no alcance, cada um uma vez', () => {
    const player = fakePlayer();
    player.attack.phase = 'active';
    player.attack.swingId = 5;
    const a = fakeEnemy();
    const b = fakeEnemy();
    const { combat } = setup(player, [a, b]);

    combat.update();
    combat.update();

    expect(a.receiveHit).toHaveBeenCalledTimes(1);
    expect(b.receiveHit).toHaveBeenCalledTimes(1);
  });

  it('usa o dano e o multiplicador do golpe em andamento e sinaliza golpe potencializado', () => {
    const player = fakePlayer({
      swingMultiplier: PERFECT_DODGE.damageMultiplier,
      swingEmpowered: true,
    });
    player.attack.phase = 'active';
    player.attack.swingId = 3;
    const enemy = fakeEnemy();
    const { combat, events } = setup(player, [enemy]);

    combat.update();

    expect(enemy.receiveHit).toHaveBeenCalledWith(100, SWORD, PERFECT_DODGE.damageMultiplier);
    expect(events.onEnemyHit).toHaveBeenCalledWith(expect.anything(), 10, true);
  });

  it('a passiva de dano (multiplicador sem esquiva perfeita) não conta como golpe potencializado', () => {
    const player = fakePlayer({ swingMultiplier: 1.15, swingEmpowered: false });
    player.attack.phase = 'active';
    player.attack.swingId = 3;
    const { combat, events } = setup(player, [fakeEnemy()]);

    combat.update();

    expect(events.onEnemyHit).toHaveBeenCalledWith(expect.anything(), 10, false);
  });

  it('não acerta fora da fase ativa nem sem sobreposição', () => {
    const player = fakePlayer();
    player.attack.phase = 'windup';
    const enemy = fakeEnemy();
    const { combat } = setup(player, [enemy]);
    combat.update();
    expect(enemy.receiveHit).not.toHaveBeenCalled();

    player.attack.phase = 'active';
    player.attack.swingId = 9;
    enemy.hurtBox.x = 500;
    combat.update();
    expect(enemy.receiveHit).not.toHaveBeenCalled();
  });

  it('golpe sem forma (raio do Tomo, barreira) não acerta pela caixa', () => {
    const player = fakePlayer({ currentAttack: { ...SWORD, shape: 'none' } });
    player.attack.phase = 'active';
    player.attack.swingId = 2;
    const enemy = fakeEnemy();
    const { combat } = setup(player, [enemy]);

    combat.update();

    expect(enemy.receiveHit).not.toHaveBeenCalled();
  });

  it('ignora inimigos mortos', () => {
    const player = fakePlayer();
    player.attack.phase = 'active';
    player.attack.swingId = 4;
    const enemy = fakeEnemy({ alive: false });
    const { combat } = setup(player, [enemy]);
    combat.update();
    expect(enemy.receiveHit).not.toHaveBeenCalled();
  });

  it('avisa quando o golpe derruba o inimigo', () => {
    const player = fakePlayer();
    player.attack.phase = 'active';
    player.attack.swingId = 6;
    const enemy = fakeEnemy();
    enemy.receiveHit = vi.fn(() => {
      enemy.alive = false;
      return 10;
    });
    const { combat, events } = setup(player, [enemy]);

    combat.update();

    expect(events.onEnemyKilled).toHaveBeenCalledWith(enemy);
  });

  it('roubo de vida (Foice): devolve parte do dano causado como vida', () => {
    const player = fakePlayer({ currentAttack: { ...SWORD, lifeSteal: 0.5 } });
    player.attack.phase = 'active';
    player.attack.swingId = 8;
    const { combat } = setup(player, [fakeEnemy()]);

    combat.update();

    expect(player.heal).toHaveBeenCalledWith(5); // 10 de dano * 0,5
  });

  it('sem roubo de vida não cura', () => {
    const player = fakePlayer();
    player.attack.phase = 'active';
    player.attack.swingId = 8;
    const { combat } = setup(player, [fakeEnemy()]);

    combat.update();

    expect(player.heal).not.toHaveBeenCalled();
  });
});

describe('CombatSystem: golpe de troca', () => {
  it('acerta os inimigos dentro do alcance, dispara o evento e consome o golpe pendente', () => {
    const strike = { damage: 8, knockbackX: 1, knockbackY: 1, radius: 40, stunMs: 0 };
    const player = fakePlayer({ pendingSwapStrike: strike });
    const near = fakeEnemy({ hurtBox: { x: 120, y: 0, width: 16, height: 26 } });
    const far = fakeEnemy({ hurtBox: { x: 300, y: 0, width: 16, height: 26 } });
    const { combat, events } = setup(player, [near, far]);

    combat.update();

    expect(near.receiveHit).toHaveBeenCalledWith(100, strike, 1);
    // O golpe de troca não registra um acerto novo (senão ele se rearmaria sozinho)
    expect(player.notifyHit).not.toHaveBeenCalled();
    expect(far.receiveHit).not.toHaveBeenCalled();
    expect(events.onSwapStrike).toHaveBeenCalledWith(strike);
    expect(player.pendingSwapStrike).toBeNull();

    combat.update();
    expect(near.receiveHit).toHaveBeenCalledTimes(1);
  });

  it('sem golpe pendente nada acontece', () => {
    const player = fakePlayer();
    const { combat, events } = setup(player, [fakeEnemy()]);
    combat.update();
    expect(events.onSwapStrike).not.toHaveBeenCalled();
  });
});

describe('CombatSystem: raios do jogador', () => {
  it('o raio acerta o inimigo com o multiplicador do disparo e some', () => {
    const player = fakePlayer();
    const enemy = fakeEnemy();
    const bolt = fakeArrow({
      x: 110,
      box: { x: 112, y: 5, width: 8, height: 8 },
      multiplier: 2,
      empowered: true,
    });
    const { combat, events } = setup(player, [enemy], [], [bolt]);

    combat.update();

    expect(enemy.receiveHit).toHaveBeenCalledWith(110, bolt.cfg, 2);
    expect(events.onEnemyHit).toHaveBeenCalledWith(enemy, 10, true);
    expect(bolt.despawn).toHaveBeenCalledTimes(1);
  });

  it('o raio acerta só o primeiro inimigo e ignora raios desligados', () => {
    const player = fakePlayer();
    const a = fakeEnemy();
    const b = fakeEnemy();
    const bolt = fakeArrow({ box: { x: 112, y: 5, width: 8, height: 8 } });
    const off = fakeArrow({ live: false, box: { x: 112, y: 5, width: 8, height: 8 } });
    const { combat } = setup(player, [a, b], [], [bolt, off]);

    combat.update();

    expect(a.receiveHit).toHaveBeenCalledTimes(1);
    expect(b.receiveHit).not.toHaveBeenCalled();
    expect(off.despawn).not.toHaveBeenCalled();
  });
});

describe('CombatSystem: golpe do inimigo', () => {
  it('causa dano no jogador e resolve o golpe uma única vez', () => {
    const player = fakePlayer();
    const enemy = fakeEnemy();
    enemy.attack.phase = 'active';
    const { combat, events } = setup(player, [enemy]);

    combat.update();
    combat.update();

    expect(player.receiveHit).toHaveBeenCalledTimes(1);
    expect(player.receiveHit).toHaveBeenCalledWith(enemy.x, ENEMY_HIT);
    expect(events.onPlayerHit).toHaveBeenCalledWith(15);
    expect(enemy.attack.resolved).toBe(true);
  });

  it('não resolve o golpe se ele ainda não alcançou o jogador', () => {
    const player = fakePlayer();
    const enemy = fakeEnemy();
    enemy.attack.phase = 'active';
    enemy.attackBox.x = 400;
    const { combat } = setup(player, [enemy]);

    combat.update();

    expect(enemy.attack.resolved).toBe(false);
    expect(player.receiveHit).not.toHaveBeenCalled();
  });

  it('inimigo sem golpe corpo a corpo (arqueiro) nunca acerta pela caixa', () => {
    const player = fakePlayer();
    const enemy = fakeEnemy({ hitboxLive: false });
    enemy.attack.phase = 'active';
    const { combat } = setup(player, [enemy]);

    combat.update();

    expect(player.receiveHit).not.toHaveBeenCalled();
  });

  it('esquiva perfeita: rolagem dentro da janela dispara o evento e não causa dano', () => {
    const player = fakePlayer({
      isRollInvulnerable: () => true,
      rollElapsedMs: PERFECT_DODGE.windowMs,
    });
    const enemy = fakeEnemy();
    enemy.attack.phase = 'active';
    const { combat, events } = setup(player, [enemy]);

    combat.update();

    expect(events.onPerfectDodge).toHaveBeenCalledTimes(1);
    expect(player.receiveHit).not.toHaveBeenCalled();
    expect(enemy.attack.resolved).toBe(true);
  });

  it('rolagem fora da janela esquiva sem bônus, e o golpe é consumido', () => {
    const player = fakePlayer({
      isRollInvulnerable: () => true,
      rollElapsedMs: PERFECT_DODGE.windowMs + 1,
    });
    const enemy = fakeEnemy();
    enemy.attack.phase = 'active';
    const { combat, events } = setup(player, [enemy]);

    combat.update();

    expect(events.onPerfectDodge).not.toHaveBeenCalled();
    expect(player.receiveHit).not.toHaveBeenCalled();
    expect(enemy.attack.resolved).toBe(true);
  });

  it('não faz nada se o jogador está morto', () => {
    const player = fakePlayer({ isDead: () => true });
    const enemy = fakeEnemy();
    enemy.attack.phase = 'active';
    const { combat } = setup(player, [enemy]);

    combat.update();

    expect(player.receiveHit).not.toHaveBeenCalled();
    expect(enemy.attack.resolved).toBe(false);
  });

  it('dano zero (invulnerabilidade pós-golpe) não dispara o evento de dano', () => {
    const player = fakePlayer({ receiveHit: vi.fn(() => 0) });
    const enemy = fakeEnemy();
    enemy.attack.phase = 'active';
    const { combat, events } = setup(player, [enemy]);

    combat.update();

    expect(events.onPlayerHit).not.toHaveBeenCalled();
    expect(enemy.attack.resolved).toBe(true);
  });
});

describe('CombatSystem: flechas', () => {
  it('a flecha que acerta causa dano e some', () => {
    const player = fakePlayer();
    const arrow = fakeArrow();
    const { combat, events } = setup(player, [], [arrow]);

    combat.update();

    expect(player.receiveHit).toHaveBeenCalledWith(arrow.x, arrow.cfg);
    expect(events.onPlayerHit).toHaveBeenCalledWith(15);
    expect(arrow.despawn).toHaveBeenCalledTimes(1);
  });

  it('flecha esquivada pela rolagem segue voando e não acerta de novo', () => {
    const player = fakePlayer({
      isRollInvulnerable: () => true,
      rollElapsedMs: 40,
    });
    const arrow = fakeArrow();
    const { combat, events } = setup(player, [], [arrow]);

    combat.update();
    player.isRollInvulnerable = () => false; // a rolagem acabou com a flecha ainda sobre o jogador
    combat.update();

    expect(events.onPerfectDodge).toHaveBeenCalledTimes(1);
    expect(arrow.despawn).not.toHaveBeenCalled();
    expect(player.receiveHit).not.toHaveBeenCalled();
    expect(arrow.resolved).toBe(true);
  });

  it('ignora flechas desligadas ou longe do jogador', () => {
    const player = fakePlayer();
    const off = fakeArrow({ live: false });
    const far = fakeArrow({ box: { x: 400, y: 5, width: 10, height: 3 } });
    const { combat } = setup(player, [], [off, far]);

    combat.update();

    expect(player.receiveHit).not.toHaveBeenCalled();
    expect(far.resolved).toBe(false);
  });

  it('a barreira ligada para a flecha antes de ela chegar ao jogador', () => {
    const player = fakePlayer({
      barrier: { live: true, box: { x: 90, y: 0, width: 30, height: 40 } },
    });
    const arrow = fakeArrow();
    const { combat, events } = setup(player, [], [arrow]);

    combat.update();

    expect(events.onProjectileBlocked).toHaveBeenCalledWith(arrow);
    expect(arrow.despawn).toHaveBeenCalledTimes(1);
    expect(player.receiveHit).not.toHaveBeenCalled();
  });

  it('barreira desligada não bloqueia nada', () => {
    const player = fakePlayer({
      barrier: { live: false, box: { x: 90, y: 0, width: 30, height: 40 } },
    });
    const arrow = fakeArrow();
    const { combat, events } = setup(player, [], [arrow]);

    combat.update();

    expect(events.onProjectileBlocked).not.toHaveBeenCalled();
    expect(player.receiveHit).toHaveBeenCalledTimes(1);
  });
});
