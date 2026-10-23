/**
 * O aparelho é de toque (celular ou tablet)? Vale o ponteiro principal "grosso" (dedo); um
 * notebook com tela de toque, em que o principal é o mouse, não conta. Com `?touch` no endereço
 * os controles aparecem em qualquer aparelho (para testar).
 */
export function isTouchDevice(win: Window): boolean {
  if (new URLSearchParams(win.location.search).has('touch')) return true;
  return win.matchMedia?.('(pointer: coarse)').matches ?? false;
}
