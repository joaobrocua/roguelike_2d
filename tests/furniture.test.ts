import { describe, expect, it } from 'vitest';
import { footprintOf, planFurniture, type FurnitureItem } from '../src/logic/furniture';
import { isSolidTile, parseRoom, type ParsedRoom } from '../src/logic/roomParser';
import { ROOM_TEMPLATES } from '../src/data/roomTemplates';
import { ALL_BIOMES, CELL, DOOR } from '../src/data/mapRules';
import { DECOR_CLEAR_RADIUS_TILES, DECOR_DOOR_MARGIN_TILES } from '../src/data/decor';
import { FURNITURE, FURNITURE_GAP_TILES, WINGS, type WingDef } from '../src/data/wings';

const SEEDS = [1, 7920, 15839, 23758, 31677, 99991];
const ALL_WINGS: readonly WingDef[] = ALL_BIOMES.flatMap((biome) => WINGS[biome]);

/** Caixa de uma tela (30 x 17) com chão, teto, portas nas posições padrão e plataformas. */
function doorRoom(): ParsedRoom {
  const sideRows: readonly number[] = DOOR.horizontalRows;
  const doorCols: readonly number[] = DOOR.verticalCols;
  const rows: string[] = [];
  for (let r = 0; r < CELL.rows; r++) {
    let line = '';
    for (let c = 0; c < CELL.cols; c++) {
      const side = (c === 0 || c === CELL.cols - 1) && sideRows.includes(r);
      const vertical = doorCols.includes(c) && (r === 0 || r >= 15);
      const wall = r === 0 || r >= 15 || c === 0 || c === CELL.cols - 1;
      const platform = (r === 10 && c >= 4 && c <= 12) || (r === 6 && c >= 16 && c <= 26);
      line += (wall && !side && !vertical) || platform ? '#' : '.';
    }
    rows.push(line);
  }
  return parseRoom(rows);
}

/** Caixa fechada sem portas, de `cols` x `rows`, toda vazia por dentro. */
function plainBox(cols: number, rows: number): ParsedRoom {
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    lines.push(
      r === 0 || r === rows - 1 ? '#'.repeat(cols) : `#${'.'.repeat(Math.max(0, cols - 2))}#`,
    );
  }
  return parseRoom(lines);
}

const DOOR_ROW_MIN = Math.min(...DOOR.horizontalRows) - DECOR_DOOR_MARGIN_TILES;
const DOOR_ROW_MAX = Math.max(...DOOR.horizontalRows) + DECOR_DOOR_MARGIN_TILES;
const DOOR_COL_MIN = Math.min(...DOOR.verticalCols) - DECOR_DOOR_MARGIN_TILES;
const DOOR_COL_MAX = Math.max(...DOOR.verticalCols) + DECOR_DOOR_MARGIN_TILES;

function inDoorStrip(room: ParsedRoom, col: number, row: number): boolean {
  if ((col === 0 || col === room.cols - 1) && row >= DOOR_ROW_MIN && row <= DOOR_ROW_MAX) {
    return true;
  }
  if (row === 0 || row === room.rows - 1) {
    const inCell = col % CELL.cols;
    return inCell >= DOOR_COL_MIN && inCell <= DOOR_COL_MAX;
  }
  return false;
}

