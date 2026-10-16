import Phaser from 'phaser';
import { PALETTE } from '../data/palette';
import { ENEMY_BODIES } from '../data/enemies';

/** Chaves das texturas. Para usar arte final, carregue a imagem com a mesma chave. */
export const TEXTURE = {
  arrow: 'arrow',
  spit: 'spit',
  orb: 'orb',
  bolt: 'bolt',
  barrier: 'barrier',
  pickup: 'pickup',
  slashArc: 'slash-arc',
  spark: 'spark',
  marker: 'marker',
} as const;

/**
 * Gera os placeholders (retângulos coloridos) como texturas. A troca por sprites
 * reais é só carregar a imagem com a mesma chave no BootScene e remover a geração.
 */
export function createPlaceholderTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  // Inimigos: um bloco colorido por tipo, com um "olho" claro na frente (olham para a direita;
  // a cena espelha o sprite). A chave da textura é o id do inimigo.
  for (const enemy of ENEMY_BODIES) {
    if (scene.textures.exists(enemy.id)) continue;
    g.clear();
    g.fillStyle(enemy.color, 1);
    g.fillRect(0, 0, enemy.width, enemy.height);
    g.fillStyle(PALETTE.void, 1);
    g.fillRect(enemy.width - 5, 3, 3, 3);
    g.generateTexture(enemy.id, enemy.width, enemy.height);
  }

  // Flecha: haste clara e ponta laranja.
  if (!scene.textures.exists(TEXTURE.arrow)) {
    g.clear();
    g.fillStyle(PALETTE.bone, 1);
    g.fillRect(0, 0, 10, 3);
    g.fillStyle(PALETTE.ember, 1);
    g.fillRect(7, 0, 3, 3);
    g.generateTexture(TEXTURE.arrow, 10, 3);
  }

  // Cuspe do Sapo Peçonhento: uma gota redonda e verde (a cor vem do tint do tiro)
  if (!scene.textures.exists(TEXTURE.spit)) {
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(1, 0, 4, 6);
    g.fillRect(0, 1, 6, 4);
    g.fillStyle(0xb8ffd0, 1);
    g.fillRect(1, 1, 2, 2);
    g.generateTexture(TEXTURE.spit, 6, 6);
  }

  // Orbe do Necromante: uma esfera pálida com o miolo claro (a cor vem do tint do tiro)
  if (!scene.textures.exists(TEXTURE.orb)) {
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(2, 0, 3, 7);
    g.fillRect(0, 2, 7, 3);
    g.fillRect(1, 1, 5, 5);
    g.fillStyle(0xf4eaff, 1);
    g.fillRect(2, 2, 3, 3);
    g.generateTexture(TEXTURE.orb, 7, 7);
  }

  // Raio do Tomo (quadrado roxo com núcleo claro), barreira e item de relíquia (brancos: o tint
  // dá a cor da relíquia).
  if (!scene.textures.exists(TEXTURE.bolt)) {
    g.clear();
    g.fillStyle(PALETTE.wraith, 1);
    g.fillRect(0, 0, 8, 8);
    g.fillStyle(PALETTE.playerAccent, 1);
    g.fillRect(2, 2, 4, 4);
    g.generateTexture(TEXTURE.bolt, 8, 8);
  }
  makeBlock(g, scene, TEXTURE.barrier, 6, 40, 0xffffff);
  makeBlock(g, scene, TEXTURE.pickup, 10, 10, 0xffffff);

  // Arco do golpe (crescente voltado para a direita; a cena espelha e estica), faísca
  // (branca, pintada com tint) e marcador do bônus de esquiva.
  if (!scene.textures.exists(TEXTURE.slashArc)) {
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillPoints(crescentPoints(), true);
    g.generateTexture(TEXTURE.slashArc, SLASH_ARC_WIDTH, 32);
  }
  makeBlock(g, scene, TEXTURE.spark, 2, 2, 0xffffff);
  makeBlock(g, scene, TEXTURE.marker, 6, 6, PALETTE.ember);

  g.destroy();
}

const SLASH_ARC_WIDTH = 11;

/**
 * Contorno de um crescente voltado para a direita (32 px de altura): a borda externa é um
 * arco de círculo e a interna é o mesmo arco "achatado" até 60% do abaulamento.
 */
function crescentPoints(): { x: number; y: number }[] {
  const radius = 16;
  const halfAngle = Phaser.Math.DegToRad(70);
  const centerX = -radius * Math.cos(halfAngle); // a ponta do crescente fica em x = 0
  const centerY = 16;
  const steps = 12;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = -halfAngle + (2 * halfAngle * i) / steps;
    points.push({ x: centerX + radius * Math.cos(a), y: centerY + radius * Math.sin(a) });
  }
  for (let i = steps; i >= 0; i--) {
    const a = -halfAngle + (2 * halfAngle * i) / steps;
    const outerX = centerX + radius * Math.cos(a);
    points.push({ x: outerX * 0.6, y: centerY + radius * Math.sin(a) });
  }
  return points;
}

/** Retângulo liso com uma textura de uma só cor. */
function makeBlock(
  g: Phaser.GameObjects.Graphics,
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  color: number,
): void {
  if (scene.textures.exists(key)) return;
  g.clear();
  g.fillStyle(color, 1);
  g.fillRect(0, 0, width, height);
  g.generateTexture(key, width, height);
}
