import Phaser from 'phaser';
import { DEPTH } from '../data/atmosphere';
import type { ProjectileData } from '../logic/attack';
import { createBox, type Box } from '../logic/geometry';
import { alreadyPierced, createPierce, registerPierce, resetPierce } from '../logic/pierce';

export type ArrowConfig = ProjectileData;

/**
 * Projétil (flecha do arqueiro, raio do Tomo). Os objetos são criados uma vez e reaproveitados (ver ProjectileSystem):
 * `fire` liga a flecha e `despawn` a devolve ao pool.
 */
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  readonly box: Box = createBox();
  cfg: ArrowConfig | null = null;
  ageMs = 0;
  /** Já foi resolvida contra o jogador (acertou ou foi esquivada): não conta de novo. */
  resolved = false;
  /** Multiplicador de dano do disparo (raio do jogador após esquiva perfeita ou passiva). */
  multiplier = 1;
  /** O disparo veio de uma esquiva perfeita (efeitos de destaque). */
  empowered = false;
  /** Quantos inimigos o tiro ainda atravessa e quem ele já acertou (não acerta o mesmo duas vezes). */
  private readonly pierce = createPierce();

  private readonly defaultTexture: string;

  constructor(scene: Phaser.Scene, textureKey: string) {
    super(scene, 0, 0, textureKey);
    this.defaultTexture = textureKey;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.projectile);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.despawn();
  }

  get live(): boolean {
    return this.active;
  }

  fire(x: number, y: number, dirX: number, cfg: ArrowConfig): void {
    this.cfg = cfg;
    this.ageMs = 0;
    this.resolved = false;
    this.multiplier = 1;
    this.empowered = false;
    resetPierce(this.pierce, cfg.pierce ?? 0);
    this.enableBody(true, x, y, true, true);
    // Tiros especiais (o cuspe do sapo) trocam a textura e a cor, e saem em arco
    const body = this.body as Phaser.Physics.Arcade.Body;
    const arc = (cfg.gravityY ?? 0) > 0;
    this.setTexture(cfg.textureKey ?? this.defaultTexture);
    // O corpo acompanha a textura do disparo: o tiro com textura própria usa o tamanho do dado e os
    // demais voltam ao da textura padrão (o slot do pool não herda o corpo do tiro anterior)
    if (cfg.textureKey) body.setSize(cfg.width, cfg.height, true);
    else body.setSize(this.frame.realWidth, this.frame.realHeight, true);
    if (cfg.tint !== undefined) this.setTint(cfg.tint);
    else this.clearTint();
    body.setAllowGravity(arc);
    if (arc) body.setGravityY((cfg.gravityY ?? 0) - this.scene.physics.world.gravity.y);
    this.setVelocity(dirX * cfg.speed, cfg.speedY ?? 0);
    this.setFlipX(dirX < 0);
    this.refreshBox();
  }

  /** Este alvo já foi atravessado por este tiro? */
  hasHit(target: object): boolean {
    return alreadyPierced(this.pierce, target);
  }

  /** Registra o acerto em `target`; devolve true se o tiro deve sumir (não atravessa mais ninguém). */
  registerHit(target: object): boolean {
    return registerPierce(this.pierce, target);
  }

  despawn(): void {
    this.disableBody(true, true);
  }

  refreshBox(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.box.x = body.x;
    this.box.y = body.y;
    this.box.width = body.width;
    this.box.height = body.height;
  }
}
