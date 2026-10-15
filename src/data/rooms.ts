/**
 * Medidas e objetos das salas. Os desenhos (modelos de sala) ficam em data/roomTemplates.ts.
 * Salas são descritas em texto. Cada caractere é um bloco de TILE_SIZE pixels:
 *   '#' = bloco sólido   '.' = vazio   'P' = ponto de nascimento do jogador
 *   'T' tocha de parede (decoração)
 *   'C' Carniçal   'A' Arqueiro Oco   'V' Vulto   'D' Cão de Ossos   'L' Lobo Espectral   'R' Raiz Emboscadora (ver ENEMY_MARKERS)
 * Na etapa 5 estes blocos passam a ser conectáveis pelo gerador de andares.
 *
 * Medidas de referência do pulo: o jogador sobe ~3,5 blocos e mede ~1,4 bloco de altura;
 * deixe pelo menos 2 blocos livres sob uma plataforma para ele passar por baixo.
 */

export const TILE_SIZE = 16;

/** Objetos tocáveis marcados na sala: 'B' baú, 'F' fogueira de descanso, 'X' porta do próximo bioma. */
export const PROP_MARKERS = { B: 'chest', F: 'fire', X: 'door' } as const;

/** Troca de sala: duração do fade, folga do mundo além das paredes e suavidade da câmera. */
export const ROOM_TRANSITION = {
  fadeMs: 160,
  worldMarginPx: 48,
  cameraLerp: 0.12,
  /** Tremor e clarão quando o chefe entra na fase 2. */
  phaseShakeMs: 500,
  phaseFlashMs: 300,
  phaseShakeIntensity: 0.012,
  /** Pouso do chefe depois de um salto. */
  landShakeMs: 160,
  landShakeIntensity: 0.006,
  landDustCount: 8,
  /** Cor (RGB) do clarão da fase 2. */
  phaseFlashColor: { r: 255, g: 196, b: 107 },
} as const;

/**
 * O altar do santuário, aos pés do anjo caído colossal da sala própria do santuário (data/sanctuaryRoom.ts).
 * Medidas em px.
 */
export const SHRINE = {
  /** Aviso que aparece quando o herói chega perto (sobre o altar). */
  label: 'SANTUÁRIO',
  /** Altura (px) do aviso acima do chão do altar. */
  promptDy: { name: 70, key: 81 },
  /** Altura (px) da região em que o herói consegue usar o altar, e quanto ela desce abaixo dele (os degraus). */
  boxHeight: 46,
  boxBelow: 40,
  /** Folga lateral (px) da região de uso. */
  reachX: 26,
  /** Altura (px) do centro do brilho acima do chão. */
  glowDy: 40,
  /** O orbe de alma que flutua sobre o altar: altura do centro, vaivém (px) e período (ms). */
  orb: { dy: 52, bob: 2, bobMs: 2000 },
} as const;
