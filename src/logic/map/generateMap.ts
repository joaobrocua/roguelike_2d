import type { BiomeConfig } from '../../data/mapRules';
import { createRng, randomInt, type Rng } from '../../utils/rng';
import { oppositeSide } from './types';
import type { BiomeId, BiomeMap, MapLink, PlacedRoom, RoomKind, Side, TemplateInfo } from './types';

/**
 * Gerador do mapa de um bioma: sorteia um caminho principal da esquerda para a direita
 * (com desvios para cima/baixo), pendura salas de combate e becos (baú/segredo) nele,
 * escolhe um modelo compatível para cada sala e, por fim, abre algumas ligações extras.
 * Função pura: tudo sai da seed (createRng); nada de Math.random.
 */

export interface GenerateOptions {
  /** último bioma: a sala final é 'boss' em vez de 'exit' */
  final?: boolean;
}

/** Tentativas antes de desistir; todas consomem a MESMA sequência do rng (determinístico). */
const MAX_ATTEMPTS = 50;
/** Teto de modelos testados na busca com retrocesso de uma tentativa. */
const MAX_ASSIGN_STEPS = 4000;
/** Chance de preferir uma sala larga (2 células) quando o catálogo oferece as duas larguras. */
const WIDE_CHANCE = 0.3;
/** Chance de o próximo passo do caminho principal ir para a direita (senão sobe/desce). */
const RIGHT_CHANCE = 0.6;
/** Chance de a sala inicial começar na segunda coluna em vez da primeira. */
const START_SHIFT_CHANCE = 0.25;

type HSide = 'right' | 'down';

interface DraftRoom {
  kind: RoomKind;
  gx: number;
  gy: number;
  w: number;
}

/** Ligação ainda sem células: sempre vista da sala da esquerda (right) ou de cima (down). */
interface DraftLink {
  from: number;
  to: number;
  side: HSide;
}

interface Candidate {
  parent: number;
  side: Side;
  gx: number;
  gy: number;
  w: number;
}

interface CellPair {
  fromCell: number;
  toCell: number;
}

interface Context {
  rng: Rng;
  biome: BiomeId;
  config: BiomeConfig;
  finalKind: RoomKind;
  eligible: readonly TemplateInfo[];
  /** `${kind}|${cellsW}|${side}` de todo lado que algum modelo elegível tem como porta. */
  doorKeys: Set<string>;
  widths: Map<RoomKind, number[]>;
}

function doorKey(kind: RoomKind, w: number, side: Side): string {
  return `${kind}|${w}|${side}`;
}

function isDeadEnd(kind: RoomKind): boolean {
  return kind === 'secret' || kind === 'chest';
}

function hasExit(t: TemplateInfo, side: Side, cell: number): boolean {
  return t.exits.some((e) => e.side === side && e.cell === cell);
}

/** Acesso a índice que sabemos válido; falha alto em vez de devolver undefined. */
function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined)
    throw new Error(`Índice ${index} fora da lista (tamanho ${items.length}).`);
  return item;
}

function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(rng, 0, i + 1);
    const tmp = at(out, i);
    out[i] = at(out, j);
    out[j] = tmp;
  }
  return out;
}

/** Ligação vista de quem está à esquerda/em cima (fromSide 'right'/'down'). */
function canonicalLink(link: MapLink): MapLink {
  if (link.fromSide === 'right' || link.fromSide === 'down') return link;
  return invertLink(link);
}

function invertLink(link: MapLink): MapLink {
  return {
    from: link.to,
    to: link.from,
    fromSide: oppositeSide(link.fromSide),
    fromCell: link.toCell,
    toCell: link.fromCell,
  };
}

/**
 * Pares de células (porta de A, porta de B) possíveis para ligar A a B, com B à direita
 * ('right') ou embaixo ('down') de A, dados os modelos. Vazio = os modelos não se encaixam.
 */
