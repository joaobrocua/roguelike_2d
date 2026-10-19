/**
 * Relíquias. O jogador carrega duas e alterna entre elas; cada uma define o ataque básico,
 * um ataque especial com recarga, um bônus passivo e um golpe de troca.
 * Tempos em ms, velocidades em px/s, distâncias em px.
 */
import type { AttackConfig, ProjectileData } from '../logic/attack';
import { PALETTE } from './palette';

export type RelicId =
  | 'lamina'
  | 'martelo'
  | 'foice'
  | 'tomo'
  | 'adaga'
  | 'lanca'
  | 'machado'
  | 'arco'
  | 'mangual'
  | 'laminas'
  | 'escudo'
  | 'chicote'
  | 'cajado'
  | 'besta';

/** Onde o golpe acerta: na frente, no próprio corpo (investida), em volta dos pés ou em lugar nenhum. */
export type AttackShape = 'front' | 'body' | 'around' | 'none';

export interface PlayerAttackDef extends AttackConfig {
  shape: AttackShape;
  /** Fração da velocidade de andar durante o golpe. */
  moveFactor: number;
  /** Velocidade horizontal imposta na fase ativa (investida); 0 = nenhuma. */
  lungeSpeed: number;
  /** Fração do dano causado que volta como vida. */
  lifeSteal: number;
  /** Projétil lançado no começo da fase ativa (o Tomo, o arco, o cajado e a besta). */
  projectile?: ProjectileData;
  /** Vários projéteis de uma vez (o leque do cajado); vale no lugar de `projectile`. */
  projectiles?: readonly ProjectileData[];
}

export type SpecialKind = 'dash' | 'slam' | 'drain' | 'barrier' | 'shot' | 'guard' | 'pull';

export interface SpecialDef {
  kind: SpecialKind;
  cooldownMs: number;
  attack: PlayerAttackDef;
  /** Só para a barreira: duração, tamanho e distância à frente do jogador. */
  barrier?: { durationMs: number; width: number; height: number; offsetX: number };
  /**
   * Só para a guarda do escudo: durante a fase ativa do especial os golpes que vêm de frente são
   * bloqueados; bloquear nos primeiros `parryMs` (a defesa perfeita) dá o bônus da esquiva perfeita.
   */
  guard?: { parryMs: number };
}

/** Multiplicadores que a relíquia ATIVA aplica ao jogador. */
export interface PassiveStats {
  moveSpeedMult: number;
  damageMult: number;
  damageTakenMult: number;
  /** Multiplica a recarga dos especiais (menor = recarrega mais rápido). */
  cooldownMult: number;
}

/** Golpe curto em área disparado ao trocar de relíquia no momento certo. */
export interface SwapStrikeDef {
  damage: number;
  knockbackX: number;
  knockbackY: number;
  /** Alcance, a partir do centro do jogador, nos dois lados. */
  radius: number;
  stunMs: number;
}

export interface RelicDef {
  id: RelicId;
  name: string;
  passiveText: string;
  /** Frases curtas para as telas de escolha: o que o golpe básico e o especial fazem. */
  summary: { basic: string; special: string };
  /** A arma flutua ao lado do herói em vez de ser empunhada (o Tomo). */
  floatingWeapon: boolean;
  /** Cor da relíquia no HUD, nos itens e no golpe de troca. */
  color: number;
  basic: {
    /** Golpes do combo, em ordem. Um só = sem combo. */
    steps: readonly PlayerAttackDef[];
    /** Tempo após um golpe terminar em que o próximo continua o combo. */
    comboWindowMs: number;
  };
  special: SpecialDef;
  passive: PassiveStats;
  swapStrike: SwapStrikeDef;
}

const NO_HITBOX = { width: 0, height: 0, offsetY: 0 } as const;

