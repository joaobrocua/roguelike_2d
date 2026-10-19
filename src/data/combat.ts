/**
 * Valores de combate: vida do jogador, esquiva perfeita e pools de projéteis.
 * Tempos em ms. Os golpes do jogador vêm das relíquias (src/data/relics.ts).
 */
export const PLAYER_COMBAT = {
  maxHp: 100,
  /** Cura de um baú quando não há relíquia nova para dar (fração da vida máxima). */
  chestHealFraction: 0.3,
  /** Cura (fração da vida máxima) ao cruzar o arco da saída para a próxima área. */
  exitHealFraction: 0.25,
  /** Invulnerabilidade após levar dano. */
  hurtInvulnerableMs: 700,
  /** Quanto (px/s) um golpe bloqueado pela guarda do escudo empurra o herói para trás. */
  guardPushSpeed: 70,
  /** Por quanto tempo (ms) o empurrão da guarda vale antes de o herói voltar a andar. */
  guardPushMs: 120,
  /** Tempo sem controle após levar dano. */
  hitStunMs: 220,
  /** Atrito do knockback (px/s perdidos por segundo). */
  knockbackFriction: 600,
  /** Um aperto de ataque, especial ou rolagem feito até este tempo antes de poder agir fica guardado. */
  inputBufferMs: 120,
  /** O próximo golpe do combo pode começar quando esta fração da recuperação já passou. */
  comboCancelFraction: 0.45,
  /** Passo à frente (px/s) nos golpes corpo a corpo, na preparação e no golpe: ajuda a alcançar o inimigo. */
  attackStepSpeed: 55,
} as const;

/** Esquiva perfeita: rolar no último instante antes do golpe inimigo acertar. */
export const PERFECT_DODGE = {
  /** A rolagem precisa ter começado há no máximo isso (ms) quando o golpe acerta. */
  windowMs: 150,
  /** Multiplicador de dano do próximo ataque do jogador. */
  damageMultiplier: 2,
  slowMoMs: 450,
  /** Velocidade do tempo durante a câmera lenta (1 = normal). */
  slowMoScale: 0.3,
} as const;

/** Tempo (ms, real) entre a morte e a tela de "Você caiu". */
export const DEATH_SCREEN_DELAY_MS = 800;

/** Tamanho dos pools de projéteis (criados uma vez, reaproveitados). */
export const PROJECTILE_POOL = { arrows: 12, bolts: 8 } as const;