/** Lista as regras que o plano viola (vazia = plano válido). */
function violations(room: ParsedRoom, wing: WingDef, items: readonly FurnitureItem[]): string[] {
  const out: string[] = [];
  const kinds = new Set(wing.furniture.map((f) => f.kind));
  if (items.length > wing.count.max) out.push(`quantidade ${items.length} > ${wing.count.max}`);
  const anchors: { col: number; row: number }[] = [];
  if (room.spawn) anchors.push(room.spawn);
  anchors.push(...room.markers);

  items.forEach((item, i) => {
    const spec = FURNITURE[item.kind];
    const tag = `${item.kind}@${item.col},${item.row}`;
    const fp = footprintOf(item);
    if (!kinds.has(item.kind)) out.push(`${tag} fora da ala ${wing.id}`);
    if (item.variant < 0 || item.variant >= spec.variants) out.push(`${tag} variante inválida`);
    if (fp.col1 - fp.col0 + 1 !== spec.widthTiles || fp.row1 - fp.row0 + 1 !== spec.heightTiles) {
      out.push(`${tag} pegada com tamanho errado`);
    }
    if (fp.col0 < 0 || fp.col1 >= room.cols || fp.row0 < 0 || fp.row1 >= room.rows) {
      out.push(`${tag} fora da sala`);
    }
    const supportRow = item.row;
    if (spec.placement === 'floor' && item.row === 0) out.push(`${tag} na linha 0`);
    for (let c = fp.col0; c <= fp.col1; c++) {
      if (!isSolidTile(room, c, supportRow)) out.push(`${tag} sem apoio/teto em col ${c}`);
      for (let r = fp.row0; r <= fp.row1; r++) {
        if (isSolidTile(room, c, r)) out.push(`${tag} sem ar livre em ${c},${r}`);
      }
      // Faixa das portas: pegada visual mais a linha de apoio.
      for (let r = Math.min(fp.row0, supportRow); r <= Math.max(fp.row1, supportRow); r++) {
        if (inDoorStrip(room, c, r)) out.push(`${tag} na faixa de porta em ${c},${r}`);
      }
    }
    for (const a of anchors) {
      const near =
        a.col >= fp.col0 - DECOR_CLEAR_RADIUS_TILES &&
        a.col <= fp.col1 + DECOR_CLEAR_RADIUS_TILES &&
        a.row >= fp.row0 - DECOR_CLEAR_RADIUS_TILES &&
        a.row <= fp.row1 + DECOR_CLEAR_RADIUS_TILES;
      if (near) out.push(`${tag} perto de marcador em ${a.col},${a.row}`);
    }
    for (let j = i + 1; j < items.length; j++) {
      const other = items[j] as FurnitureItem;
      const ofp = footprintOf(other);
      const sameSide = FURNITURE[other.kind].placement === spec.placement;
      const gap = sameSide ? FURNITURE_GAP_TILES : 0;
      const rowsTouch = fp.row0 <= ofp.row1 && ofp.row0 <= fp.row1;
      const colsTouch = fp.col0 - gap <= ofp.col1 && ofp.col0 - gap <= fp.col1;
      if (rowsTouch && colsTouch)
        out.push(`${tag} colide com ${other.kind}@${other.col},${other.row}`);
    }
  });
  return out;
}

/** Ala de teste com um único tipo de peça e muitas peças por sala. */
function singleKindWing(kind: keyof typeof FURNITURE, count: number): WingDef {
  return {
    id: 'salao',
    name: 'TESTE',
    furniture: [{ kind, weight: 1 }],
    count: { min: count, max: count },
  };
}

const BIBLIOTECA = WINGS.saloes[1] as WingDef;
const SALAO = WINGS.saloes[0] as WingDef;

describe('footprintOf', () => {
  it('peça de chão ocupa as linhas acima do bloco de apoio', () => {
    // bookshelf: 2 de largura, 3 de altura
    expect(footprintOf({ kind: 'bookshelf', col: 5, row: 10, variant: 0, flipX: false })).toEqual({
      col0: 5,
      col1: 6,
      row0: 7,
      row1: 9,
    });
  });

  it('peça de teto ocupa as linhas abaixo do bloco de teto', () => {
    // tapestry: 2 de largura, 3 de altura
    expect(footprintOf({ kind: 'tapestry', col: 4, row: 1, variant: 0, flipX: true })).toEqual({
      col0: 4,
      col1: 5,
      row0: 2,
      row1: 4,
    });
  });
});

