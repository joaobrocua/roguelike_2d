import Phaser from 'phaser';
import { DEPTH } from '../data/atmosphere';
import { GAME_SIZE } from '../data/balance';
import { PALETTE } from '../data/palette';
import { RELICS, relicIconKey, type RelicId } from '../data/relics';
import { HUD } from '../data/ui';
import { ENV_TEXTURE } from './environmentTextures';
import { ensureKeycap, ensurePanelTexture } from './hudArt';

export interface RelicSlotView {
  relicId: RelicId;
  /** 0 = especial pronto, 1 = recém usado. */
  cooldownFraction: number;
}

interface SlotParts {
  x: number;
  y: number;
  panel: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  icon: Phaser.GameObjects.Image;
  cover: Phaser.GameObjects.Rectangle;
  flash: Phaser.GameObjects.Rectangle;
  key: Phaser.GameObjects.Image;
  relicId: RelicId | null;
  cooling: boolean;
}

const ACTIVE_KEY = 'K';
const SWAP_KEY = 'Q';

/**
 * Duas casas no canto inferior esquerdo com as relíquias carregadas: a ativa tem moldura na cor
 * dela, brilho e a tecla do especial (K); a outra fica apagada e mostra a tecla de troca (Q). A
 * recarga do especial sobe como uma cortina escura e, quando acaba, a casa pisca.
 */
export class RelicHud {
  private readonly slots: SlotParts[] = [];
  private lastActive = -1;

  constructor(private readonly scene: Phaser.Scene) {
    const { slot, gap, left, bottom } = HUD.relics;
    const y = GAME_SIZE.height - bottom - slot;
    for (let i = 0; i < 2; i++) {
      const x = left + i * (slot + gap);
      const centerX = x + slot / 2;
      const centerY = y + slot / 2;
      const panel = scene.add
        .image(x, y, ensurePanelTexture(scene, slot, slot))
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud);
      const glow = scene.add
        .image(centerX, centerY, ENV_TEXTURE.glow)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScrollFactor(0)
        .setScale(slot / 40)
        .setAlpha(0)
        .setDepth(DEPTH.hud - 0.5);
      const icon = scene.add
        .image(centerX, centerY, relicIconKey('lamina'))
        .setScrollFactor(0)
        .setDepth(DEPTH.hud + 1);
      // A cortina de recarga cresce de baixo para cima, dentro da moldura
      const cover = scene.add
        .rectangle(x + 2, y + slot - 2, slot - 4, slot - 4, PALETTE.void, HUD.relics.coverAlpha)
        .setOrigin(0, 1)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud + 2)
        .setVisible(false);
      const flash = scene.add
        .rectangle(x + 2, y + 2, slot - 4, slot - 4, 0xffffff, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud + 3)
        .setAlpha(0);
      const keySize = HUD.keycap.size;
      const keyX = x + slot - keySize + 2;
      const keyY = y + slot - keySize + 2;
      const key = scene.add
        .image(keyX, keyY, ensureKeycap(scene, i === 0 ? ACTIVE_KEY : SWAP_KEY))
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud + 4);
      this.slots.push({
        x,
        y,
        panel,
        glow,
        icon,
        cover,
        flash,
        key,
        relicId: null,
        cooling: false,
      });
    }
  }

  /** active: índice do slot ativo (0|1). Só atualiza propriedades dos objetos já criados. */
  update(active: 0 | 1, slots: readonly [RelicSlotView, RelicSlotView]): void {
    const activeChanged = active !== this.lastActive;
    this.lastActive = active;
    const { slot, inactiveAlpha, readyFlashMs } = HUD.relics;
    const pulse = 0.5 + 0.5 * Math.sin(this.scene.time.now / 420);

    for (let i = 0; i < 2; i++) {
      const view = slots[i];
      const parts = this.slots[i];
      if (!view || !parts) continue;
      const isActive = i === active;
      const def = RELICS[view.relicId];

      if (parts.relicId !== view.relicId || activeChanged) {
        parts.relicId = view.relicId;
        parts.icon.setTexture(relicIconKey(view.relicId));
        // Ativa: moldura na cor da relíquia; a outra, moldura neutra e apagada
        parts.panel.setTexture(
          isActive
            ? ensurePanelTexture(this.scene, slot, slot, def.color)
            : ensurePanelTexture(this.scene, slot, slot),
        );
        const alpha = isActive ? 1 : inactiveAlpha;
        parts.panel.setAlpha(alpha);
        parts.icon.setAlpha(alpha);
        parts.key.setAlpha(alpha);
        parts.key.setTexture(ensureKeycap(this.scene, isActive ? ACTIVE_KEY : SWAP_KEY));
        parts.glow.setTint(def.color);
      }
      parts.glow.setAlpha(isActive ? 0.1 + 0.08 * pulse : 0);

      const fraction = Phaser.Math.Clamp(view.cooldownFraction, 0, 1);
      if (fraction > 0) {
        parts.cover.setVisible(true).setDisplaySize(slot - 4, (slot - 4) * fraction);
        parts.cooling = true;
      } else {
        parts.cover.setVisible(false);
        if (parts.cooling) {
          // O especial voltou: um clarão rápido na casa
          parts.cooling = false;
          parts.flash.setAlpha(0.8);
          this.scene.tweens.add({ targets: parts.flash, alpha: 0, duration: readyFlashMs });
        }
      }
    }
  }
}
