/**
 * Visual de cada bioma: rampas de cor da pedra, do céu/fundo, da luz e da névoa. A arte do
 * cenário (src/systems/biomeBackgrounds.ts e tileArt.ts) lê tudo daqui, então trocar o clima de
 * um bioma é só mexer nestes números. Cores em 0xRRGGBB.
 */
import type { BiomeId } from './mapRules';

/** Do mais escuro ao mais claro: a "rampa" de uma pedra. */
export interface StoneRamp {
  deep: number;
  dark: number;
  base: number;
  light: number;
  highlight: number;
}

export interface BiomeLook {
  stone: StoneRamp;
  /** Pedra do fundo (paredes e colunas distantes): mais escura e fria que a do chão. */
  back: StoneRamp;
  /** Céu ou fundo da sala, do alto ao horizonte. */
  skyTop: number;
  skyMid: number;
  skyLow: number;
  /** Cor do musgo / mofo / limo nas superfícies. */
  moss: number;
  mossLight: number;
  /** Cor da luz ambiente (a "escuridão" é desta cor) e da névoa. */
  ambient: number;
  fog: number;
  /** Luz de fundo: da lua, dos vitrais, das lanternas de alma. */
  glow: number;
  glowSoft: number;
  /** Feixes de luz que entram pelas janelas (aditivo). */
  shaft: number;
  shaftAlpha: number;
}

export const BIOME_LOOK: Readonly<Record<BiomeId, BiomeLook>> = {
  // Pátio ao entardecer: céu índigo, lua pálida, pedra azul-ardósia com musgo
  muralhas: {
    stone: {
      deep: 0x111628,
      dark: 0x1c2339,
      base: 0x2d3653,
      light: 0x445170,
      highlight: 0x6f7fa6,
    },
    back: {
      deep: 0x0a0d19,
      dark: 0x10152a,
      base: 0x182038,
      light: 0x242e4b,
      highlight: 0x34416a,
    },
    skyTop: 0x080b1c,
    skyMid: 0x1a2145,
    skyLow: 0x40427a,
    moss: 0x4b6b3a,
    mossLight: 0x8ac24a,
    ambient: 0x05081a,
    fog: 0x6b7aa6,
    glow: 0xd5dcf2,
    glowSoft: 0x8f9fd4,
    shaft: 0xaebcf0,
    shaftAlpha: 0.07,
  },
  // Salões e capela: pedra roxa-acinzentada, vitrais acesos, luz quente de velas
  saloes: {
    stone: {
      deep: 0x150f22,
      dark: 0x221a36,
      base: 0x352a52,
      light: 0x4f4073,
      highlight: 0x7e6aa8,
    },
    back: {
      deep: 0x0c0816,
      dark: 0x140e24,
      base: 0x1d1535,
      light: 0x2c2150,
      highlight: 0x40336f,
    },
    skyTop: 0x0a0716,
    skyMid: 0x170f2c,
    skyLow: 0x2b1b45,
    moss: 0x6a3a52,
    mossLight: 0xb0587a,
    ambient: 0x0a0516,
    fog: 0x8a6bb0,
    glow: 0xffb35a,
    glowSoft: 0xc0334a,
    shaft: 0xd9a0ff,
    shaftAlpha: 0.09,
  },
  // Catacumbas: pedra úmida esverdeada, ossos, lanternas de alma
  catacumbas: {
    stone: {
      deep: 0x0e1613,
      dark: 0x18241f,
      base: 0x27382f,
      light: 0x3c5346,
      highlight: 0x668572,
    },
    back: {
      deep: 0x070d0b,
      dark: 0x0d1612,
      base: 0x15221c,
      light: 0x203529,
      highlight: 0x32503f,
    },
    skyTop: 0x050a08,
    skyMid: 0x0b1713,
    skyLow: 0x14281f,
    moss: 0x3f6b4f,
    mossLight: 0x6fe3b0,
    ambient: 0x02070a,
    fog: 0x5a8070,
    glow: 0x6fe3b0,
    glowSoft: 0x3aa886,
    shaft: 0x7fffd0,
    shaftAlpha: 0.06,
  },
  // Floresta apodrecida: terra e raízes, névoa amarelada e vaga-lumes (olivas e âmbar)
  floresta: {
    stone: {
      deep: 0x14110a,
      dark: 0x241d12,
      base: 0x3b3220,
      light: 0x574a2e,
      highlight: 0x857442,
    },
    back: {
      deep: 0x0a0805,
      dark: 0x120e08,
      base: 0x1b160c,
      light: 0x2a2214,
      highlight: 0x3c321c,
    },
    skyTop: 0x0a0906,
    skyMid: 0x241f10,
    skyLow: 0x4e4220,
    moss: 0x5f7a2a,
    mossLight: 0xa3c04a,
    ambient: 0x070803,
    fog: 0x8a8a50,
    glow: 0xf0cf62,
    glowSoft: 0xb08a2e,
    shaft: 0xe8d88a,
    shaftAlpha: 0.08,
  },
};