describe('planFurniture: salas montadas à mão', () => {
  it('é determinístico: mesma sala, ala e seed dão o mesmo plano', () => {
    const room = doorRoom();
    for (const seed of SEEDS) {
      expect(planFurniture(room, SALAO, seed)).toEqual(planFurniture(room, SALAO, seed));
    }
  });

  it('seeds diferentes dão planos diferentes', () => {
    const room = doorRoom();
    const distinct = new Set(SEEDS.map((s) => JSON.stringify(planFurniture(room, SALAO, s))));
    expect(distinct.size).toBeGreaterThan(1);
  });

  it('sala com espaço recebe peças, dentro da quantidade da ala', () => {
    const room = doorRoom();
    for (const seed of SEEDS) {
      const items = planFurniture(room, SALAO, seed);
      expect(items.length).toBeGreaterThan(0);
      expect(items.length).toBeLessThanOrEqual(SALAO.count.max);
    }
  });

  it('o plano respeita todas as regras (chão, teto, portas, marcadores, sobreposição)', () => {
    const room = doorRoom();
    const found: string[] = [];
    for (const wing of ALL_WINGS) {
      for (const seed of SEEDS)
        found.push(...violations(room, wing, planFurniture(room, wing, seed)));
    }
    expect(found).toEqual([]);
  });

  it('a lista sai ordenada por linha, coluna e tipo', () => {
    const room = doorRoom();
    for (const seed of SEEDS) {
      const items = planFurniture(room, SALAO, seed);
      for (let i = 1; i < items.length; i++) {
        const a = items[i - 1] as FurnitureItem;
        const b = items[i] as FurnitureItem;
        const order = a.row - b.row || a.col - b.col || (a.kind < b.kind ? -1 : 1);
        expect(order).toBeLessThanOrEqual(0);
      }
    }
  });

  it('peça de chão só aparece sobre chão e peça de teto só pendurada em teto', () => {
    const room = doorRoom();
    const wing = singleKindWing('table', 4);
    const items = planFurniture(room, wing, 3);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const fp = footprintOf(item);
      expect(fp.row1).toBe(item.row - 1);
      expect(isSolidTile(room, item.col, item.row)).toBe(true);
    }
    const hanging = planFurniture(room, singleKindWing('tapestry', 3), 3);
    expect(hanging.length).toBeGreaterThan(0);
    for (const item of hanging) expect(footprintOf(item).row0).toBe(item.row + 1);
  });

  it('nada fica na faixa das portas, mesmo pedindo muitas peças', () => {
    const room = doorRoom();
    const found: string[] = [];
    for (const seed of SEEDS) {
      for (const item of planFurniture(room, singleKindWing('barrel', 5), seed)) {
        const fp = footprintOf(item);
        for (let r = fp.row0; r <= item.row; r++) {
          for (let c = fp.col0; c <= fp.col1; c++)
            if (inDoorStrip(room, c, r)) found.push(`${c},${r}`);
        }
      }
    }
    expect(found).toEqual([]);
  });

  it('afasta as peças do marcador e do ponto de nascimento', () => {
    const layout: string[] = [];
    for (let r = 0; r < 10; r++) {
      if (r === 0 || r === 9) layout.push('#'.repeat(30));
      else if (r === 8) layout.push(`#P${'.'.repeat(10)}C${'.'.repeat(16)}#`);
      else layout.push(`#${'.'.repeat(28)}#`);
    }
    const room = parseRoom(layout);
    const found: string[] = [];
    for (const seed of SEEDS) {
      found.push(
        ...violations(
          room,
          singleKindWing('barrel', 12),
          planFurniture(room, singleKindWing('barrel', 12), seed),
        ),
      );
    }
    expect(found).toEqual([]);
    // Nenhum barril em cima do 'P' (col 1) nem do 'C' (col 12).
    const cols = new Set(
      SEEDS.flatMap((s) => planFurniture(room, singleKindWing('barrel', 12), s).map((i) => i.col)),
    );
    expect(cols.has(1)).toBe(false);
    expect(cols.has(12)).toBe(false);
  });

  it('respeita a folga lateral entre peças do mesmo tipo de colocação', () => {
    const room = plainBox(30, 8);
    const wing = singleKindWing('barrel', 20);
    for (const seed of SEEDS) {
      const items = planFurniture(room, wing, seed).filter((i) => i.row === 7);
      const cols = items.map((i) => i.col).sort((a, b) => a - b);
      for (let i = 1; i < cols.length; i++) {
        expect((cols[i] as number) - (cols[i - 1] as number)).toBeGreaterThan(FURNITURE_GAP_TILES);
      }
    }
  });

  it('peças de chão e de teto podem dividir a mesma coluna quando há altura', () => {
    const room = plainBox(10, 12);
    const wing: WingDef = {
      id: 'salao',
      name: 'TESTE',
      furniture: [
        { kind: 'barrel', weight: 1 },
        { kind: 'cage', weight: 1 },
      ],
      count: { min: 12, max: 12 },
    };
    let shared = false;
    for (let seed = 1; seed < 200 && !shared; seed++) {
      const items = planFurniture(room, wing, seed);
      expect(violations(room, wing, items)).toEqual([]);
      const floorCols = new Set(
        items.filter((i) => FURNITURE[i.kind].placement === 'floor').map((i) => i.col),
      );
      shared = items.some((i) => FURNITURE[i.kind].placement === 'ceiling' && floorCols.has(i.col));
    }
    expect(shared).toBe(true);
  });

  it('sala sem espaço devolve lista vazia', () => {
    // Sem ar nenhum: tudo sólido.
    const solid = parseRoom(['###', '###', '###']);
    const tiny = parseRoom(['.']);
    const flat = parseRoom(['....', '....']);
    for (const room of [solid, tiny, flat]) {
      for (const wing of ALL_WINGS) expect(planFurniture(room, wing, 5)).toEqual([]);
    }
  });

  it('peça alta não entra em sala baixa', () => {
    // Pé-direito de 2 blocos livres: o castiçal (altura 3) e a estante (3) não cabem.
    const room = plainBox(12, 4);
    expect(planFurniture(room, singleKindWing('bookshelf', 6), 4)).toEqual([]);
    expect(planFurniture(room, singleKindWing('candelabra', 6), 4)).toEqual([]);
    expect(planFurniture(room, singleKindWing('chair', 3), 4).length).toBeGreaterThan(0);
  });

  it('a sala tem de usar o chão: sem chão sólido sob a pegada, a peça é recusada', () => {
    // Chão com um buraco: nenhuma mesa (3 de largura) pode ter o apoio vazio.
    const layout = [
      '###############',
      '#.............#',
      '#.............#',
      '#.............#',
      '#.............#',
      '#####.....#####',
    ];
    const room = parseRoom(layout);
    const wing = singleKindWing('table', 6);
    for (const seed of SEEDS) {
      for (const item of planFurniture(room, wing, seed)) {
        for (let c = item.col; c < item.col + 3; c++)
          expect(isSolidTile(room, c, item.row)).toBe(true);
      }
    }
  });
});