function linkOptions(
  a: { gx: number; w: number },
  ta: TemplateInfo,
  b: { gx: number; w: number },
  tb: TemplateInfo,
  side: HSide,
): CellPair[] {
  if (side === 'right') {
    return hasExit(ta, 'right', 0) && hasExit(tb, 'left', 0) ? [{ fromCell: 0, toCell: 0 }] : [];
  }
  const options: CellPair[] = [];
  const first = Math.max(a.gx, b.gx);
  const last = Math.min(a.gx + a.w, b.gx + b.w) - 1;
  for (let col = first; col <= last; col++) {
    const fromCell = col - a.gx;
    const toCell = col - b.gx;
    if (hasExit(ta, 'down', fromCell) && hasExit(tb, 'up', toCell))
      options.push({ fromCell, toCell });
  }
  return options;
}

export function findLink(map: BiomeMap, roomId: number, side: Side): MapLink | undefined {
  for (const link of map.links) {
    if (link.from === roomId && link.fromSide === side) return link;
    if (link.to === roomId && oppositeSide(link.fromSide) === side) return invertLink(link);
  }
  return undefined;
}

export function generateBiomeMap(
  seed: number,
  biome: BiomeId,
  catalog: readonly TemplateInfo[],
  config: BiomeConfig,
  options: GenerateOptions = {},
): BiomeMap {
  const finalKind: RoomKind = options.final === true ? 'boss' : 'exit';
  const eligible = catalog.filter((t) => t.biome === biome || t.biome === 'any');

  const miniboss = config.miniboss ?? 0;
  const fixed = 2 + config.chests + config.rests + config.secrets + miniboss;
  if (config.minRooms < fixed) {
    throw new Error(
      `Configuração do bioma '${biome}' inválida: minRooms (${config.minRooms}) é menor que as ${fixed} salas obrigatórias.`,
    );
  }
  const needed: RoomKind[] = ['start', finalKind];
  if (config.chests > 0) needed.push('chest');
  if (config.rests > 0) needed.push('rest');
  if (miniboss > 0) needed.push('miniboss');
  if (config.secrets > 0) needed.push('secret');
  if (config.maxRooms > fixed) needed.push('combat');
  for (const kind of needed) {
    if (!eligible.some((t) => t.kind === kind)) {
      throw new Error(`Catálogo sem modelo do tipo '${kind}' para o bioma '${biome}'.`);
    }
  }

  const doorKeys = new Set<string>();
  const widths = new Map<RoomKind, number[]>();
  for (const t of eligible) {
    for (const e of t.exits) doorKeys.add(doorKey(t.kind, t.cellsW, e.side));
    const list = widths.get(t.kind) ?? [];
    if (!list.includes(t.cellsW)) list.push(t.cellsW);
    widths.set(t.kind, list);
  }

  const ctx: Context = {
    rng: createRng(seed),
    biome,
    config,
    finalKind,
    eligible,
    doorKeys,
    widths,
  };
  let lastReason = '';
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const built = tryBuild(ctx, seed, catalog, options);
    if (typeof built !== 'string') return built;
    lastReason = built;
  }
  throw new Error(
    `Não foi possível gerar o mapa do bioma '${biome}' (seed ${seed}) em ${MAX_ATTEMPTS} tentativas: ${lastReason}`,
  );
}

/** Uma tentativa completa. Devolve o mapa ou o motivo da falha. */
function tryBuild(
  ctx: Context,
  seed: number,
  catalog: readonly TemplateInfo[],
  options: GenerateOptions,
): BiomeMap | string {
  const { rng, config } = ctx;
  const dead = config.chests + config.secrets;
  const n = randomInt(rng, config.minRooms, config.maxRooms + 1);
  const miniboss = config.miniboss ?? 0;
  const core = n - dead; // start + final + rests + mini-chefe + combates (tudo que não é beco)
  const combats = core - 2 - config.rests - miniboss;

  const draft = buildDraft(ctx, n, core, combats);
  if (typeof draft === 'string') return draft;

  const chosen = assignTemplates(ctx, draft.rooms, draft.links);
  if (chosen === undefined) return 'nenhum modelo compatível com as portas exigidas';

  const links: MapLink[] = draft.links.map((l) => {
    const opts = linkOptions(
      at(draft.rooms, l.from),
      at(chosen, l.from),
      at(draft.rooms, l.to),
      at(chosen, l.to),
      l.side,
    );
    const pick = at(opts, randomInt(rng, 0, opts.length));
    return {
      from: l.from,
      to: l.to,
      fromSide: l.side,
      fromCell: pick.fromCell,
      toCell: pick.toCell,
    };
  });
  addExtraLinks(ctx, draft.rooms, chosen, links);

  const rooms: PlacedRoom[] = draft.rooms.map((r, id) => ({
    id,
    templateId: at(chosen, id).id,
    kind: r.kind,
    gx: r.gx,
    gy: r.gy,
    cellsW: r.w,
  }));
  const map: BiomeMap = {
    seed,
    biome: ctx.biome,
    rooms,
    links,
    startId: 0,
    endId: draft.endId,
  };
  // rede de segurança: nunca devolve um mapa que o próprio validador recusa
  const problems = validateMap(map, catalog, config, options);
  return problems.length === 0 ? map : `mapa gerado inválido: ${problems[0]}`;
}