export const LAMINA_DO_VIGIA: RelicDef = {
  id: 'lamina',
  name: 'Lâmina do Vigia',
  passiveText: '+12% de velocidade',
  floatingWeapon: false,
  summary: { basic: 'Combo de 3 golpes', special: 'Investida que atravessa' },
  color: PALETTE.player,
  basic: {
    comboWindowMs: 380,
    steps: [
      {
        windupMs: 60,
        activeMs: 90,
        recoveryMs: 110,
        damage: 9,
        knockbackX: 110,
        knockbackY: -50,
        hitbox: { width: 28, height: 22, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.5,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
      {
        windupMs: 60,
        activeMs: 90,
        recoveryMs: 110,
        damage: 9,
        knockbackX: 120,
        knockbackY: -50,
        hitbox: { width: 28, height: 22, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.5,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
      {
        windupMs: 90,
        activeMs: 120,
        recoveryMs: 220,
        damage: 16,
        knockbackX: 210,
        knockbackY: -90,
        hitbox: { width: 34, height: 26, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.35,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
    ],
  },
  special: {
    kind: 'dash',
    cooldownMs: 3500,
    attack: {
      windupMs: 60,
      activeMs: 200,
      recoveryMs: 140,
      damage: 14,
      knockbackX: 160,
      knockbackY: -80,
      hitbox: { width: 26, height: 22, offsetY: 0 },
      shape: 'body',
      moveFactor: 0,
      lungeSpeed: 240,
      lifeSteal: 0,
    },
  },
  passive: { moveSpeedMult: 1.12, damageMult: 1, damageTakenMult: 1, cooldownMult: 1 },
  swapStrike: { damage: 8, knockbackX: 140, knockbackY: -80, radius: 38, stunMs: 0 },
};

export const MARTELO_SEPULCRAL: RelicDef = {
  id: 'martelo',
  name: 'Martelo Sepulcral',
  passiveText: '-20% dano sofrido',
  floatingWeapon: false,
  summary: { basic: 'Golpe lento e pesado', special: 'Impacto que atordoa' },
  color: PALETTE.ember,
  basic: {
    comboWindowMs: 0,
    steps: [
      {
        windupMs: 240,
        activeMs: 120,
        recoveryMs: 320,
        damage: 26,
        knockbackX: 280,
        knockbackY: -120,
        hitbox: { width: 34, height: 30, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.25,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
    ],
  },
  special: {
    kind: 'slam',
    cooldownMs: 7000,
    attack: {
      windupMs: 260,
      activeMs: 120,
      recoveryMs: 280,
      damage: 14,
      knockbackX: 80,
      knockbackY: -140,
      hitbox: { width: 96, height: 28, offsetY: 0 },
      shape: 'around',
      moveFactor: 0,
      lungeSpeed: 0,
      lifeSteal: 0,
      stunMs: 1100,
    },
  },
  passive: { moveSpeedMult: 1, damageMult: 1, damageTakenMult: 0.8, cooldownMult: 1 },
  swapStrike: { damage: 14, knockbackX: 200, knockbackY: -110, radius: 44, stunMs: 500 },
};

export const FOICE_DA_NEVOA: RelicDef = {
  id: 'foice',
  name: 'Foice da Névoa',
  passiveText: '+15% de dano',
  floatingWeapon: false,
  summary: { basic: 'Alcance longo e veloz', special: 'Rouba vida dos inimigos' },
  color: PALETTE.soul,
  basic: {
    comboWindowMs: 300,
    steps: [
      {
        windupMs: 45,
        activeMs: 80,
        recoveryMs: 100,
        damage: 7,
        knockbackX: 80,
        knockbackY: -40,
        hitbox: { width: 46, height: 20, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.6,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
      {
        windupMs: 45,
        activeMs: 80,
        recoveryMs: 120,
        damage: 7,
        knockbackX: 90,
        knockbackY: -40,
        hitbox: { width: 46, height: 20, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.6,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
    ],
  },
  special: {
    kind: 'drain',
    cooldownMs: 5000,
    attack: {
      windupMs: 120,
      activeMs: 160,
      recoveryMs: 220,
      damage: 12,
      knockbackX: 100,
      knockbackY: -60,
      hitbox: { width: 62, height: 26, offsetY: -2 },
      shape: 'front',
      moveFactor: 0.2,
      lungeSpeed: 0,
      lifeSteal: 0.7,
    },
  },
  passive: { moveSpeedMult: 1, damageMult: 1.15, damageTakenMult: 1, cooldownMult: 1 },
  swapStrike: { damage: 6, knockbackX: 90, knockbackY: -60, radius: 52, stunMs: 0 },
};

export const TOMO_CINZENTO: RelicDef = {
  id: 'tomo',
  name: 'Tomo Cinzento',
  passiveText: 'Recarga -20%',
  floatingWeapon: true,
  summary: { basic: 'Raio à distância', special: 'Barreira anti-flechas' },
  color: PALETTE.wraith,
  basic: {
    comboWindowMs: 0,
    steps: [
      {
        windupMs: 130,
        activeMs: 60,
        recoveryMs: 200,
        damage: 0,
        knockbackX: 0,
        knockbackY: 0,
        hitbox: NO_HITBOX,
        shape: 'none',
        moveFactor: 0.6,
        lungeSpeed: 0,
        lifeSteal: 0,
        projectile: {
          speed: 230,
          lifeMs: 900,
          width: 8,
          height: 8,
          damage: 9,
          knockbackX: 90,
          knockbackY: -40,
          spawnOffsetY: -2,
        },
      },
    ],
  },
  special: {
    kind: 'barrier',
    cooldownMs: 8000,
    attack: {
      windupMs: 120,
      activeMs: 80,
      recoveryMs: 150,
      damage: 0,
      knockbackX: 0,
      knockbackY: 0,
      hitbox: NO_HITBOX,
      shape: 'none',
      moveFactor: 0.4,
      lungeSpeed: 0,
      lifeSteal: 0,
    },
    barrier: { durationMs: 3000, width: 6, height: 40, offsetX: 16 },
  },
  passive: { moveSpeedMult: 1, damageMult: 1, damageTakenMult: 1, cooldownMult: 0.8 },
  swapStrike: { damage: 7, knockbackX: 110, knockbackY: -70, radius: 60, stunMs: 0 },
};

export const ADAGA_SOMBRIA: RelicDef = {
  id: 'adaga',
  name: 'Adaga Sombria',
  passiveText: '+18% de velocidade',
  floatingWeapon: false,
  summary: { basic: 'Combo rápido de 4 golpes', special: 'Investida curta e veloz' },
  color: PALETTE.glow,
  basic: {
    comboWindowMs: 260,
    steps: [
      {
        windupMs: 35,
        activeMs: 60,
        recoveryMs: 70,
        damage: 5,
        knockbackX: 60,
        knockbackY: -30,
        hitbox: { width: 24, height: 20, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.7,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
      {
        windupMs: 35,
        activeMs: 60,
        recoveryMs: 70,
        damage: 5,
        knockbackX: 60,
        knockbackY: -30,
        hitbox: { width: 24, height: 20, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.7,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
      {
        windupMs: 35,
        activeMs: 60,
        recoveryMs: 70,
        damage: 5,
        knockbackX: 70,
        knockbackY: -30,
        hitbox: { width: 24, height: 20, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.7,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
      {
        windupMs: 50,
        activeMs: 80,
        recoveryMs: 150,
        damage: 8,
        knockbackX: 140,
        knockbackY: -60,
        hitbox: { width: 28, height: 22, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.5,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
    ],
  },
  special: {
    kind: 'dash',
    cooldownMs: 2500,
    attack: {
      windupMs: 40,
      activeMs: 150,
      recoveryMs: 100,
      damage: 9,
      knockbackX: 120,
      knockbackY: -60,
      hitbox: { width: 22, height: 20, offsetY: 0 },
      shape: 'body',
      moveFactor: 0,
      lungeSpeed: 300,
      lifeSteal: 0,
    },
  },
  passive: { moveSpeedMult: 1.18, damageMult: 1, damageTakenMult: 1, cooldownMult: 1 },
  swapStrike: { damage: 5, knockbackX: 70, knockbackY: -50, radius: 34, stunMs: 0 },
};

export const LANCA_VIGILANTE: RelicDef = {
  id: 'lanca',
  name: 'Lança Vigilante',
  passiveText: '-10% dano sofrido',
  floatingWeapon: false,
  summary: { basic: 'Estocada de longe', special: 'Arremetida que perfura' },
  color: PALETTE.mist,
  basic: {
    comboWindowMs: 0,
    steps: [
      {
        windupMs: 110,
        activeMs: 90,
        recoveryMs: 200,
        damage: 15,
        knockbackX: 170,
        knockbackY: -40,
        hitbox: { width: 52, height: 14, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.3,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
    ],
  },
  special: {
    kind: 'dash',
    cooldownMs: 5000,
    attack: {
      windupMs: 120,
      activeMs: 260,
      recoveryMs: 180,
      damage: 20,
      knockbackX: 200,
      knockbackY: -70,
      hitbox: { width: 40, height: 16, offsetY: -2 },
      shape: 'body',
      moveFactor: 0,
      lungeSpeed: 280,
      lifeSteal: 0,
    },
  },
  passive: { moveSpeedMult: 1, damageMult: 1, damageTakenMult: 0.9, cooldownMult: 1 },
  swapStrike: { damage: 9, knockbackX: 150, knockbackY: -70, radius: 44, stunMs: 0 },
};

export const MACHADO_RACHADOR: RelicDef = {
  id: 'machado',
  name: 'Machado Rachador',
  passiveText: '+15% de dano',
  floatingWeapon: false,
  summary: { basic: 'Dois golpes pesados', special: 'Giro que acerta em volta' },
  color: PALETTE.blood,
  basic: {
    comboWindowMs: 400,
    steps: [
      {
        windupMs: 150,
        activeMs: 100,
        recoveryMs: 200,
        damage: 16,
        knockbackX: 190,
        knockbackY: -90,
        hitbox: { width: 36, height: 30, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.3,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
      {
        windupMs: 180,
        activeMs: 120,
        recoveryMs: 320,
        damage: 22,
        knockbackX: 260,
        knockbackY: -120,
        hitbox: { width: 40, height: 32, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.25,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
    ],
  },
  special: {
    kind: 'slam',
    cooldownMs: 6000,
    attack: {
      windupMs: 180,
      activeMs: 140,
      recoveryMs: 260,
      damage: 18,
      knockbackX: 160,
      knockbackY: -120,
      hitbox: { width: 70, height: 30, offsetY: 0 },
      shape: 'around',
      moveFactor: 0,
      lungeSpeed: 0,
      lifeSteal: 0,
    },
  },
  passive: { moveSpeedMult: 1, damageMult: 1.15, damageTakenMult: 1, cooldownMult: 1 },
  swapStrike: { damage: 12, knockbackX: 180, knockbackY: -100, radius: 42, stunMs: 300 },
};

export const ARCO_DE_OSSO: RelicDef = {
  id: 'arco',
  name: 'Arco de Osso',
  passiveText: '+10% de dano',
  floatingWeapon: false,
  summary: { basic: 'Flecha rápida de longe', special: 'Flecha pesada' },
  color: PALETTE.bone,
  basic: {
    comboWindowMs: 0,
    steps: [
      {
        windupMs: 90,
        activeMs: 50,
        recoveryMs: 170,
        damage: 0,
        knockbackX: 0,
        knockbackY: 0,
        hitbox: NO_HITBOX,
        shape: 'none',
        moveFactor: 0.6,
        lungeSpeed: 0,
        lifeSteal: 0,
        projectile: {
          speed: 320,
          lifeMs: 1000,
          width: 8,
          height: 6,
          damage: 8,
          knockbackX: 70,
          knockbackY: -30,
          spawnOffsetY: -2,
        },
      },
    ],
  },
  special: {
    kind: 'shot',
    cooldownMs: 4500,
    attack: {
      windupMs: 260,
      activeMs: 60,
      recoveryMs: 220,
      damage: 0,
      knockbackX: 0,
      knockbackY: 0,
      hitbox: NO_HITBOX,
      shape: 'none',
      moveFactor: 0.2,
      lungeSpeed: 0,
      lifeSteal: 0,
      projectile: {
        speed: 380,
        lifeMs: 1200,
        width: 10,
        height: 8,
        damage: 24,
        knockbackX: 220,
        knockbackY: -80,
        spawnOffsetY: -2,
        stunMs: 500,
      },
    },
  },
  passive: { moveSpeedMult: 1, damageMult: 1.1, damageTakenMult: 1, cooldownMult: 1 },
  swapStrike: { damage: 6, knockbackX: 90, knockbackY: -60, radius: 48, stunMs: 0 },
};

export const MANGUAL_CINEREO: RelicDef = {
  id: 'mangual',
  name: 'Mangual Cinéreo',
  passiveText: 'Recarga -25%',
  floatingWeapon: false,
  summary: { basic: 'Golpe e giro em volta', special: 'Rodopio que empurra' },
  color: PALETTE.stoneLight,
  basic: {
    comboWindowMs: 340,
    steps: [
      {
        windupMs: 130,
        activeMs: 100,
        recoveryMs: 180,
        damage: 11,
        knockbackX: 140,
        knockbackY: -60,
        hitbox: { width: 44, height: 24, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.4,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
      {
        windupMs: 140,
        activeMs: 120,
        recoveryMs: 260,
        damage: 14,
        knockbackX: 180,
        knockbackY: -70,
        hitbox: { width: 72, height: 26, offsetY: 0 },
        shape: 'around',
        moveFactor: 0.3,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
    ],
  },
  special: {
    kind: 'slam',
    cooldownMs: 4000,
    attack: {
      windupMs: 100,
      activeMs: 160,
      recoveryMs: 200,
      damage: 10,
      knockbackX: 260,
      knockbackY: -60,
      hitbox: { width: 84, height: 28, offsetY: 0 },
      shape: 'around',
      moveFactor: 0,
      lungeSpeed: 0,
      lifeSteal: 0,
    },
  },
  passive: { moveSpeedMult: 1, damageMult: 1, damageTakenMult: 1, cooldownMult: 0.75 },
  swapStrike: { damage: 8, knockbackX: 220, knockbackY: -60, radius: 50, stunMs: 0 },
};

export const LAMINAS_GEMEAS: RelicDef = {
  id: 'laminas',
  name: 'Lâminas Gêmeas',
  passiveText: '+10% de velocidade',
  summary: { basic: 'Combo veloz de 5 golpes', special: 'Redemoinho de lâminas' },
  floatingWeapon: false,
  color: PALETTE.playerAccent,
  basic: {
    comboWindowMs: 300,
    steps: [0, 1, 2, 3, 4].map((i) => ({
      windupMs: 40,
      activeMs: i === 4 ? 80 : 60,
      recoveryMs: i === 4 ? 150 : 80,
      damage: i === 4 ? 8 : 5,
      knockbackX: i === 4 ? 150 : 70,
      knockbackY: i === 4 ? -70 : -30,
      hitbox: { width: i === 4 ? 34 : 26, height: 22, offsetY: -2 },
      shape: 'front' as const,
      moveFactor: 0.6,
      lungeSpeed: 0,
      lifeSteal: 0,
    })),
  },
  special: {
    kind: 'slam',
    cooldownMs: 3500,
    attack: {
      windupMs: 70,
      activeMs: 130,
      recoveryMs: 160,
      damage: 11,
      knockbackX: 160,
      knockbackY: -70,
      hitbox: { width: 66, height: 26, offsetY: 0 },
      shape: 'around',
      moveFactor: 0.3,
      lungeSpeed: 0,
      lifeSteal: 0,
    },
  },
  passive: { moveSpeedMult: 1.1, damageMult: 1, damageTakenMult: 1, cooldownMult: 1 },
  swapStrike: { damage: 8, knockbackX: 120, knockbackY: -70, radius: 44, stunMs: 0 },
};

export const ESPADA_E_ESCUDO: RelicDef = {
  id: 'escudo',
  name: 'Espada e Escudo',
  passiveText: '-10% dano recebido',
  summary: { basic: 'Corte e golpe de escudo', special: 'Bloqueia de frente' },
  floatingWeapon: false,
  color: PALETTE.mist,
  basic: {
    comboWindowMs: 360,
    steps: [
      {
        windupMs: 80,
        activeMs: 90,
        recoveryMs: 130,
        damage: 9,
        knockbackX: 110,
        knockbackY: -50,
        hitbox: { width: 30, height: 22, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.5,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
      {
        windupMs: 110,
        activeMs: 80,
        recoveryMs: 190,
        damage: 7,
        knockbackX: 230,
        knockbackY: -60,
        hitbox: { width: 22, height: 26, offsetY: 0 },
        shape: 'front',
        moveFactor: 0.4,
        lungeSpeed: 0,
        lifeSteal: 0,
        stunMs: 350,
      },
    ],
  },
  special: {
    kind: 'guard',
    cooldownMs: 6500,
    attack: {
      windupMs: 80,
      activeMs: 1000,
      recoveryMs: 160,
      damage: 0,
      knockbackX: 0,
      knockbackY: 0,
      hitbox: NO_HITBOX,
      shape: 'none',
      moveFactor: 0.35,
      lungeSpeed: 0,
      lifeSteal: 0,
    },
    guard: { parryMs: 150 },
  },
  passive: { moveSpeedMult: 1, damageMult: 1, damageTakenMult: 0.9, cooldownMult: 1 },
  swapStrike: { damage: 6, knockbackX: 200, knockbackY: -60, radius: 40, stunMs: 400 },
};

export const CHICOTE_DE_CORRENTES: RelicDef = {
  id: 'chicote',
  name: 'Chicote de Elos',
  passiveText: '+6% de velocidade',
  summary: { basic: 'Golpes longos e rápidos', special: 'Gancho que puxa' },
  floatingWeapon: false,
  color: PALETTE.ember,
  basic: {
    comboWindowMs: 340,
    steps: [
      {
        windupMs: 70,
        activeMs: 70,
        recoveryMs: 100,
        damage: 6,
        knockbackX: 60,
        knockbackY: -20,
        hitbox: { width: 62, height: 14, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.6,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
      {
        windupMs: 70,
        activeMs: 70,
        recoveryMs: 100,
        damage: 6,
        knockbackX: 60,
        knockbackY: -20,
        hitbox: { width: 62, height: 14, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.6,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
      {
        windupMs: 100,
        activeMs: 90,
        recoveryMs: 160,
        damage: 9,
        knockbackX: 160,
        knockbackY: -50,
        hitbox: { width: 72, height: 16, offsetY: -2 },
        shape: 'front',
        moveFactor: 0.4,
        lungeSpeed: 0,
        lifeSteal: 0,
      },
    ],
  },
  special: {
    kind: 'pull',
    cooldownMs: 5000,
    attack: {
      windupMs: 120,
      activeMs: 90,
      recoveryMs: 200,
      damage: 8,
      knockbackX: -240, // negativo: puxa o inimigo para o herói
      knockbackY: -40,
      hitbox: { width: 110, height: 14, offsetY: -2 },
      shape: 'front',
      moveFactor: 0.3,
      lungeSpeed: 0,
      lifeSteal: 0,
      stunMs: 350,
    },
  },
  passive: { moveSpeedMult: 1.06, damageMult: 1, damageTakenMult: 1, cooldownMult: 1 },
  swapStrike: { damage: 7, knockbackX: -140, knockbackY: -40, radius: 56, stunMs: 0 },
};

export const CAJADO_DE_BRASAS: RelicDef = {
  id: 'cajado',
  name: 'Cajado de Brasas',
  passiveText: 'Recarga -15%',
  summary: { basic: 'Bola de brasa em arco', special: 'Leque de três brasas' },
  floatingWeapon: false,
  color: 0xff7a2a,
  basic: {
    comboWindowMs: 0,
    steps: [
      {
        windupMs: 150,
        activeMs: 60,
        recoveryMs: 230,
        damage: 0,
        knockbackX: 0,
        knockbackY: 0,
        hitbox: NO_HITBOX,
        shape: 'none',
        moveFactor: 0.6,
        lungeSpeed: 0,
        lifeSteal: 0,
        projectile: {
          speed: 190,
          speedY: -70,
          gravityY: 260,
          lifeMs: 1400,
          width: 8,
          height: 8,
          damage: 11,
          knockbackX: 100,
          knockbackY: -50,
          spawnOffsetY: -8,
          tint: 0xff7a2a,
        },
      },
    ],
  },
  special: {
    kind: 'shot',
    cooldownMs: 4500,
    attack: {
      windupMs: 220,
      activeMs: 60,
      recoveryMs: 240,
      damage: 0,
      knockbackX: 0,
      knockbackY: 0,
      hitbox: NO_HITBOX,
      shape: 'none',
      moveFactor: 0.3,
      lungeSpeed: 0,
      lifeSteal: 0,
      projectiles: [-150, -90, -30].map((speedY) => ({
        speed: 190,
        speedY,
        gravityY: 260,
        lifeMs: 1400,
        width: 8,
        height: 8,
        damage: 8,
        knockbackX: 90,
        knockbackY: -40,
        spawnOffsetY: -8,
        tint: 0xffc04a,
      })),
    },
  },
  passive: { moveSpeedMult: 1, damageMult: 1, damageTakenMult: 1, cooldownMult: 0.85 },
  swapStrike: { damage: 7, knockbackX: 110, knockbackY: -80, radius: 52, stunMs: 0 },
};

export const BESTA_ENFERRUJADA: RelicDef = {
  id: 'besta',
  name: 'Besta Enferrujada',
  passiveText: '+12% de dano',
  summary: { basic: 'Virote forte e lento', special: 'Virote que atravessa' },
  floatingWeapon: false,
  color: 0xb08a50,
  basic: {
    comboWindowMs: 0,
    steps: [
      {
        windupMs: 190,
        activeMs: 50,
        recoveryMs: 400,
        damage: 0,
        knockbackX: 0,
        knockbackY: 0,
        hitbox: NO_HITBOX,
        shape: 'none',
        moveFactor: 0.5,
        lungeSpeed: 0,
        lifeSteal: 0,
        projectile: {
          speed: 460,
          lifeMs: 1100,
          width: 10,
          height: 4,
          damage: 15,
          knockbackX: 140,
          knockbackY: -40,
          spawnOffsetY: -3,
          textureKey: 'arrow', // a mesma chave de TEXTURE.arrow (src/systems/textures.ts)
          tint: 0xd9b36a,
        },
      },
    ],
  },
  special: {
    kind: 'shot',
    cooldownMs: 6000,
    attack: {
      windupMs: 300,
      activeMs: 60,
      recoveryMs: 260,
      damage: 0,
      knockbackX: 0,
      knockbackY: 0,
      hitbox: NO_HITBOX,
      shape: 'none',
      moveFactor: 0.2,
      lungeSpeed: 0,
      lifeSteal: 0,
      projectile: {
        speed: 520,
        lifeMs: 1300,
        width: 12,
        height: 5,
        damage: 22,
        knockbackX: 200,
        knockbackY: -60,
        spawnOffsetY: -3,
        stunMs: 250,
        pierce: 3,
        textureKey: 'arrow',
        tint: 0xffe08a,
      },
    },
  },
  passive: { moveSpeedMult: 1, damageMult: 1.12, damageTakenMult: 1, cooldownMult: 1 },
  swapStrike: { damage: 6, knockbackX: 100, knockbackY: -60, radius: 46, stunMs: 0 },
};

export const RELICS: Readonly<Record<RelicId, RelicDef>> = {
  lamina: LAMINA_DO_VIGIA,
  martelo: MARTELO_SEPULCRAL,
  foice: FOICE_DA_NEVOA,
  tomo: TOMO_CINZENTO,
  adaga: ADAGA_SOMBRIA,
  lanca: LANCA_VIGILANTE,
  machado: MACHADO_RACHADOR,
  arco: ARCO_DE_OSSO,
  mangual: MANGUAL_CINEREO,
  laminas: LAMINAS_GEMEAS,
  escudo: ESPADA_E_ESCUDO,
  chicote: CHICOTE_DE_CORRENTES,
  cajado: CAJADO_DE_BRASAS,
  besta: BESTA_ENFERRUJADA,
};

export const RELIC_IDS: readonly RelicId[] = [
  'lamina',
  'martelo',
  'foice',
  'tomo',
  'adaga',
  'lanca',
  'machado',
  'arco',
  'mangual',
  'laminas',
  'escudo',
  'chicote',
  'cajado',
  'besta',
];

/** Troca de relíquia. */
export const SWAP = {
  /** Espera entre duas trocas. */
  cooldownMs: 450,
  /** O golpe de troca dispara se a troca ocorre até este tempo depois de acertar um inimigo. */
  strikeWindowMs: 700,
} as const;

/** Relíquias com que a run começa. */
export const STARTING_LOADOUT: readonly [RelicId, RelicId] = ['lamina', 'tomo'];

export const RELIC_DROP = {
  /** Chance de um inimigo derrotado soltar uma relíquia nova (só entram as que o jogador não carrega). */
  chance: 0.3,
  /** Quanto tempo a relíquia largada por um inimigo espera no chão antes de sumir. */
  lifetimeMs: 14000,
  /** Nos últimos instantes ela pisca para avisar que vai sumir (visível/invisível a cada `blinkMs`). */
  warnMs: 4000,
  blinkMs: 110,
} as const;

/** Chave da textura do ícone de uma relíquia (ver src/systems/relicIcons.ts). */
export function relicIconKey(id: RelicId): string {
  return `relic-icon-${id}`;
}
