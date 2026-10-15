import Phaser from 'phaser';
import { DEPTH } from '../data/atmosphere';
import type { ProjectileData } from '../logic/attack';
import { createBox, type Box } from '../logic/geometry';

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
    this.enableBody(true, x, y, true, true);
    // Tiros especiais (o cuspe do sapo) trocam a textura e a cor, e saem em arco
    const body = this.body as Phaser.Physics.Arcade.Body;
    const arc = (cfg.gravityY ?? 0) > 0;
    this.setTexture(cfg.textureKey ?? this.defaultTexture);
    if (cfg.textureKey) body.setSize(cfg.width, cfg.height, true);
    if (cfg.tint !== undefined) this.setTint(cfg.tint);
    else this.clearTint();
    body.setAllowGravity(arc);
    if (arc) body.setGravityY((cfg.gravityY ?? 0) - this.scene.physics.world.gravity.y);
    this.setVelocity(dirX * cfg.speed, cfg.speedY ?? 0);
    this.setFlipX(dirX < 0);
    this.refreshBox();
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
