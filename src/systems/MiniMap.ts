import type Phaser from 'phaser';
import { DEPTH } from '../data/atmosphere';
import { GAME_SIZE } from '../data/balance';
import { RUN_PLAN } from '../data/mapRules';
import { PALETTE } from '../data/palette';
import { MINIMAP } from '../data/ui';
import { minimapLinks, minimapRooms } from '../logic/map/minimapView';
import type { RunState } from '../logic/run';
import { mix } from './pixelCanvas';
import { panelImage } from './hudArt';

/**
 * Minimapa no canto superior direito, dentro de um painel de pedra: salas visitadas cheias e
 * com chanfro, vizinhas conhecidas só no contorno, ligações finas e a sala atual pulsando. Embaixo,
 * três losangos mostram em qual dos biomas a run está. Os elementos são desenhados uma vez (a
 * cena é recriada a cada sala).
 */
export class MiniMap {
  private readonly marker: Phaser.GameObjects.Rectangle;
  private clockMs = 0;

  constructor(scene: Phaser.Scene, run: RunState) {
    const { cellW, cellH, gap, margin, padding, pips } = MINIMAP;
    const map = run.map;
    const visible = minimapRooms(map, run.visited);

    // A grade ocupada pelo bioma decide o tamanho do painel
    let maxGx = 0;
    let maxGy = 0;
    for (const room of map.rooms) {
      maxGx = Math.max(maxGx, room.gx + room.cellsW);
      maxGy = Math.max(maxGy, room.gy + 1);
    }
    const gridWidth = maxGx * (cellW + gap) - gap;
    const gridHeight = maxGy * (cellH + gap) - gap;
    const width = gridWidth + padding * 2;
    const height = gridHeight + padding * 2;
    const left = GAME_SIZE.width - margin - width;
    const top = margin;
    const gridLeft = left + padding;
    const gridTop = top + padding;

    panelImage(scene, left, top, width, height);
    const g = scene.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH.hud + 1);

    const rectOf = (id: number): { x: number; y: number; w: number; h: number } | null => {
      const room = map.rooms.find((r) => r.id === id);
      if (!room) return null;
      return {
        x: gridLeft + room.gx * (cellW + gap),
        y: gridTop + room.gy * (cellH + gap),
        w: room.cellsW * cellW + (room.cellsW - 1) * gap,
        h: cellH,
      };
    };

    // Ligações
    g.fillStyle(PALETTE.stoneLight, 1);
    for (const link of minimapLinks(map, visible)) {
      const a = rectOf(link.from);
      const b = rectOf(link.to);
      if (!a || !b) continue;
      const cx1 = Math.floor(a.x + a.w / 2);
      const cy1 = Math.floor(a.y + a.h / 2);
      const cx2 = Math.floor(b.x + b.w / 2);
      const cy2 = Math.floor(b.y + b.h / 2);
      g.fillRect(
        Math.min(cx1, cx2),
        Math.min(cy1, cy2),
        Math.abs(cx2 - cx1) + 1,
        Math.abs(cy2 - cy1) + 1,
      );
    }

    // Salas
    for (const entry of visible) {
      const r = rectOf(entry.id);
      const room = map.rooms.find((x) => x.id === entry.id);
      if (!r || !room) continue;
      if (entry.state === 'visited') {
        const color = MINIMAP.roomColors[room.kind];
        g.fillStyle(PALETTE.void, 1);
        g.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
        g.fillStyle(color, 1);
        g.fillRect(r.x, r.y, r.w, r.h);
        g.fillStyle(mix(color, 0xffffff, 0.4), 1);
        g.fillRect(r.x, r.y, r.w, 1); // luz em cima
        g.fillStyle(mix(color, 0x000000, 0.4), 1);
        g.fillRect(r.x, r.y + r.h - 1, r.w, 1); // sombra embaixo
      } else {
        g.lineStyle(1, PALETTE.stoneLight, 1);
        g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      }
    }

    // Sala atual: moldura clara que pulsa
    const here = rectOf(run.roomId);
    this.marker = scene.add
      .rectangle(
        (here?.x ?? 0) - 1,
        (here?.y ?? 0) - 1,
        (here?.w ?? cellW) + 2,
        (here?.h ?? cellH) + 2,
      )
      .setStrokeStyle(1, PALETTE.playerAccent)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud + 2);

    // Losangos dos biomas: cheios até o atual, vazios depois
    const total = RUN_PLAN.length;
    const rowWidth = total * pips.size + (total - 1) * pips.gap;
    const pipLeft = left + width - rowWidth;
    const pipTop = top + height + pips.offsetY;
    for (let i = 0; i < total; i++) {
      const x = pipLeft + i * (pips.size + pips.gap);
      const cx = x + Math.floor(pips.size / 2);
      const cy = pipTop + Math.floor(pips.size / 2);
      const reached = i <= run.stage;
      const half = Math.floor(pips.size / 2);
      g.fillStyle(PALETTE.void, 1);
      for (let d = -half - 1; d <= half + 1; d++) {
        const w = half + 1 - Math.abs(d);
        g.fillRect(cx - w, cy + d, w * 2 + 1, 1);
      }
      g.fillStyle(reached ? (i === run.stage ? PALETTE.glow : PALETTE.mist) : PALETTE.stoneDark, 1);
      for (let d = -half; d <= half; d++) {
        const w = half - Math.abs(d);
        g.fillRect(cx - w, cy + d, w * 2 + 1, 1);
      }
    }
  }

  /** Faz a sala atual pulsar (tempo real). */
  update(dtMs: number): void {
    this.clockMs += dtMs;
    this.marker.setAlpha(
      0.45 + 0.55 * (0.5 + 0.5 * Math.sin((this.clockMs / MINIMAP.blinkMs) * Math.PI)),
    );
  }
}
