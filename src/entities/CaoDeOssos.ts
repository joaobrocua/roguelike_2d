import type Phaser from 'phaser';
import { CAO_DE_OSSOS } from '../data/enemies';
import type { EnemyWorld } from './Enemy';
import { PackHound, type PackOptions } from './PackHound';

export type { PackOptions };

/** Cão de Ossos: rápido, persegue e dá botes; em bando, os ataques são escalonados. */
export class CaoDeOssos extends PackHound {
  constructor(scene: Phaser.Scene, x: number, y: number, world: EnemyWorld, options: PackOptions) {
    super(scene, x, y, CAO_DE_OSSOS, world, options);
  }
}