interface Draft {
  rooms: DraftRoom[];
  links: DraftLink[];
  endId: number;
}

function buildDraft(ctx: Context, n: number, core: number, combats: number): Draft | string {
  const { rng, config, finalKind, widths } = ctx;
  const cols = config.gridCols;
  const rows = config.gridRows;
  const rooms: DraftRoom[] = [];
  const links: DraftLink[] = [];
  const occ: boolean[] = new Array<boolean>(cols * rows).fill(false);

  const free = (gx: number, gy: number, w: number): boolean => {
    if (gy < 0 || gy >= rows || gx < 0 || gx + w > cols) return false;
    for (let x = gx; x < gx + w; x++) if (occ[gy * cols + x]) return false;
    return true;
  };
  const add = (kind: RoomKind, gx: number, gy: number, w: number): number => {
    for (let x = gx; x < gx + w; x++) occ[gy * cols + x] = true;
    rooms.push({ kind, gx, gy, w });
    return rooms.length - 1;
  };
  const usedSides = new Set<string>(); // `${sala}|${lado}` já ligados: um lado só tem uma ligação
  const addLinked = (c: Candidate, kind: RoomKind): number => {
    const id = add(kind, c.gx, c.gy, c.w);
    usedSides.add(`${c.parent}|${c.side}`);
    if (c.side === 'right' || c.side === 'down') {
      links.push({ from: c.parent, to: id, side: c.side });
    } else {
      links.push({ from: id, to: c.parent, side: oppositeSide(c.side) as HSide });
    }
    return id;
  };

  /** Posições livres para uma sala nova `kind` ligada a `parent` por algum dos `sides`. */
  const candidates = (
    parent: number,
    kind: RoomKind,
    sides: readonly Side[],
    minCol: number,
    maxCol: number,
  ): Candidate[] => {
    const p = at(rooms, parent);
    const out: Candidate[] = [];
    for (const w of widths.get(kind) ?? []) {
      for (const side of sides) {
        if (usedSides.has(`${parent}|${side}`)) continue;
        if (!ctx.doorKeys.has(doorKey(p.kind, p.w, side))) continue;
        if (!ctx.doorKeys.has(doorKey(kind, w, oppositeSide(side)))) continue;
        let first: number;
        let last: number;
        let gy = p.gy;
        if (side === 'right') {
          first = last = p.gx + p.w;
        } else if (side === 'left') {
          first = last = p.gx - w;
        } else {
          first = p.gx - w + 1; // alguma coluna em comum com a sala de origem
          last = p.gx + p.w - 1;
          gy = side === 'up' ? p.gy - 1 : p.gy + 1;
        }
        for (let gx = first; gx <= last; gx++) {
          if (gx < minCol || gx + w - 1 > maxCol || !free(gx, gy, w)) continue;
          out.push({ parent, side, gx, gy, w });
        }
      }
    }
    return out;
  };

  /** Sorteia uma posição; salas largas só entram com WIDE_CHANCE quando há opção estreita. */
  const pick = (entries: readonly Candidate[]): Candidate | undefined => {
    if (entries.length === 0) return undefined;
    const wide = entries.filter((e) => e.w > 1);
    const narrow = entries.filter((e) => e.w === 1);
    let group: readonly Candidate[] = entries;
    if (wide.length > 0 && narrow.length > 0) group = rng() < WIDE_CHANCE ? wide : narrow;
    return group[randomInt(rng, 0, group.length)];
  };

  // caminho principal: start -> (rests e combates em ordem sorteada) -> final
  const miniboss = config.miniboss ?? 0;
  const lo = Math.min(core, Math.max(3, config.rests + miniboss + 2));
  const hi = Math.max(lo, Math.min(core, cols + 1));
  const m = randomInt(rng, lo, hi + 1);
  const mids: RoomKind[] = [];
  for (let i = 0; i < config.rests; i++) mids.push('rest');
  while (mids.length < m - 2 - miniboss) mids.push('combat');
  // o mini-chefe fica sempre por último, logo antes da saída
  const midOrder: RoomKind[] = shuffle(rng, mids);
  for (let i = 0; i < miniboss; i++) midOrder.push('miniboss');

  const startGx = rng() < START_SHIFT_CHANCE ? 1 : 0;
  const startWidths = (widths.get('start') ?? []).filter((w) => startGx + w <= cols);
  if (startWidths.length === 0) return 'sala inicial não cabe na grade';
  const wantsWide = startWidths.includes(2) && (startWidths.length === 1 || rng() < WIDE_CHANCE);
  add('start', startGx, randomInt(rng, 0, rows), wantsWide ? 2 : 1);

  for (let step = 1; step < m; step++) {
    const isLast = step === m - 1;
    const kind: RoomKind = isLast ? finalKind : (midOrder[step - 1] ?? 'combat');
    let entries = candidates(step - 1, kind, ['right', 'up', 'down'], startGx, cols - 1);
    if (isLast) {
      // a final tem de ficar na coluna mais à direita de todas
      const maxRight = Math.max(...rooms.map((r) => r.gx + r.w - 1));
      entries = entries.filter((e) => e.gx + e.w - 1 >= maxRight);
    }
    const rights = entries.filter((e) => e.side === 'right');
    const verticals = entries.filter((e) => e.side !== 'right');
    let group = entries;
    if (rights.length > 0 && verticals.length > 0)
      group = rng() < RIGHT_CHANCE ? rights : verticals;
    const chosen = pick(group);
    if (chosen === undefined) return 'caminho principal sem espaço na grade';
    addLinked(chosen, kind);
  }
  const endId = rooms.length - 1;
  const minCol = startGx;
  const endRoom = at(rooms, endId);
  const maxCol = endRoom.gx + endRoom.w - 1;

  // combates fora do caminho principal: penduram-se em qualquer sala que não seja beco
  const branchCombats = combats - (m - 2 - config.rests - miniboss);
  for (let i = 0; i < branchCombats; i++) {
    const all: Candidate[] = [];
    for (const parent of shuffle(
      rng,
      rooms.map((_, idx) => idx),
    )) {
      all.push(...candidates(parent, 'combat', ['left', 'right', 'up', 'down'], minCol, maxCol));
    }
    const chosen = pick(all);
    if (chosen === undefined) return 'combate extra sem espaço na grade';
    addLinked(chosen, 'combat');
  }

  // becos por último; evitam pendurar na entrada/saída quando há outra opção
  const deadKinds: RoomKind[] = [];
  for (let i = 0; i < config.chests; i++) deadKinds.push('chest');
  for (let i = 0; i < config.secrets; i++) deadKinds.push('secret');
  for (const kind of shuffle(rng, deadKinds)) {
    const buildAll = (parents: readonly number[]): Candidate[] => {
      const all: Candidate[] = [];
      for (const parent of parents) {
        all.push(...candidates(parent, kind, ['left', 'right', 'up', 'down'], minCol, maxCol));
      }
      return all;
    };
    const inner: number[] = [];
    const ends: number[] = [];
    rooms.forEach((r, idx) => {
      if (isDeadEnd(r.kind)) return;
      (idx === 0 || idx === endId ? ends : inner).push(idx);
    });
    let entries = buildAll(inner);
    if (entries.length === 0) entries = buildAll(ends);
    const chosen = pick(entries);
    if (chosen === undefined) return `beco '${kind}' sem espaço na grade`;
    addLinked(chosen, kind);
  }

  if (rooms.length !== n) return 'número de salas inesperado';
  return { rooms, links, endId };
}

