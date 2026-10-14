/**
 * Textos e HUD. Toda a escrita do jogo usa a fonte de pixels (bitmap) montada a partir da
 * Press Start 2P (licença OFL): cada glifo tem 8 x 8 e só é escalado em múltiplos inteiros.
 */
import { PALETTE } from './palette';

export const FONT = {
  family: '"Press Start 2P", monospace',
  /** Nome usado para carregar a fonte antes de desenhar os glifos. */
  loadSpec: '8px "Press Start 2P"',
} as const;

/** Fonte de pixels (bitmap) montada a partir da Press Start 2P: ver src/systems/pixelFont.ts. */
export const PIXEL_FONT = {
  key: 'pixel-font',
  /** Os glifos da Press Start 2P têm 8x8. */
  glyphSize: 8,
  /** Contorno escuro (px) em volta de cada glifo, já no atlas. */
  outline: 1,
  outlineColor: PALETTE.void,
  glyphsPerRow: 24,
  /** Opacidade mínima (0 a 255) para um pixel do glifo contar. */
  threshold: 110,
  /** Espaço (px) entre uma linha e a seguinte, além dos 8 px do glifo. */
  lineGap: 3,
} as const;

export const TEXT_COLORS = {
  normal: PALETTE.bone,
  dim: PALETTE.mist,
  danger: PALETTE.blood,
  accent: PALETTE.glow,
  /** Letra clara sobre o miolo escuro da tecla. */
  keycap: PALETTE.bone,
} as const;

/** Cores do preenchimento e do rastro das barras de vida (jogador e chefe). */
export const GAUGE_COLORS = {
  fill: { color: PALETTE.blood, light: 0xe8627a, dark: PALETTE.bloodDark },
  ghost: { color: 0xe8c4a0, light: 0xffffff, dark: 0xb08060 },
} as const;

/** Moldura de pedra e ferro dos painéis da HUD (ver src/systems/hudArt.ts). */
export const PANEL = {
  fill: PALETTE.deep,
  fillAlpha: 0.88,
  border: PALETTE.void,
  light: PALETTE.stoneLight,
  dark: PALETTE.stoneDark,
  rivet: PALETTE.mist,
} as const;

/** Vida do jogador (canto superior esquerdo). */
const HP_PLATE = { x: 4, y: 4, width: 92, height: 19 } as const;

export const HUD = {
  hp: {
    plate: HP_PLATE,
    heart: { x: HP_PLATE.x + 4, y: HP_PLATE.y + 4 },
    bar: { x: HP_PLATE.x + 20, y: HP_PLATE.y + 4, width: 64, height: 7, border: 2 },
    /** Quanto do rastro claro some por segundo (fração da barra). */
    ghostDelayRate: 0.35,
    /** Abaixo disto a barra pulsa. */
    lowFraction: 0.25,
    pulseMs: 700,
    pulseDepth: 0.25,
  },
  /** Relíquias carregadas (canto inferior esquerdo). */
  relics: {
    slot: 24,
    gap: 4,
    left: 4,
    bottom: 4,
    inactiveAlpha: 0.62,
    coverAlpha: 0.74,
    /** Brilho que dispara quando o especial volta a ficar pronto. */
    readyFlashMs: 320,
  },
  /** Dica de controles: teclas em quadradinhos + o que fazem (só na primeira sala). */
  hints: {
    items: [
      { keys: ['A', 'D'], label: 'mover' },
      { keys: ['J'], label: 'atacar' },
      { keys: ['K'], label: 'especial' },
      { keys: ['Q'], label: 'trocar' },
      { keys: ['E'], label: 'pegar' },
      { keys: ['L'], label: 'rolar' },
    ],
    left: 60,
    bottom: 4,
    itemGap: 8,
    holdMs: 9000,
    fadeMs: 1200,
  },
  keycap: { size: 9, labelGap: 4, keyGap: 1 },
} as const;

export const DEATH_SCREEN = {
  title: 'VOCÊ CAIU',
  prompt: 'J / ESPAÇO / A: recomeçar',
  /** Tempo (ms) em que a tela ignora o input, para não recomeçar sem querer. */
  inputLockMs: 600,
  overlayAlpha: 0.78,
  titleFadeMs: 700,
  /** Medidas relativas ao centro da tela. */
  layout: { bandHalf: 38, dividerY: 34, titleY: -8, promptY: 20 },
} as const;

/** Tela "Nova relíquia": textos e medidas (a tela tem 480x270). */
export const RELIC_CHOICE = {
  title: 'NOVA RELÍQUIA',
  newLabel: 'ENCONTRADA',
  discardLabel: 'DESCARTAR QUAL?',
  keep: 'DEIXAR NO CHÃO',
  activeTag: 'EM USO',
  rows: { basic: 'BÁSICO', special: 'ESPECIAL (K)', passive: 'PASSIVA' },
  hint: 'W/S ESCOLHER   J OU 1-3 CONFIRMAR   ESC DEIXAR',
  overlayAlpha: 0.88,
  /** Ignora a confirmação por um instante ao abrir, para não escolher sem querer. */
  inputLockMs: 400,
  titleY: 18,
  hintY: 248,
  newCard: { x: 12, y: 40, width: 226, height: 180 },
  optionCard: { x: 252, width: 216, height: 60, gap: 6, firstY: 56 },
  keepButton: { x: 252, y: 194, width: 216, height: 26 },
  headerY: 46,
  iconScaleBig: 4,
  iconScaleSmall: 2,
  /** Distância (px) entre uma linha de informação e a seguinte na ficha da relíquia nova. */
  rowStep: 23,
} as const;

/** Minimapa (canto superior direito). Medidas em pixels. */
export const MINIMAP = {
  cellW: 8,
  cellH: 5,
  gap: 1,
  margin: 4,
  /** Folga entre a moldura e as salas. */
  padding: 2,
  blinkMs: 380,
  /** Cor de cada tipo de sala visitada. */
  roomColors: {
    start: PALETTE.player,
    combat: PALETTE.mist,
    rest: PALETTE.glow,
    chest: PALETTE.ember,
    secret: PALETTE.wraith,
    exit: PALETTE.soul,
    boss: PALETTE.blood,
  },
  /** Os losangos que mostram em qual dos biomas a run está. */
  pips: { size: 3, gap: 3, offsetY: 3 },
} as const;

/** Nome do bioma que aparece ao entrar nele. */
export const BANNER = {
  y: 54,
  fadeMs: 700,
  holdMs: 1700,
  /** Números romanos dos biomas ("ATO I"). */
  acts: ['I', 'II', 'III'],
  actLabel: 'ATO',
  /** Distâncias (px) acima e abaixo do título para o rótulo e os divisores. */
  captionDy: -17,
  dividerDy: 15,
  slidePx: 6,
} as const;

/** Tela de vitória (depois de derrotar o Guardião Partido). */
export const VICTORY_SCREEN = {
  title: 'A NÉVOA RECUA',
  subtitle: 'O Guardião Partido caiu. A fortaleza descansa.',
  prompt: 'J / ESPAÇO / A: nova descida',
  inputLockMs: 900,
  overlayAlpha: 0.82,
  titleFadeMs: 900,
  layout: { bandHalf: 52, dividerY: 46, titleY: -22, subtitleY: 4, promptY: 30 },
} as const;
