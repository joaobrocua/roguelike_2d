import Phaser from 'phaser';
import { FONT } from '../data/ui';
import { createEnvironmentTextures } from '../systems/environmentTextures';
import { createEnemyAnimations, createEnemySheets } from '../systems/enemySprites';
import { createHeroAnimations, createHeroSheet } from '../systems/heroSprites';
import { createPixelFont } from '../systems/pixelFont';
import { createPropSheet } from '../systems/propTextures';
import { createRelicIcons } from '../systems/relicIcons';
import { createUiTextures } from '../systems/uiArt';
import { createPlaceholderTextures } from '../systems/textures';

/** Prepara os recursos do jogo. Aqui entrarão os assets reais no futuro. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    createEnemySheets(this); // antes dos placeholders: a textura do inimigo já existe
    createEnemyAnimations(this);
    createPlaceholderTextures(this);
    createEnvironmentTextures(this);
    createRelicIcons(this);
    createUiTextures(this);
    createHeroSheet(this);
    createHeroAnimations(this);
    createPropSheet(this);
    // Os textos só podem ser criados depois que a fonte pixel terminar de carregar;
    // se falhar, o jogo segue com a fonte de reserva (monospace).
    const start = (): void => {
      createPixelFont(this); // os glifos só podem ser desenhados com a fonte já carregada
      this.scene.start('Game', {}); // dados vazios: começa uma run nova (ver GameScene.init)
    };
    document.fonts.load(FONT.loadSpec).then(start, start);
  }
}