/** Busca com retrocesso: um modelo por sala, de modo que todas as ligações tenham portas. */
function assignTemplates(
  ctx: Context,
  rooms: readonly DraftRoom[],
  links: readonly DraftLink[],
): TemplateInfo[] | undefined {
  const linksOf: DraftLink[][] = rooms.map(() => []);
  for (const l of links) {
    at(linksOf, l.from).push(l);
    at(linksOf, l.to).push(l);
  }
  const candidates: TemplateInfo[][] = [];
  for (let i = 0; i < rooms.length; i++) {
    const r = at(rooms, i);
    const list = ctx.eligible.filter((t) => {
      if (t.kind !== r.kind || t.cellsW !== r.w) return false;
      return at(linksOf, i).every((l) => {
        const side: Side = l.from === i ? l.side : oppositeSide(l.side);
        return t.exits.some((e) => e.side === side);
      });
    });
    if (list.length === 0) return undefined;
    candidates.push(shuffle(ctx.rng, list));
  }

  const chosen: TemplateInfo[] = [];
  let steps = 0;
  const place = (i: number): boolean => {
    if (i === rooms.length) return true;
    for (const t of at(candidates, i)) {
      if (++steps > MAX_ASSIGN_STEPS) return false;
      chosen[i] = t;
      const fits = at(linksOf, i).every((l) => {
        if (l.from > i || l.to > i) return true; // a outra ponta ainda não tem modelo
        return (
          linkOptions(
            at(rooms, l.from),
            at(chosen, l.from),
            at(rooms, l.to),
            at(chosen, l.to),
            l.side,
          ).length > 0
        );
      });
      if (fits && place(i + 1)) return true;
    }
    return false;
  };
  return place(0) ? chosen : undefined;
}

