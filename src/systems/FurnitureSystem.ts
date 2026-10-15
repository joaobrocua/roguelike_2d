import Phaser from 'phaser';
import { ATMOSPHERE, DEPTH } from '../data/atmosphere';
import type { BiomeId } from '../data/mapRules';
import { SANCTUARY_LOOK } from '../data/sanctuaryRoom';
import { TILE_SIZE } from '../data/rooms';
import { FURNITURE, FURNITURE_GLOW } from '../data/wings';
import type { FurnitureItem } from '../logic/furniture';
import type { LightSource } from './AtmosphereSystem';
import { ENV_TEXTURE } from './environmentTextures';
import { ensureFurnitureTextures, furnitureKey, furnitureSize } from './furnitureArt';

const HALF_GLOW = 64; // metade da textura de brilho (128 px)

/**
 * Coloca a mobília de uma ala na sala: imagens atrás dos personagens (só cenário, o herói passa
 * por trás e pela frente) e, nas peças com chama (velas, candelabros, lustres), um brilho que
 * pulsa e uma luz que "abre" a escuridão da sala. Tudo é criado uma vez; o brilho respira por
 * tween, então o update do jogo não faz nada aqui.
 */
export class FurnitureSystem {
  /** Luzes das peças com chama (para a escuridão da sala abrir em volta delas). */
  readonly lights: LightSource[] = [];

  constructor(scene: Phaser.Scene, items: readonly FurnitureItem[], biome: BiomeId) {
    ensureFurnitureTextures(scene, biome);
    const flame = SANCTUARY_LOOK[biome].flame[1];
    for (const item of items) {
      const spec = FURNITURE[item.kind];
      const { width } = furnitureSize(item.kind);
      const left = item.col * TILE_SIZE;
      const floor = spec.placement === 'floor';
      const x = item.flipX ? left + width : left;
      const y = floor ? item.row * TILE_SIZE : (item.row + 1) * TILE_SIZE;
      scene.add
        .image(x, y, furnitureKey(biome, item.kind, item.variant))
        .setOrigin(item.flipX ? 1 : 0, floor ? 1 : 0)
        .setFlipX(item.flipX)
        .setDepth(FURNITURE_GLOW.depth);
      const light = spec.light;
      if (!light) continue;
      const cx = left + width / 2;
      const cy = floor ? y - light.dy : y + light.dy;
      this.lights.push({
        x: cx,
        y: cy,
        visible: true,
        lightRadius: light.radius,
        lightStrength: light.strength,
      });
      const glow = scene.add
        .image(cx, cy, ENV_TEXTURE.glow)
        .setTint(flame)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale((light.radius / HALF_GLOW) * FURNITURE_GLOW.scale)
        .setAlpha(ATMOSPHERE.torch.glowAlpha * FURNITURE_GLOW.alpha)
        .setDepth(DEPTH.warmGlow);
      scene.tweens.add({
        targets: glow,
        alpha: glow.alpha * FURNITURE_GLOW.swing,
        duration: FURNITURE_GLOW.pulseMs + (cx % 7) * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
