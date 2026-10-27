/**
 * Escala que faz o jogo ocupar a janela toda, mesmo fracionária (a tela é 16:9: sobra faixa escura
 * só nos lados ou em cima e embaixo, conforme a janela). `cssWidth/cssHeight` em pixels CSS.
 */
export function fillZoom(
  cssWidth: number,
  cssHeight: number,
  game: { width: number; height: number },
): number {
  const fit = Math.min(cssWidth / game.width, cssHeight / game.height);
  return fit > 0 ? fit : 1;
}