/** Abre até config.extraLinks ligações entre vizinhas ainda não ligadas (becos ficam de fora). */
function addExtraLinks(
  ctx: Context,
  rooms: readonly DraftRoom[],
  chosen: readonly TemplateInfo[],
  links: MapLink[],
): void {
  const linked = new Set<string>();
  const usedSides = new Set<string>(); // `${sala}|${lado}`: um lado só pode ter uma ligação
  for (const l of links) {
    linked.add(`${l.from}-${l.to}`);
    usedSides.add(`${l.from}|${l.fromSide}`);
    usedSides.add(`${l.to}|${oppositeSide(l.fromSide)}`);
  }

  const pool: { from: number; to: number; side: HSide; opts: CellPair[] }[] = [];
  for (let a = 0; a < rooms.length; a++) {
    for (let b = 0; b < rooms.length; b++) {
      const ra = at(rooms, a);
      const rb = at(rooms, b);
      if (a === b || isDeadEnd(ra.kind) || isDeadEnd(rb.kind)) continue;
      let side: HSide | undefined;
      if (rb.gy === ra.gy && rb.gx === ra.gx + ra.w) side = 'right';
      else if (rb.gy === ra.gy + 1 && rb.gx < ra.gx + ra.w && ra.gx < rb.gx + rb.w) side = 'down';
      if (side === undefined) continue;
      if (linked.has(`${a}-${b}`) || linked.has(`${b}-${a}`)) continue;
      if (usedSides.has(`${a}|${side}`) || usedSides.has(`${b}|${oppositeSide(side)}`)) continue;
      const opts = linkOptions(ra, at(chosen, a), rb, at(chosen, b), side);
      if (opts.length > 0) pool.push({ from: a, to: b, side, opts });
    }
  }
  let added = 0;
  for (const c of shuffle(ctx.rng, pool)) {
    if (added >= ctx.config.extraLinks) break;
    const sideA = `${c.from}|${c.side}`;
    const sideB = `${c.to}|${oppositeSide(c.side)}`;
    if (usedSides.has(sideA) || usedSides.has(sideB)) continue; // já tomado por outra extra
    usedSides.add(sideA);
    usedSides.add(sideB);
    added++;
    const pick = at(c.opts, randomInt(ctx.rng, 0, c.opts.length));
    links.push({
      from: c.from,
      to: c.to,
      fromSide: c.side,
      fromCell: pick.fromCell,
      toCell: pick.toCell,
    });
  }
}

