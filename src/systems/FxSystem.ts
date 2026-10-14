import Phaser from 'phaser';
import {
  DAMAGE_NUMBER_FX,
  DODGE_RING,
  HIT_FEEDBACK,
  HIT_WEIGHT,
  SPARK_FX,
  SWAP_FX,
  DUST_FX,
  type HitFeedback,
} from '../data/fx';
import { DEPTH } from '../data/atmosphere';
import { PALETTE } from '../data/palette';
import { createHitStop, triggerHitStop, updateHitStop } from '../logic/hitStop';
import { scaleHitFeedback } from '../logic/hitWeight';
import { DamageNumbers } from './DamageNumbers';
import { TEXTURE } from './textures';

/**
 * Efeitos de "sensação" do combate: hit stop, tremor de câmera, faíscas, números de
 * dano e o anel da esquiva perfeita. A cena só avisa o que aconteceu; os valores
 * vêm de src/data/fx.ts.
 */
export class FxSystem {
  private readonly hitStop = createHitStop();
  /** Feedback do golpe depois de ajustado pelo peso (objeto reaproveitado a cada acerto). */
  private readonly weighted: HitFeedback = {
    hitStopMs: 0,
    shakeMs: 0,
    shakeIntensity: 0,
    sparks: 0,
  };
  private readonly numbers: DamageNumbers;
  private readonly enemySparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly empoweredSparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly playerSparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly dodgeSparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly soulSparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private readonly scene: Phaser.Scene) {
    this.numbers = new DamageNumbers(scene);
    this.enemySparks = this.createEmitter(SPARK_FX.enemy);
    this.empoweredSparks = this.createEmitter(SPARK_FX.empowered);
    this.playerSparks = this.createEmitter(SPARK_FX.player);
    this.dodgeSparks = this.createEmitter(SPARK_FX.dodge);
    this.soulSparks = this.createEmitter(SPARK_FX.soul);
    this.dust = scene.add
      .particles(0, 0, TEXTURE.spark, {
        lifespan: DUST_FX.lifespanMs,
        speed: { min: DUST_FX.speedMin, max: DUST_FX.speedMax },
        angle: { min: DUST_FX.angleMin, max: DUST_FX.angleMax },
        scale: { start: DUST_FX.scaleStart, end: 0 },
        alpha: { start: DUST_FX.alphaStart, end: 0 },
        tint: [PALETTE.bone, PALETTE.mist],
        emitting: false,
      })
      .setDepth(DEPTH.warmGlow);
  }

  /** Avança o hit stop (tempo real). Retorna true se o jogo deve ficar congelado neste frame. */
  beginFrame(realDtMs: number): boolean {
    return updateHitStop(this.hitStop, realDtMs);
  }

  /** Avança os efeitos que seguem o tempo do jogo (que congela e fica lento junto com ele). */
  update(gameDtMs: number): void {
    this.numbers.update(gameDtMs);
  }

  /** O jogador acertou um inimigo. `empowered` = golpe com dano dobrado. */
  enemyHit(x: number, y: number, damage: number, empowered: boolean): void {
    // Quanto mais pesado o golpe (dano), mais congela, treme e solta faísca
    const base = empowered ? HIT_FEEDBACK.empoweredHit : HIT_FEEDBACK.enemyHit;
    const feedback = scaleHitFeedback(this.weighted, base, damage, HIT_WEIGHT);
    this.applyFeedback(feedback);
    (empowered ? this.empoweredSparks : this.enemySparks).explode(feedback.sparks, x, y);
    this.numbers.spawn(
      x,
      y - 10,
      damage,
      empowered ? DAMAGE_NUMBER_FX.empoweredColor : DAMAGE_NUMBER_FX.enemyColor,
      empowered ? DAMAGE_NUMBER_FX.empoweredScale : 1,
    );
  }

  /** O jogador levou um golpe. */
  playerHit(x: number, y: number, damage: number): void {
    this.applyFeedback(HIT_FEEDBACK.playerHit);
    this.playerSparks.explode(HIT_FEEDBACK.playerHit.sparks, x, y);
    this.numbers.spawn(x, y - 14, damage, DAMAGE_NUMBER_FX.playerColor);
  }

  /** Esquiva perfeita: anel de luz e uma rajada de faíscas no jogador. */
  perfectDodge(x: number, y: number): void {
    this.dodgeSparks.explode(SPARK_FX.dodgeBurst, x, y);
    const ring = this.scene.add
      .circle(x, y, DODGE_RING.radius)
      .setStrokeStyle(2, PALETTE.playerAccent);
    this.scene.tweens.add({
      targets: ring,
      scale: DODGE_RING.endScale,
      alpha: 0,
      duration: DODGE_RING.durationMs,
      onComplete: () => ring.destroy(),
    });
  }

  /** Golpe de troca: anel de luz na cor da nova relíquia, com um tremor curto. */
  swapStrike(x: number, y: number, color: number, radius: number): void {
    this.applyFeedback(HIT_FEEDBACK.enemyHit);
    const ring = this.scene.add.circle(x, y, SWAP_FX.ringStart).setStrokeStyle(2, color);
    this.scene.tweens.add({
      targets: ring,
      scale: radius / SWAP_FX.ringStart,
      alpha: 0,
      duration: SWAP_FX.ringMs,
      onComplete: () => ring.destroy(),
    });
  }

  /** Almas ganhas ao derrotar um inimigo: "+N" na cor da alma e faíscas subindo. */
  soulGain(x: number, y: number, amount: number): void {
    this.numbers.spawnLabel(x, y - 8, `+${amount}`, DAMAGE_NUMBER_FX.soulColor);
    this.soulSparks.explode(SPARK_FX.soulBurst, x, y);
  }

  /** Cura: número verde e faíscas de alma subindo do jogador. */
  heal(x: number, y: number, amount: number): void {
    this.numbers.spawn(x, y - 14, Math.round(amount), DAMAGE_NUMBER_FX.healColor);
    this.dodgeSparks.explode(SPARK_FX.blockBurst, x, y);
  }

  /** Nuvem de poeira nos pés (pouso e rolagem). */
  puffDust(x: number, y: number, count: number): void {
    this.dust.explode(count, x, y);
  }

  /** A barreira parou um projétil: rajada curta de faíscas. */
  projectileBlocked(x: number, y: number): void {
    this.dodgeSparks.explode(SPARK_FX.blockBurst, x, y);
  }

  private applyFeedback(feedback: HitFeedback): void {
    triggerHitStop(this.hitStop, feedback.hitStopMs);
    this.scene.cameras.main.shake(feedback.shakeMs, feedback.shakeIntensity, true);
  }

  private createEmitter(tints: readonly number[]): Phaser.GameObjects.Particles.ParticleEmitter {
    return this.scene.add
      .particles(0, 0, TEXTURE.spark, {
        lifespan: SPARK_FX.lifespanMs,
        speed: { min: SPARK_FX.speedMin, max: SPARK_FX.speedMax },
        angle: { min: SPARK_FX.angleMin, max: SPARK_FX.angleMax },
        gravityY: SPARK_FX.gravityY,
        scale: { start: 1.5, end: 0 },
        tint: [...tints],
        emitting: false,
      })
      .setDepth(9);
  }
}
