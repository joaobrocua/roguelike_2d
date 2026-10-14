import Phaser from 'phaser';
import { GAME_SIZE } from '../data/balance';
import { CONTROLS_HELP, TEXT_COLORS, TITLE_SCREEN } from '../data/ui';
import { PALETTE } from '../data/palette';
import type { AudioSystem } from './AudioSystem';
import { ensurePanelTexture } from './hudArt';
import type { MenuRow } from './MenuList';
import { pixelText } from './pixelFont';

const T = TITLE_SCREEN;

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** As três linhas de som (música, efeitos e liga/mudo), iguais no título e na pausa. */
export function soundRows(audio: AudioSystem): MenuRow[] {
  return [
    {
      label: T.sound.music,
      value: () => percent(audio.settings.music),
      onAdjust: (direction) => audio.adjustVolume('music', direction),
    },
    {
      label: T.sound.sfx,
      value: () => percent(audio.settings.sfx),
      onAdjust: (direction) => audio.adjustVolume('sfx', direction),
    },
    {
      label: T.sound.mute,
      value: () => (audio.settings.muted ? T.sound.off : T.sound.on),
      onAdjust: () => audio.toggleMuted(),
      onActivate: () => audio.toggleMuted(),
    },
  ];
}

/** O quadro com todas as teclas e botões do jogo (título e pausa). */
export class ControlsPanel {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, depth = 0) {
    const { controls, panel } = T.layout;
    const x = (GAME_SIZE.width - panel.width) / 2;
    this.objects.push(
      scene.add
        .image(x, panel.y, ensurePanelTexture(scene, panel.width, panel.height, PALETTE.glow))
        .setOrigin(0, 0)
        .setDepth(depth),
    );
    CONTROLS_HELP.forEach(([label, keys], i) => {
      const y = controls.y + i * controls.step;
      this.objects.push(
        pixelText(scene, controls.x, y, label, { color: TEXT_COLORS.dim, depth: depth + 1 }),
        pixelText(scene, controls.valueX, y, keys, {
          color: TEXT_COLORS.normal,
          depth: depth + 1,
        }),
      );
    });
  }

  destroy(): void {
    for (const object of this.objects) object.destroy();
    this.objects.length = 0;
  }
}