/** Confere todas as regras do mapa. Devolve os problemas em português; vazia = mapa válido. */
export function validateMap(
  map: BiomeMap,
  catalog: readonly TemplateInfo[],
  config: BiomeConfig,
  options: GenerateOptions = {},
): string[] {
  const problems: string[] = [];
  const finalKind: RoomKind = options.final === true ? 'boss' : 'exit';
  const byId = new Map<number, PlacedRoom>();
  const templates = new Map<string, TemplateInfo>();
  for (const t of catalog) if (!templates.has(t.id)) templates.set(t.id, t);

  const count = map.rooms.length;
  if (count < config.minRooms || count > config.maxRooms) {
    problems.push(
      `Número de salas (${count}) fora do intervalo ${config.minRooms}-${config.maxRooms}.`,
    );
  }

  // salas: ids, tamanho, grade, sobreposição, modelo
  const cellOwner = new Map<number, number>();
  for (const r of map.rooms) {
    if (byId.has(r.id)) {
      problems.push(`Id de sala repetido: ${r.id}.`);
      continue;
    }
    byId.set(r.id, r);
    if (r.cellsW !== 1 && r.cellsW !== 2)
      problems.push(`Sala ${r.id}: largura ${r.cellsW} inválida.`);
    if (r.gx < 0 || r.gy < 0 || r.gx + r.cellsW > config.gridCols || r.gy >= config.gridRows) {
      problems.push(`Sala ${r.id} fora da grade (${r.gx},${r.gy}).`);
    }
    for (let x = r.gx; x < r.gx + r.cellsW; x++) {
      const key = r.gy * 1000 + x;
      const other = cellOwner.get(key);
      if (other !== undefined) {
        problems.push(`Salas ${other} e ${r.id} se sobrepõem na célula (${x},${r.gy}).`);
      } else {
        cellOwner.set(key, r.id);
      }
    }
    const t = templates.get(r.templateId);
    if (t === undefined) {
      problems.push(`Sala ${r.id}: modelo '${r.templateId}' não existe no catálogo.`);
    } else if (
      t.kind !== r.kind ||
      t.cellsW !== r.cellsW ||
      (t.biome !== map.biome && t.biome !== 'any')
    ) {
      problems.push(`Sala ${r.id}: modelo '${t.id}' não combina com o tipo, a largura ou o bioma.`);
    }
  }

  // contagens por tipo
  const expected: [RoomKind, number][] = [
    ['start', 1],
    [finalKind, 1],
    [finalKind === 'boss' ? 'exit' : 'boss', 0],
    ['rest', config.rests],
    ['miniboss', config.miniboss ?? 0],
    ['chest', config.chests],
    ['secret', config.secrets],
  ];
  for (const [kind, want] of expected) {
    const have = map.rooms.filter((r) => r.kind === kind).length;
    if (have !== want) problems.push(`Esperado ${want} sala(s) do tipo '${kind}', há ${have}.`);
  }
  const start = byId.get(map.startId);
  const end = byId.get(map.endId);
  if (start === undefined || start.kind !== 'start')
    problems.push('startId não aponta para a sala inicial.');
  if (end === undefined || end.kind !== finalKind) {
    problems.push(`endId não aponta para a sala final ('${finalKind}').`);
  }

  // ligações
  const degree = new Map<number, number>();
  const adjacency = new Map<number, number[]>();
  const usedDoors = new Set<string>();
  const usedPairs = new Set<string>();
  for (const raw of map.links) {
    const a = byId.get(raw.from);
    const b = byId.get(raw.to);
    const label = `Ligação ${raw.from}->${raw.to}`;
    if (a === undefined || b === undefined || a === b) {
      problems.push(`${label}: salas inexistentes ou iguais.`);
      continue;
    }
    const link = canonicalLink(raw);
    const ra = link.from === raw.from ? a : b;
    const rb = link.from === raw.from ? b : a;
    let adjacent: boolean;
    if (link.fromSide === 'right') {
      adjacent = rb.gy === ra.gy && rb.gx === ra.gx + ra.cellsW;
      if (link.fromCell !== 0 || link.toCell !== 0) problems.push(`${label}: células devem ser 0.`);
    } else {
      adjacent =
        rb.gy === ra.gy + 1 &&
        link.fromCell >= 0 &&
        link.fromCell < ra.cellsW &&
        link.toCell >= 0 &&
        link.toCell < rb.cellsW &&
        ra.gx + link.fromCell === rb.gx + link.toCell;
    }
    if (!adjacent) {
      problems.push(`${label}: salas não são vizinhas ou as portas não se alinham na grade.`);
    }
    const ta = templates.get(ra.templateId);
    const tb = templates.get(rb.templateId);
    const opposite = oppositeSide(link.fromSide);
    if (ta !== undefined && !hasExit(ta, link.fromSide, link.fromCell)) {
      problems.push(
        `${label}: a sala ${ra.id} não tem a porta '${link.fromSide}' (célula ${link.fromCell}).`,
      );
    }
    if (tb !== undefined && !hasExit(tb, opposite, link.toCell)) {
      problems.push(
        `${label}: a sala ${rb.id} não tem a porta '${opposite}' (célula ${link.toCell}).`,
      );
    }
    // no máximo uma ligação por lado de cada sala (é o que findLink(sala, lado) assume)
    const doorA = `${ra.id}|${link.fromSide}`;
    const doorB = `${rb.id}|${opposite}`;
    const pair = `${ra.id}-${rb.id}`;
    if (usedDoors.has(doorA) || usedDoors.has(doorB) || usedPairs.has(pair)) {
      problems.push(`${label}: ligação repetida ou lado da sala já usado por outra ligação.`);
    }
    usedDoors.add(doorA);
    usedDoors.add(doorB);
    usedPairs.add(pair);
    for (const [x, y] of [
      [ra.id, rb.id],
      [rb.id, ra.id],
    ] as const) {
      degree.set(x, (degree.get(x) ?? 0) + 1);
      adjacency.set(x, [...(adjacency.get(x) ?? []), y]);
    }
  }
  if (map.links.length > count - 1 + config.extraLinks) {
    problems.push(
      `Ligações demais: ${map.links.length} (máximo ${count - 1 + config.extraLinks}).`,
    );
  }

  // becos e descanso
  for (const r of map.rooms) {
    const d = degree.get(r.id) ?? 0;
    if (isDeadEnd(r.kind) && d !== 1) {
      problems.push(
        `Sala ${r.id} ('${r.kind}') é um beco e deve ter exatamente 1 ligação (tem ${d}).`,
      );
    }
    if (r.kind === 'rest' && d < 1) problems.push(`Sala de descanso ${r.id} está sem ligação.`);
  }

  // conectividade (a partir da entrada) e caminho até a saída
  if (map.rooms.length > 0) {
    const origin = start !== undefined ? start.id : at(map.rooms, 0).id;
    const seen = new Set<number>([origin]);
    const queue = [origin];
    for (let head = 0; head < queue.length; head++) {
      for (const next of adjacency.get(at(queue, head)) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    const lost = map.rooms.filter((r) => !seen.has(r.id)).map((r) => r.id);
    if (lost.length > 0) problems.push(`Mapa desconectado: salas ${lost.join(', ')} sem caminho.`);
    if (end !== undefined && !seen.has(end.id))
      problems.push('Não há caminho da entrada até a saída.');
  }

  // progressão da esquerda para a direita
  if (start !== undefined && map.rooms.some((r) => r.gx < start.gx)) {
    problems.push('A sala inicial não está na coluna mais à esquerda.');
  }
  if (end !== undefined && map.rooms.some((r) => r.gx + r.cellsW > end.gx + end.cellsW)) {
    problems.push('A sala final não está na coluna mais à direita.');
  }
  return problems;
}
