import Phaser from 'phaser';
import { ATMOSPHERE, DEPTH } from '../data/atmosphere';
import { GAME_SIZE } from '../data/balance';
import { BIOME_LOOK } from '../data/biomeLook';
import { HERO_SHEET_KEY } from '../data/hero';
import type { BiomeId } from '../data/mapRules';
import { PALETTE } from '../data/palette';
import { INTRO_CARDS, STORY, type StoryArt } from '../data/story';
import { TEXT_COLORS } from '../data/ui';
import { typingDuration, visibleChars } from '../logic/typewriter';
import { getAudio, sfx } from '../systems/AudioSystem';
import { backgroundKey, ENV_TEXTURE } from '../systems/environmentTextures';
import { MenuInput } from '../systems/MenuInput';
import { pixelText } from '../systems/pixelFont';
import {
  ensureGateTextures,
  ensureSanctuaryTextures,
  SANCTUARY_TEXTURE,
} from '../systems/sanctuaryArt';
import { markIntroSeen } from '../systems/storyStore';
import { pulse, UI_TEXTURE } from '../systems/uiArt';

export interface IntroData {
  /** O que abre depois da abertura: a descida ou a volta ao título (quando veio do menu). */
  next?: 'Game' | 'Title';
}

/** A tela dos cartões: a imagem enche a tela e o texto "digitado" fica numa faixa embaixo. */
export class IntroScene extends Phaser.Scene {
  private input2!: MenuInput;
  private next: 'Game' | 'Title' = 'Game';
  private index = 0;
  private art: Phaser.GameObjects.Container | null = null;
  private label!: Phaser.GameObjects.BitmapText;
  private pips: Phaser.GameObjects.Rectangle[] = [];
  private prompt!: Phaser.GameObjects.BitmapText;
  private wrapped = '';
  private typedMs = 0;
  private changing = false;
  private finished = false;
  private lockMs: number = STORY.inputLockMs;

  constructor() {
    super('Intro');
  }

  create(data: IntroData): void {
    this.next = data?.next ?? 'Game';
    this.index = 0;
    this.art = null;
    this.pips = [];
    this.changing = false;
    this.finished = false;
    this.lockMs = STORY.inputLockMs;
    this.typedMs = 0;
    this.input2 = new MenuInput(this);
    getAudio().playMusic('title');

    const { width, height } = GAME_SIZE;
    // Faixa escura do texto, com um filete dourado em cima
    this.add
      .rectangle(
        0,
        STORY.panel.top,
        width,
        height - STORY.panel.top,
        PALETTE.void,
        STORY.panel.alpha,
      )
      .setOrigin(0, 0)
      .setDepth(DEPTH.hud);
    this.add
      .image(width / 2, STORY.panel.top, UI_TEXTURE.divider)
      .setTint(PALETTE.glow)
      .setDepth(DEPTH.hud + 1);
    this.label = pixelText(this, STORY.panel.textX, STORY.panel.textY, '', {
      color: TEXT_COLORS.normal,
      depth: DEPTH.hud + 1,
    });
    // Um pontinho por cartão, para saber quanto falta
    const gap = 9;
    const start = width / 2 - ((INTRO_CARDS.length - 1) * gap) / 2;
    INTRO_CARDS.forEach((_, i) => {
      this.pips.push(
        this.add
          .rectangle(start + i * gap, height - 9, 5, 3, PALETTE.glow)
          .setAlpha(0.3)
          .setDepth(DEPTH.hud + 1),
      );
    });
    const touch = Boolean(this.game.registry.get('touch'));
    this.prompt = pixelText(this, width - 8, height - 9, touch ? STORY.promptTouch : STORY.prompt, {
      color: TEXT_COLORS.dim,
      originX: 1,
      originY: 0.5,
      depth: DEPTH.hud + 1,
    }).setVisible(false);
    pulse(this, this.prompt);
    this.input.on('pointerdown', () => this.advance());

    this.cameras.main.fadeIn(STORY.fadeMs, 0, 0, 0);
    this.showCard(0);
  }

  // --- Cartões ------------------------------------------------------------------------------

  private showCard(index: number): void {
    const card = INTRO_CARDS[index];
    if (!card) return;
    this.index = index;
    this.typedMs = 0;
    this.prompt.setVisible(false);
    this.pips.forEach((pip, i) => pip.setAlpha(i === index ? 1 : 0.3));
    // Quebra o texto em linhas de antemão: assim as palavras não pulam de linha enquanto aparecem
    const probe = pixelText(this, 0, 0, card.text, { maxWidth: STORY.panel.textWidth }).setAlpha(0);
    this.wrapped = probe.getTextBounds().wrappedText;
    probe.destroy();
    this.label.setText('');

    this.art?.destroy();
    this.art = this.buildArt(card.art);
    this.art.setAlpha(0);
    this.tweens.add({ targets: this.art, alpha: 1, duration: STORY.fadeMs });
    this.tweens.add({
      targets: this.art,
      scale: STORY.zoom.to,
      duration: STORY.zoom.ms,
      ease: 'Sine.easeOut',
    });
  }