describe('planFurniture: todos os modelos de sala, todas as alas', () => {
  it('cumpre todas as regras em todos os modelos, alas e sementes', () => {
    const found: string[] = [];
    let seen = 0;
    for (const template of ROOM_TEMPLATES) {
      const room = parseRoom(template.layout);
      for (const wing of ALL_WINGS) {
        for (const seed of SEEDS) {
          const items = planFurniture(room, wing, seed);
          seen += items.length;
          for (const v of violations(room, wing, items))
            found.push(`${template.id}/${wing.id}: ${v}`);
        }
      }
    }
    expect(found).toEqual([]);
    // Garante que a checagem não passa por vazio: as salas reais recebem mobília.
    expect(seen).toBeGreaterThan(0);
  });

  it('é determinístico em todos os modelos', () => {
    const found: string[] = [];
    for (const template of ROOM_TEMPLATES) {
      const room = parseRoom(template.layout);
      for (const wing of ALL_WINGS) {
        for (const seed of SEEDS) {
          const a = JSON.stringify(planFurniture(room, wing, seed));
          const b = JSON.stringify(planFurniture(room, wing, seed));
          if (a !== b) found.push(`${template.id}/${wing.id}/${seed}`);
        }
      }
    }
    expect(found).toEqual([]);
  }, 30000); // percorre todos os modelos de todas as áreas: cresce a cada área nova

  it('sementes diferentes dão resultados diferentes em pelo menos algumas salas', () => {
    let roomsWithVariety = 0;
    for (const template of ROOM_TEMPLATES) {
      const room = parseRoom(template.layout);
      const distinct = new Set(SEEDS.map((s) => JSON.stringify(planFurniture(room, SALAO, s))));
      if (distinct.size > 1) roomsWithVariety++;
    }
    expect(roomsWithVariety).toBeGreaterThan(0);
  });

  it('as salas reais recebem peças de chão e de teto ao longo das sementes', () => {
    const placements = new Set<string>();
    for (const template of ROOM_TEMPLATES) {
      const room = parseRoom(template.layout);
      for (const seed of SEEDS) {
        for (const item of planFurniture(room, BIBLIOTECA, seed)) {
          placements.add(FURNITURE[item.kind].placement);
        }
        for (const item of planFurniture(room, SALAO, seed)) {
          placements.add(FURNITURE[item.kind].placement);
        }
      }
    }
    expect(placements.has('floor')).toBe(true);
    expect(placements.has('ceiling')).toBe(true);
  });
});
