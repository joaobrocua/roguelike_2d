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
  /** Almas carregadas (embaixo da barra de vida). */
  souls: {
    x: 4,
    y: 26,
    width: 52,
    height: 15,
    gem: { x: 5, y: 3 },
    textX: 15,
    textY: 4,
    flashMs: 400,
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
  prompt: 'J / ESPAÇO / A: acordar no santuário',
  keptLabel: 'ALMAS GUARDADAS',
  lostLabel: 'ALMAS PERDIDAS',
  /** Tempo (ms) em que a tela ignora o input, para não recomeçar sem querer. */
  inputLockMs: 600,
  overlayAlpha: 0.78,
  titleFadeMs: 700,
  /** Medidas relativas ao centro da tela. */
  layout: { bandHalf: 38, dividerY: 34, titleY: -12, summaryY: 8, promptY: 24 },
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

/** Bifurcação: a tela de escolha entre dois caminhos na saída de uma área. */
export const ROAD_CHOICE = {
  title: 'QUAL CAMINHO?',
  hint: 'SETAS ESCOLHER   J SEGUIR   ESC VOLTAR',
  overlayAlpha: 0.86,
  /** Ignora a confirmação por um instante ao abrir, para não escolher sem querer. */
  inputLockMs: 350,
  titleY: 20,
  hintY: 254,
  /** Opacidade da paisagem da carta que não está escolhida. */
  dimAlpha: 0.45,
  card: {
    width: 124,
    height: 204,
    gap: 22,
    top: 36,
    /** Distância (px) do topo da carta até o topo da paisagem, e a escala dela. */
    viewDy: 6,
    viewScale: 1.25,
    /** Alturas (px, a partir da base da carta) do nome curto e do nome completo. */
    nameDy: 42,
    subtitleDy: 26,
  },
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
  acts: ['I', 'II', 'III', 'IV', 'V', 'VI'],
  actLabel: 'ATO',
  /** Texto da placa do arco de saída quando há dois caminhos. */
  roads: 'CAMINHOS',
  /** Distâncias (px) acima e abaixo do título para o rótulo e os divisores. */
  captionDy: -17,
  dividerDy: 15,
  slidePx: 6,
  /** O nome da ala ao entrar nela (mais discreto que o da área): altura e tempos. */
  wing: { y: 44, fadeMs: 450, holdMs: 1500, dividerDy: 9 },
  /** Rótulo em cima do nome SANTUÁRIO: entre biomas ou ao despertar depois de morrer. */
  sanctuary: { nextBiome: 'O PORTÃO DO CASTELO', start: 'DESPERTAR' },
  /** Linha das almas guardadas, abaixo do divisor de baixo. */
  bankedLabel: 'ALMAS GUARDADAS',
  bankedDy: 18,
} as const;

/** Tela de vitória (depois de derrotar o Guardião Partido). */
export const VICTORY_SCREEN = {
  title: 'A NÉVOA RECUA',
  subtitle: 'O Guardião Partido caiu. A fortaleza descansa.',
  prompt: 'J / ESPAÇO / A: acordar no santuário',
  bankedLabel: 'ALMAS GUARDADAS',
  inputLockMs: 900,
  overlayAlpha: 0.82,
  titleFadeMs: 900,
  layout: { bandHalf: 52, dividerY: 46, titleY: -24, subtitleY: 0, summaryY: 16, promptY: 34 },
} as const;

/** Santuário: a tela entre as runs onde as almas viram melhorias permanentes. */
export const SANCTUARY = {
  title: 'SANTUÁRIO',
  startLabel: 'RELÍQUIA INICIAL',
  startHelp: 'Esq. e dir. trocam a relíquia inicial',
  hint: 'SETAS ESCOLHER   J COMPRAR   E SAIR',
  columns: {
    basic: 'ATRIBUTOS',
    agency: 'AGÊNCIA',
    expansion: 'EXPANSÃO',
  },
  status: {
    maxed: 'NO MÁXIMO',
    maxedShort: 'MÁX',
    notSaved: 'COMPRADO (SEM SALVAR)',
    locked: 'BLOQUEADO: ',
    poor: 'ALMAS INSUFICIENTES',
    ready: 'J PARA COMPRAR',
    bought: 'COMPRADO!',
  },
  inputLockMs: 350,
  /** Escurecimento do jogo parado atrás da janela. */
  dimAlpha: 0.62,
  fx: { flashColor: 0xffffff, flashAlpha: 0.7, flashMs: 320 },
  /** Medidas (px de tela de 480x270). A janela fica centralizada; as posições são relativas a ela. */
  layout: {
    width: 340,
    height: 194,
    padding: 10,
    titleY: 10,
    columnWidth: 104,
    columnGap: 4,
    headerY: 26,
    firstCardY: 34,
    card: { height: 22, gap: 3 },
    startRow: { y: 140, height: 12 },
    detail: { y: 148, height: 28 },
    hintY: 185,
    pip: { size: 4, gap: 2 },
  },
} as const;

/** Teclas e botões do jogo, para as telas de controles (rótulo, teclado / controle). */
export const CONTROLS_HELP: readonly (readonly [string, string])[] = [
  ['MOVER', 'SETAS OU A D'],
  ['PULAR', 'ESPAÇO OU W  (A)'],
  ['ATACAR', 'J  (X)'],
  ['ESPECIAL', 'K  (Y)'],
  ['ROLAR', 'L OU SHIFT  (B)'],
  ['TROCAR RELÍQUIA', 'Q  (LB)'],
  ['INTERAGIR', 'E  (RT)'],
  ['RELÍQUIAS', '1 E 2'],
  ['PAUSAR', 'ESC OU P  (START)'],
  ['SOM LIGA/MUDO', 'M'],
];

/** Textos e medidas da tela de título. */
export const TITLE_SCREEN = {
  name: ['RUÍNAS', 'ESQUECIDAS'],
  tagline: 'Desça. Caia. Volte mais forte.',
  menu: { play: 'JOGAR', options: 'OPÇÕES', controls: 'CONTROLES', reset: 'ZERAR PROGRESSO' },
  back: 'VOLTAR',
  sound: { music: 'MÚSICA', sfx: 'EFEITOS', mute: 'SOM', on: 'LIGADO', off: 'MUDO' },
  reset: {
    question: 'APAGAR TODO O PROGRESSO?',
    warning: 'Almas, melhorias e estatísticas voltam a zero.',
    no: 'NÃO, VOLTAR',
    yes: 'SIM, APAGAR TUDO',
    done: 'PROGRESSO APAGADO',
    failed: 'NÃO FOI POSSÍVEL APAGAR TUDO',
  },
  stats: { souls: 'ALMAS', runs: 'DESCIDAS', victories: 'VITÓRIAS' },
  hint: 'SETAS ESCOLHER   J CONFIRMAR   ESC VOLTAR',
  version: 'v0.1.0',
  fadeInMs: 900,
  inputLockMs: 250,
  /** Fundo: transparência da escuridão sobre o cenário e do anjo ao fundo. */
  fx: {
    shadeAlpha: 0.42,
    angelAlpha: 0.5,
    angelTint: 0x8f9bc8,
    emberFrequencyMs: 220,
    embers: {
      lifespanMs: 5200,
      speedY: { min: -26, max: -10 },
      speedX: 8,
      startScale: 1.2,
      alpha: 0.9,
    },
    fadeOutMs: 500,
    noticeHoldMs: 1800,
    noticeFadeMs: 600,
  },
  layout: {
    titleY: 42,
    lineGap: 30,
    titleSize: 3,
    taglineY: 112,
    menuY: 144,
    menuStep: 16,
    statsY: 236,
    /** Pergunta e aviso da confirmação, acima das linhas do menu (px em relação a menuY). */
    confirmDy: { question: -22, warning: -10 },
    /** O aviso de "progresso apagado" fica abaixo da quinta linha do menu. */
    noticeRow: 5,
    panel: { width: 330, height: 146, y: 98 },
    controls: { x: 90, y: 108, step: 13, valueX: 226 },
  },
} as const;

/** Textos do menu de pausa. */
export const PAUSE_SCREEN = {
  title: 'PAUSA',
  resume: 'CONTINUAR',
  controls: 'CONTROLES',
  quit: 'DESISTIR DA DESCIDA',
  quitConfirm: {
    question: 'DESISTIR DESTA DESCIDA?',
    warning: 'Você perde as almas carregadas.',
    warning2: 'A Retenção protege uma parte.',
    no: 'NÃO, CONTINUAR',
    yes: 'SIM, DESISTIR',
  },
  hint: 'SETAS ESCOLHER  J OK  ESC VOLTAR',
  overlayAlpha: 0.7,
  inputLockMs: 200,
  layout: {
    panel: { width: 300, height: 170 },
    titleDy: 14,
    menuDy: 44,
    menuStep: 16,
    hintDy: 10,
    /** Confirmação de desistir: alturas (px, a partir do topo do painel) da pergunta, dos dois avisos e das linhas. */
    confirm: { questionDy: 34, warningDy: 48, warning2Dy: 59, menuDy: 82 },
  },
} as const;
