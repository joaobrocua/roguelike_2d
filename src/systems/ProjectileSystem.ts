import Phaser from 'phaser';
import { TILE_SIZE } from '../data/rooms';
import { Projectile, type ArrowConfig } from '../entities/Projectile';
import { isSolidAt, type ParsedRoom } from '../logic/roomParser';

/** Pool de projéteis de um lado (flechas inimigas ou raios do jogador): criado uma vez. */
export class ProjectileSystem {
  readonly pool: Projectile[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly room: ParsedRoom,
    textureKey: string,
    poolSize: number,
  ) {
    for (let i = 0; i < poolSize; i++) this.pool.push(new Projectile(scene, textureKey));
  }

  /** Dispara um projétil e o devolve; se o pool estiver cheio, o tiro é ignorado (null). */
  fire(x: number, y: number, dirX: number, cfg: ArrowConfig): Projectile | null {
    for (let i = 0; i < this.pool.length; i++) {
      const arrow = this.pool[i];
      if (arrow && !arrow.live) {
        arrow.fire(x, y, dirX, cfg);
        return arrow;
      }
    }
    return null;
  }

  update(dtMs: number): void {
    for (let i = 0; i < this.pool.length; i++) {
      const arrow = this.pool[i];
      if (!arrow || !arrow.live || !arrow.cfg) continue;
      arrow.ageMs += dtMs;
      arrow.refreshBox();
      if (arrow.ageMs >= arrow.cfg.lifeMs || isSolidAt(this.room, arrow.x, arrow.y, TILE_SIZE)) {
        arrow.despawn();
      }
    }
  }
}
