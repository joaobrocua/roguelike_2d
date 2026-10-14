import type Phaser from 'phaser';
import { PALETTE } from '../data/palette';
import { TEXT_COLORS } from '../data/ui';
import { sfx } from './AudioSystem';
import type { MenuInput } from './MenuInput';
import { pixelText } from './pixelFont';

/** Uma linha do menu: um texto e o que acontece ao confirmar ou ao apertar esquerda e direita. */
export interface MenuRow {
  label: string;
  /** Valor mostrado à direita do rótulo (volume, ligado/desligado...). Reavaliado a cada mudança. */
  value?: () => string;
  /** Confirmar (J, Espaço, Enter ou A). */
  onActivate?: () => void;
  /** Esquerda (-1) e direita (1): ajusta o valor da linha. */
  onAdjust?: (direction: 1 | -1) => void;
  /** Cor do rótulo quando a linha não está em foco (padrão: texto normal). */
  color?: number;
}

export interface MenuLayout {
  /** Centro horizontal e topo da primeira linha (px). */
  x: number;
  y: number;
  /** Distância entre as linhas. */
  step: number;
}

/**
 * Menu vertical de linhas centralizadas, para a tela de título e a pausa. A linha em foco ganha
 * cor de destaque e setas; as com valor mostram `< valor >` quando em foco. As linhas são
 * recriadas quando muda a lista (nunca no update).
 */
export class MenuList {
  private rows: MenuRow[] = [];
  private focus = 0;
  private texts: Phaser.GameObjects.BitmapText[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private layout: MenuLayout,
  ) {}

  /** Muda a altura da primeira linha (a confirmação abre espaço para a pergunta acima). */
  setTop(y: number): void {
    this.layout = { ...this.layout, y };
  }

  /** Troca as linhas do menu (mantém o foco se couber). */
  setRows(rows: MenuRow[], focus = 0): void {
    for (const text of this.texts) text.destroy();
    this.rows = rows;
    this.focus = Math.min(Math.max(0, focus), Math.max(0, rows.length - 1));
    const { x, y, step } = this.layout;
    this.texts = rows.map((_, i) =>
      pixelText(this.scene, x, y + i * step, '', {
        color: TEXT_COLORS.normal,
        originX: 0.5,
        originY: 0.5,
      }),
    );
    this.refresh();
  }

  get focusIndex(): number {
    return this.focus;
  }

  /** Lê os botões deste frame e age. Devolve true se algo mudou. */
  handle(input: MenuInput): boolean {
    const p = input.pressed;
    const row = this.rows[this.focus];
    if (!row) return false;
    if (p.up || p.down) {
      const count = this.rows.length;
      this.focus = (this.focus + (p.down ? 1 : -1) + count) % count;
      sfx('uiMove');
      this.refresh();
      return true;
    }
    if ((p.left || p.right) && row.onAdjust) {
      row.onAdjust(p.right ? 1 : -1);
      sfx('uiMove');
      this.refresh();
      return true;
    }
    if (p.confirm && row.onActivate) {
      sfx('uiConfirm');
      row.onActivate();
      return true;
    }
    return false;
  }

  /** Reescreve os textos (foco, valores). Chamar depois de mudar algo que as linhas mostram. */
  refresh(): void {
    this.rows.forEach((row, i) => {
      const text = this.texts[i];
      if (!text) return;
      const focused = i === this.focus;
      const value = row.value ? row.value() : '';
      let line = row.label;
      if (value) line += focused && row.onAdjust ? `  < ${value} >` : `  ${value}`;
      // Linhas com valor já mostram setas em volta do valor; as outras ganham setas em volta do rótulo
      const arrows = focused && row.onAdjust && value ? `> ${line}` : `> ${line} <`;
      text.setText(focused ? arrows : line);
      text.setTint(focused ? PALETTE.glow : (row.color ?? TEXT_COLORS.normal));
    });
  }
}
