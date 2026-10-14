import Phaser from 'phaser';
import { PIXEL_FONT } from '../data/ui';
import { GLYPH_SET } from '../logic/glyphs';

/**
 * Fonte de pixels do jogo: os glifos da Press Start 2P (OFL, ver ASSETS-LICENSES.md) são
 * desenhados UMA vez num atlas, sem serrilhado suave e já com contorno escuro de 1 px, e viram
 * uma fonte de bitmap do Phaser. Texto de bitmap é nítido em qualquer escala inteira e o contorno
 * não "borra" nas quinas como o contorno do texto comum (que é um traço desenhado em canvas).
 *
 * Precisa rodar DEPOIS que a fonte carregou (ver BootScene). Sem a fonte instalada, o canvas usa a
 * fonte padrão do navegador e o atlas sai ilegível (o pacote da fonte é empacotado com o jogo).
 */

const CELL = PIXEL_FONT.glyphSize + PIXEL_FONT.outline * 2;

function lit(data: Uint8ClampedArray, width: number, x: number, y: number): boolean {
  return (data[(y * width + x) * 4 + 3] ?? 0) > 0;
}

/** Cria o atlas de glifos e registra a fonte de bitmap. Seguro de chamar mais de uma vez. */
export function createPixelFont(scene: Phaser.Scene): void {
  if (scene.cache.bitmapFont.exists(PIXEL_FONT.key)) return;
  const chars = GLYPH_SET;
  const perRow = PIXEL_FONT.glyphsPerRow;
  const rows = Math.ceil(chars.length / perRow);
  const width = perRow * CELL;
  const height = rows * CELL;
  const texture = scene.textures.createCanvas(PIXEL_FONT.key, width, height);
  if (!texture) return;
  const ctx = texture.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.font = `${PIXEL_FONT.glyphSize}px "Press Start 2P"`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < chars.length; i++) {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    ctx.fillText(chars.charAt(i), col * CELL + PIXEL_FONT.outline, row * CELL + PIXEL_FONT.outline);
  }

  // Sem meios-tons: cada pixel é do glifo ou não é. Depois, contorno nos 8 vizinhos.
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 3; i < data.length; i += 4)
    data[i] = (data[i] ?? 0) >= PIXEL_FONT.threshold ? 255 : 0;
  const outline = PIXEL_FONT.outlineColor;
  const marks: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (lit(data, width, x, y)) continue;
      let touches = false;
      for (let dy = -1; dy <= 1 && !touches; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          // Só dentro da mesma célula: o contorno de um glifo não invade o vizinho
          if (Math.floor(nx / CELL) !== Math.floor(x / CELL)) continue;
          if (Math.floor(ny / CELL) !== Math.floor(y / CELL)) continue;
          if (lit(data, width, nx, ny) && (data[(ny * width + nx) * 4] ?? 0) > 200) {
            touches = true;
            break;
          }
        }
      }
      if (touches) marks.push((y * width + x) * 4);
    }
  }
  for (const i of marks) {
    data[i] = (outline >> 16) & 0xff;
    data[i + 1] = (outline >> 8) & 0xff;
    data[i + 2] = outline & 0xff;
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  texture.refresh();

  // Dados da fonte: cada glifo avança só o tamanho dele (o contorno invade a margem do vizinho)
  const fontData = {
    font: PIXEL_FONT.key,
    size: PIXEL_FONT.glyphSize,
    lineHeight: PIXEL_FONT.glyphSize + PIXEL_FONT.lineGap,
    retroFont: true,
    chars: {} as Record<number, unknown>,
  };
  for (let i = 0; i < chars.length; i++) {
    const x = (i % perRow) * CELL;
    const y = Math.floor(i / perRow) * CELL;
    fontData.chars[chars.charCodeAt(i)] = {
      x,
      y,
      width: CELL,
      height: CELL,
      centerX: CELL / 2,
      centerY: CELL / 2,
      xOffset: -PIXEL_FONT.outline,
      yOffset: -PIXEL_FONT.outline,
      xAdvance: PIXEL_FONT.glyphSize,
      data: {},
      kerning: {},
      u0: x / width,
      v0: y / height,
      u1: (x + CELL) / width,
      v1: (y + CELL) / height,
    };
  }
  scene.cache.bitmapFont.add(PIXEL_FONT.key, {
    data: fontData,
    texture: PIXEL_FONT.key,
    frame: null,
  } as unknown as Phaser.Types.GameObjects.BitmapText.BitmapFontData);
}

export interface PixelTextOptions {
  /** Escala inteira (1 = 8 px, 2 = 16 px...). */
  size?: number;
  color?: number;
  /** Centro do texto: 0 = esquerda/alto, 0.5 = meio, 1 = direita/baixo. */
  originX?: number;
  originY?: number;
  align?: 'left' | 'center' | 'right';
  /** Largura (px de tela, já na escala) a partir da qual o texto quebra a linha. */
  maxWidth?: number;
  depth?: number;
  /** Fixo na tela (HUD) em vez de acompanhar a câmera. */
  fixed?: boolean;
}

/** Texto de bitmap nítido na fonte de pixels. */
export function pixelText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  options: PixelTextOptions = {},
): Phaser.GameObjects.BitmapText {
  const {
    size = 1,
    color = 0xffffff,
    originX = 0,
    originY = 0,
    align = 'left',
    maxWidth,
    depth,
    fixed = false,
  } = options;
  const label = scene.add.bitmapText(x, y, PIXEL_FONT.key, text, PIXEL_FONT.glyphSize);
  label.setScale(size).setTint(color).setOrigin(originX, originY);
  if (align === 'center') label.setCenterAlign();
  else if (align === 'right') label.setRightAlign();
  else label.setLeftAlign();
  if (maxWidth !== undefined) label.setMaxWidth(maxWidth);
  if (depth !== undefined) label.setDepth(depth);
  if (fixed) label.setScrollFactor(0);
  return label;
}
