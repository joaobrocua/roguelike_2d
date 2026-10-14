import Phaser from 'phaser';
import { ATMOSPHERE, DEPTH } from '../data/atmosphere';
import { GAME_SIZE } from '../data/balance';
import { BIOME_LOOK } from '../data/biomeLook';
import { PALETTE } from '../data/palette';
import { TEXT_COLORS, TITLE_SCREEN as T } from '../data/ui';
import { getAudio, sfx } from '../systems/AudioSystem';
import { backgroundKey, ENV_TEXTURE } from '../systems/environmentTextures';
import { getMetaStore } from '../systems/metaStore';
import { MenuInput } from '../systems/MenuInput';
import { MenuList, type MenuRow } from '../systems/MenuList';
import { ControlsPanel, soundRows } from '../systems/menuRows';
import { pixelText } from '../systems/pixelFont';
import { ensureSanctuaryTextures, SANCTUARY_TEXTURE } from '../systems/sanctuaryArt';
import { TEXTURE } from '../systems/textures';
import { UI_TEXTURE } from '../systems/uiArt';

type Page = 'main' | 'options' | 'controls' | 'confirmReset';

/** Posição de cada linha do menu principal (para devolver o foco ao voltar de uma página). */
const MAIN = { play: 0, options: 1, controls: 2, reset: 3 } as const;
/** Na confirmação de zerar, as linhas são [SIM, NÃO]: o foco começa no NÃO. */
const RESET_NO = 1;

/**
 * Tela de título: o anjo caído ao fundo, o nome do jogo, o menu (jogar, opções, controles e
 * zerar o progresso) e um resumo do que já foi conquistado. Toda a tela é um estado só:
 * `page` decide quais linhas o menu mostra.
 */
export class TitleScene extends Phaser.Scene {
  private input2!: MenuInput;
  private menu!: MenuList;
  private page: Page = 'main';
  private controls: ControlsPanel | null = null;
  private statsText!: Phaser.GameObjects.BitmapText;
  private notice!: Phaser.GameObjects.BitmapText;
  private questionTexts: Phaser.GameObjects.BitmapText[] = [];
  private fog!: Phaser.GameObjects.TileSprite;
  private lockMs = 0;
  private starting = false;

  constructor() {
    super('Title');
  }

  create(): void {
    this.page = 'main';
    this.controls = null;
    this.questionTexts = [];
    this.lockMs = T.inputLockMs;
    this.starting = false;
    this.input2 = new MenuInput(this);
    getAudio().playMusic('title');

    this.buildBackdrop();
    this.buildTitle();
    this.menu = new MenuList(this, {
      x: GAME_SIZE.width / 2,
      y: T.layout.menuY,
      step: T.layout.menuStep,
    });
    this.notice = pixelText(
      this,
      GAME_SIZE.width / 2,
      T.layout.menuY + T.layout.menuStep * T.layout.noticeRow,
      '',
      {
        color: PALETTE.soul,
        originX: 0.5,
        originY: 0.5,
      },
    );
    this.statsText = pixelText(this, GAME_SIZE.width / 2, T.layout.statsY, '', {
      color: TEXT_COLORS.dim,
      originX: 0.5,
      originY: 0.5,
    });
    pixelText(this, GAME_SIZE.width - 6, GAME_SIZE.height - 6, T.version, {
      color: TEXT_COLORS.dim,
      originX: 1,
      originY: 1,
    });
    pixelText(this, 6, GAME_SIZE.height - 6, T.hint, {
      color: TEXT_COLORS.dim,
      originX: 0,
      originY: 1,
    }).setAlpha(0.7);
    this.showPage('main');
    this.cameras.main.fadeIn(T.fadeInMs, 0, 0, 0);
  }

  // --- Montagem -----------------------------------------------------------------------------

  private buildBackdrop(): void {
    const { width, height } = GAME_SIZE;
    const look = BIOME_LOOK.muralhas;
    for (const [layer, depth] of [
      ['far', DEPTH.bgFar],
      ['mid', DEPTH.bgMid],
      ['near', DEPTH.bgNear],
    ] as const) {
      this.add.image(width / 2, height / 2, backgroundKey('muralhas', layer)).setDepth(depth);
    }
    // O anjo colossal do santuário, escuro, atrás do título
    ensureSanctuaryTextures(this, 'muralhas');
    this.add
      .image(width / 2, height / 2 + 6, SANCTUARY_TEXTURE.colossus('muralhas'))
      .setTint(T.fx.angelTint)
      .setAlpha(T.fx.angelAlpha)
      .setDepth(DEPTH.bgNear + 1);
    this.fog = this.add
      .tileSprite(0, ATMOSPHERE.fog.back.y, width, ATMOSPHERE.fog.back.height, ENV_TEXTURE.fog)
      .setOrigin(0, 0)
      .setTint(look.fog)
      .setAlpha(ATMOSPHERE.fog.back.alpha)
      .setDepth(DEPTH.fogBack);
    this.add
      .rectangle(0, 0, width, height, PALETTE.void, T.fx.shadeAlpha)
      .setOrigin(0, 0)
      .setDepth(DEPTH.darkness);
    this.add
      .particles(0, 0, TEXTURE.spark, {
        frequency: T.fx.emberFrequencyMs,
        lifespan: T.fx.embers.lifespanMs,
        speedY: T.fx.embers.speedY,
        speedX: { min: -T.fx.embers.speedX, max: T.fx.embers.speedX },
        scale: { start: T.fx.embers.startScale, end: 0 },
        alpha: { start: T.fx.embers.alpha, end: 0 },
        tint: [PALETTE.glow, PALETTE.ember],
        emitZone: {
          type: 'random',
          source: new Phaser.Geom.Rectangle(0, height - 20, width, 12),
        } as Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig,
      })
      .setDepth(DEPTH.warmGlow);
    this.add.image(0, 0, ENV_TEXTURE.vignette).setOrigin(0, 0).setDepth(DEPTH.vignette);
  }

