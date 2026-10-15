import type Phaser from 'phaser';
import { LOBO_ESPECTRAL } from '../data/enemies';
import type { EnemyWorld } from './Enemy';
import { PackHound, type PackOptions } from './PackHound';

/** Lobo Espectral: o cão da floresta, mais rápido e mais forte; corre no mesmo bando dos cães. */
export class LoboEspectral extends PackHound {
  constructor(scene: Phaser.Scene, x: number, y: number, world: EnemyWorld, options: PackOptions) {
    super(scene, x, y, LOBO_ESPECTRAL, world, options);
  }
}