  /** O texto já está inteiro na tela? */
  private get typed(): boolean {
    return this.typedMs >= typingDuration(this.wrapped.length, STORY.charsPerSecond);
  }

  /** Confirmar: termina de digitar o texto; com o texto inteiro, passa ao próximo cartão. */
  private advance(): void {
    if (this.lockMs > 0 || this.changing || this.finished) return;
    if (!this.typed) {
      this.typedMs = typingDuration(this.wrapped.length, STORY.charsPerSecond);
      return;
    }
    sfx('uiMove');
    if (this.index + 1 >= INTRO_CARDS.length) {
      this.finish();
      return;
    }
    this.changing = true;
    this.tweens.add({
      targets: this.art,
      alpha: 0,
      duration: STORY.fadeMs,
      onComplete: () => {
        this.showCard(this.index + 1);
        this.changing = false;
      },
    });
    this.label.setText('');
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    markIntroSeen();
    sfx('passage');
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (this.next === 'Game') this.scene.start('Game', {});
      else this.scene.start('Title');
    });
    this.cameras.main.fadeOut(STORY.fadeMs + 120, 0, 0, 0);
  }

  // --- Ilustrações: a arte do jogo montada em cada cena -------------------------------------

  private buildArt(kind: StoryArt): Phaser.GameObjects.Container {
    const { width, height } = GAME_SIZE;
    const cx = width / 2;
    const cy = STORY.panel.top / 2;
    const container = this.add.container(cx, cy).setDepth(DEPTH.bgFar);
    // Cada peça é posicionada em relação ao centro da área de imagem (acima da faixa do texto)
    const put = <T extends Phaser.GameObjects.GameObject>(object: T): T => {
      container.add(object);
      return object;
    };
    const backdrop = (biome: BiomeId, layers: readonly ('far' | 'mid' | 'near')[]): void => {
      for (const layer of layers) {
        put(this.add.image(0, height / 2 - cy, backgroundKey(biome, layer)));
      }
    };
    const fog = (biome: BiomeId): void => {
      put(
        this.add
          .tileSprite(-width, 50, width * 2, ATMOSPHERE.fog.back.height, ENV_TEXTURE.fog)
          .setOrigin(0, 0)
          .setTint(BIOME_LOOK[biome].fog)
          .setAlpha(ATMOSPHERE.fog.back.alpha),
      );
    };
    const heroAt = (x: number, y: number, scale: number, frame: string): void => {
      put(this.add.image(x, y, HERO_SHEET_KEY, frame).setScale(scale).setTint(0xb8c4e8));
    };

    switch (kind) {
      case 'castle':
        backdrop('muralhas', ['far', 'mid']);
        fog('muralhas');
        break;
      case 'outlands':
        backdrop('vila', ['far', 'mid']);
        fog('vila');
        break;
      case 'guardian': {
        backdrop('catacumbas', ['far', 'mid']);
        fog('catacumbas');
        put(
          this.add
            .image(0, 30, ENV_TEXTURE.glow)
            .setTint(PALETTE.ember)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(3.2)
            .setAlpha(0.35),
        );
        put(this.add.image(0, 36, 'guardiao', 'idle0').setScale(3).setTint(0x9aa6c8));
        break;
      }
      case 'watcher': {
        ensureSanctuaryTextures(this, 'muralhas');
        backdrop('muralhas', ['far']);
        put(
          this.add
            .image(0, 12, SANCTUARY_TEXTURE.colossus('muralhas'))
            .setTint(0x8f9bc8)
            .setAlpha(0.8),
        );
        fog('muralhas');
        heroAt(0, 66, 3, 'idle-0');
        break;
      }
      case 'descent': {
        ensureGateTextures(this, 'muralhas', 'floresta');
        backdrop('muralhas', ['far']);
        put(this.add.image(0, 14, SANCTUARY_TEXTURE.view('floresta')).setScale(1.5));
        put(this.add.image(0, 14, SANCTUARY_TEXTURE.gate('muralhas')).setScale(1.5));
        heroAt(-46, 76, 3, 'run-1');
        break;
      }
    }
    // Escurece a imagem toda (a arte do jogo é clara demais para ficar atrás de texto)
    put(
      this.add
        .rectangle(0, 0, width * 2, height * 2, PALETTE.void, STORY.artShade)
        .setOrigin(0.5, 0.5),
    );
    return container;
  }

  update(_time: number, delta: number): void {
    this.input2.update();
    this.lockMs -= delta;
    if (this.finished) return;
    if (this.input2.pressed.cancel && this.lockMs <= 0) {
      this.finish();
      return;
    }
    if (this.input2.pressed.confirm) this.advance();
    if (this.changing) return;

    this.typedMs += delta;
    const shown = visibleChars(this.typedMs, STORY.charsPerSecond, this.wrapped.length);
    this.label.setText(this.wrapped.slice(0, shown));
    if (this.typed && !this.prompt.visible) this.prompt.setVisible(true);
  }
}
