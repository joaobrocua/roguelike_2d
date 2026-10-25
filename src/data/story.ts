/**
 * A história do jogo: a abertura em cartões (antes da primeira descida, e de novo pelo menu
 * HISTÓRIA) e o fim, na tela de vitória. Textos em português; cada cartão tem uma ilustração
 * montada com a arte do próprio jogo (src/scenes/IntroScene.ts).
 */

/** Qual ilustração cada cartão mostra. */
export type StoryArt = 'castle' | 'outlands' | 'guardian' | 'watcher' | 'descent';

export interface StoryCard {
  art: StoryArt;
  text: string;
}

export const INTRO_CARDS: readonly StoryCard[] = [
  {
    art: 'castle',
    text: 'Houve um reino cujo nome ninguém mais lembra. Ele não caiu de uma vez: apodreceu, andar por andar, até o castelo virar um túmulo de pedra.',
  },
  {
    art: 'outlands',
    text: 'A guerra, a fome e o fogo passaram pelas terras de fora. Nas minas e na vila, os mortos continuaram o trabalho. Nas muralhas, as sentinelas esqueceram que a guerra tinha acabado.',
  },
  {
    art: 'guardian',
    text: 'No fundo das catacumbas, o Guardião jurou proteger o castelo de tudo, até de quem tentasse libertá-lo. A armadura rachou, mas o juramento não. Cada área tem um guardião, e cada um mantém o selo fechado.',
  },
  {
    art: 'watcher',
    text: 'Você é o Último Vigia, o único que ainda lembra para que servia a vigília. Cada vez que cai, o Santuário o desperta de novo.',
  },
  {
    art: 'descent',
    text: 'Desça. Atravesse o que sobrou do reino. Quebre o juramento do Guardião.',
  },
];

/** O fim, na tela de vitória: duas linhas curtas (cabem na largura da tela). */
export const EPILOGUE: readonly [string, string] = [
  'O Guardião Partido caiu. O castelo enfim silenciou.',
  'Pela primeira vez em séculos, o Vigia pôde descansar.',
];

export const STORY = {
  /** Letras reveladas por segundo no texto "digitado". */
  charsPerSecond: 42,
  /** Espera (ms) depois de o texto terminar antes de o aviso de continuar aparecer. */
  promptDelayMs: 500,
  /** Troca de cartão: tempo (ms) do esmaecer para fora e para dentro. */
  fadeMs: 380,
  /** Aperto ignorado logo ao abrir (ms), para o aperto que abriu a tela não passar o cartão. */
  inputLockMs: 350,
  /** Cartão: a imagem se aproxima devagar enquanto o texto é lido (escala final e duração). */
  zoom: { to: 1.07, ms: 12000 },
  /** Faixa escura do texto (px a partir do topo) e margens do texto. */
  panel: { top: 188, alpha: 0.78, textX: 36, textY: 202, textWidth: 408 },
  /** Cada cartão: luz do fundo (escurece a ilustração sem apagar o que importa). */
  artShade: 0.2,
  /** Textos de apoio. */
  prompt: 'J CONTINUAR   ESC PULAR',
  promptTouch: 'OK CONTINUAR   VOLTAR PULA',
} as const;

/** Onde fica guardado que a abertura já foi vista. */
export const STORY_STORAGE = { key: 'ruinas-esquecidas:story' } as const;
