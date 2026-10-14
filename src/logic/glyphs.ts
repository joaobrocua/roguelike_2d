/**
 * Quais caracteres a fonte de pixels do jogo sabe desenhar. Lógica pura: serve para o atlas
 * de glifos ser montado com o conjunto certo e para os testes garantirem que nenhum texto do
 * jogo usa um caractere que ficaria em branco na tela.
 */

/** Letras sem acento, números e pontuação comum. */
const BASIC =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

/** Acentos do português e alguns símbolos usados nos textos. */
const PORTUGUESE = 'ÁÀÂÃÉÊÍÓÔÕÚÜÇáàâãéêíóôõúüçÑñ°ªº·•—–…«»¡¿×';

export const GLYPH_SET = BASIC + PORTUGUESE;

/** Caracteres do texto que a fonte não tem (sem repetir), na ordem em que aparecem. */
export function unsupportedChars(text: string, supported: string = GLYPH_SET): string {
  let missing = '';
  for (const char of text) {
    if (char === '\n') continue;
    if (!supported.includes(char) && !missing.includes(char)) missing += char;
  }
  return missing;
}
