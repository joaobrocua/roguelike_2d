/**
 * Maior escala inteira, em pixels do monitor, em que o jogo cabe na janela.
 * `cssWidth/cssHeight` são o tamanho da janela em pixels CSS e `density` é a razão entre pixels
 * do monitor e pixels CSS (window.devicePixelRatio). Nunca devolve menos que 1.
 */
export function integerDeviceZoom(
  cssWidth: number,
  cssHeight: number,
  density: number,
  game: { width: number; height: number },
): number {
  const safeDensity = density > 0 ? density : 1;
  const fit = Math.min(
    (cssWidth * safeDensity) / game.width,
    (cssHeight * safeDensity) / game.height,
  );
  // O epsilon evita perder um nível por erro de ponto flutuante (ex.: 1920 / 480 = 3,9999...)
  return Math.max(1, Math.floor(fit + 1e-6));
}