  private buildTitle(): void {
    const cx = GAME_SIZE.width / 2;
    const { titleY, lineGap, titleSize, taglineY } = T.layout;
    T.name.forEach((line, i) => {
      pixelText(this, cx, titleY + i * lineGap, line, {
        size: titleSize,
        color: i === 0 ? TEXT_COLORS.normal : PALETTE.glow,
        originX: 0.5,
        originY: 0.5,
        depth: DEPTH.hud,
      });
    });
    this.add
      .image(cx, titleY - 24, UI_TEXTURE.divider)
      .setTint(PALETTE.glow)
      .setDepth(DEPTH.hud);
    this.add
      .image(cx, titleY + lineGap + 24, UI_TEXTURE.divider)
      .setTint(PALETTE.glow)
      .setDepth(DEPTH.hud);
    pixelText(this, cx, taglineY, T.tagline, {
      color: TEXT_COLORS.dim,
      originX: 0.5,
      originY: 0.5,
      depth: DEPTH.hud,
    });
  }

  // --- Páginas ------------------------------------------------------------------------------

  private showPage(page: Page, focus = 0): void {
    this.page = page;
    this.controls?.destroy();
    this.controls = null;
    for (const text of this.questionTexts) text.destroy();
    this.questionTexts = [];
    const audio = getAudio();
    let rows: MenuRow[] = [];
    switch (page) {
      case 'main':
        rows = [
          { label: T.menu.play, onActivate: () => this.play() },
          { label: T.menu.options, onActivate: () => this.showPage('options') },
          { label: T.menu.controls, onActivate: () => this.showPage('controls') },
          {
            label: T.menu.reset,
            color: TEXT_COLORS.dim,
            onActivate: () => this.showPage('confirmReset', RESET_NO),
          },
        ];
        break;
      case 'options':
        rows = [
          ...soundRows(audio),
          { label: T.back, onActivate: () => this.showPage('main', MAIN.options) },
        ];
        break;
      case 'controls':
        this.controls = new ControlsPanel(this, DEPTH.hud);
        rows = [];
        break;
      case 'confirmReset':
        this.questionTexts.push(
          pixelText(
            this,
            GAME_SIZE.width / 2,
            T.layout.menuY + T.layout.confirmDy.question,
            T.reset.question,
            {
              color: TEXT_COLORS.danger,
              originX: 0.5,
              originY: 0.5,
            },
          ),
          pixelText(
            this,
            GAME_SIZE.width / 2,
            T.layout.menuY + T.layout.confirmDy.warning,
            T.reset.warning,
            {
              color: TEXT_COLORS.dim,
              originX: 0.5,
              originY: 0.5,
            },
          ),
        );
        rows = [
          { label: T.reset.yes, color: TEXT_COLORS.danger, onActivate: () => this.resetProgress() },
          { label: T.reset.no, onActivate: () => this.showPage('main', MAIN.reset) },
        ];
        break;
    }
    this.menu.setRows(rows, focus);
    this.refreshStats();
    this.statsText.setVisible(page !== 'controls');
  }

  private refreshStats(): void {
    const { save } = getMetaStore();
    this.statsText.setText(
      `${T.stats.souls} ${save.souls}   ${T.stats.runs} ${save.stats.runs}   ${T.stats.victories} ${save.stats.victories}`,
    );
  }

  private play(): void {
    if (this.starting) return;
    this.starting = true;
    sfx('portal');
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      // Dados vazios: começa uma run nova (ver GameScene.init)
      this.scene.start('Game', {});
    });
    this.cameras.main.fadeOut(T.fx.fadeOutMs, 0, 0, 0);
  }

  private resetProgress(): void {
    const cleared = getMetaStore().reset();
    this.showPage('main', MAIN.reset);
    this.notice.setText(cleared ? T.reset.done : T.reset.failed);
    this.notice.setTint(cleared ? PALETTE.soul : PALETTE.blood);
    this.tweens.killTweensOf(this.notice);
    this.notice.setAlpha(1);
    this.tweens.add({
      targets: this.notice,
      alpha: 0,
      delay: T.fx.noticeHoldMs,
      duration: T.fx.noticeFadeMs,
    });
    sfx(cleared ? 'death' : 'uiDenied');
  }

  update(_time: number, delta: number): void {
    this.fog.tilePositionX += ATMOSPHERE.fog.back.speed * (delta / 1000);
    this.lockMs -= delta;
    this.input2.update();
    if (this.lockMs > 0 || this.starting) return;
    if (this.input2.pressed.cancel && this.page !== 'main') {
      sfx('uiBack');
      this.showPage(
        'main',
        this.page === 'options'
          ? MAIN.options
          : this.page === 'controls'
            ? MAIN.controls
            : MAIN.reset,
      );
      return;
    }
    if (this.page === 'controls') {
      if (this.input2.pressed.confirm) {
        sfx('uiBack');
        this.showPage('main', MAIN.controls);
      }
      return;
    }
    this.menu.handle(this.input2);
  }
}
