/**
 * Coordenação de bando (cães de ossos): limita quantos atacam ao mesmo tempo e espaça
 * o início dos ataques. Nada aqui aloca depois de `createPack`.
 */
export interface PackState {
  /** Id do membro que segura cada slot; -1 = livre. Tamanho fixo = máximo simultâneo. */
  holders: number[];
  slots: number;
  /** Intervalo mínimo entre o início de dois ataques do bando. */
  gapMs: number;
  gapTimerMs: number;
}

const FREE = -1;

export function createPack(maxConcurrent: number, gapMs: number): PackState {
  const slots = Math.max(0, Math.floor(maxConcurrent));
  const holders: number[] = [];
  for (let i = 0; i < slots; i++) holders.push(FREE);
  return { holders, slots, gapMs, gapTimerMs: 0 };
}

/** Desconta o intervalo entre ataques até 0. */
export function updatePack(pack: PackState, dtMs: number): void {
  pack.gapTimerMs = Math.max(0, pack.gapTimerMs - Math.max(0, dtMs));
}

/** Pergunta de forma idempotente: quem já segura um slot continua podendo atacar. */
export function holdsAttack(pack: PackState, memberId: number): boolean {
  if (memberId === FREE) return false;
  for (let i = 0; i < pack.holders.length; i++) {
    if (pack.holders[i] === memberId) return true;
  }
  return false;
}

/**
 * O membro `id` pode atacar agora? Se já segura um slot, sim. Senão, só se há slot livre
 * e o intervalo do bando zerou; nesse caso ocupa o slot e reinicia o intervalo.
 */
export function tryAcquireAttack(pack: PackState, memberId: number): boolean {
  if (memberId === FREE) return false; // -1 é o marcador de slot livre, não um membro
  if (holdsAttack(pack, memberId)) return true;
  if (pack.gapTimerMs > 0) return false;
  for (let i = 0; i < pack.holders.length; i++) {
    if (pack.holders[i] === FREE) {
      pack.holders[i] = memberId;
      pack.gapTimerMs = pack.gapMs;
      return true;
    }
  }
  return false;
}

/** Libera o slot do membro (não faz nada se ele não tem). */
export function releaseAttack(pack: PackState, memberId: number): void {
  if (memberId === FREE) return;
  for (let i = 0; i < pack.holders.length; i++) {
    if (pack.holders[i] === memberId) pack.holders[i] = FREE;
  }
}

/** Como `tryAcquireAttack`, mas só consulta: não ocupa o slot nem mexe no intervalo. */
export function canAcquireAttack(pack: PackState, memberId: number): boolean {
  if (memberId === FREE) return false;
  if (holdsAttack(pack, memberId)) return true;
  if (pack.gapTimerMs > 0) return false;
  for (let i = 0; i < pack.holders.length; i++) {
    if (pack.holders[i] === FREE) return true;
  }
  return false;
}
