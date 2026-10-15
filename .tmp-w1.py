def edit(path, pairs):
    s = open(path, encoding="utf-8").read()
    for old, new in pairs:
        assert old in s, (path, old[:90])
        s = s.replace(old, new, 1)
    open(path, "w", encoding="utf-8").write(s)

edit("src/logic/run.ts", [
("import { BIOME_CONFIG, RUN_PLAN, type BiomeId, type RunStage } from '../data/mapRules';", "import { BIOME_CONFIG, RUN_PLAN, type BiomeId, type RunStage } from '../data/mapRules';\nimport type { WingId } from '../data/wings';"),
("  /** As áreas já visitadas, uma por etapa (a última é a atual). */\n  route: BiomeId[];", "  /** As áreas já visitadas, uma por etapa (a última é a atual). */\n  route: BiomeId[];\n  /** A ala em que o herói está agora (para avisar quando ele muda de ambiente); null ao chegar numa área. */\n  wingId: WingId | null;"),
("    route: [biome],\n    map,", "    route: [biome],\n    wingId: null,\n    map,"),
("  run.route.push(biome);\n", "  run.route.push(biome);\n  run.wingId = null;\n"),
])

edit("src/data/ui.ts", [
("  /** Rótulo em cima do nome SANTUÁRIO", "  /** O nome da ala ao entrar nela (mais discreto que o da área): altura e tempos. */\n  wing: { y: 44, fadeMs: 450, holdMs: 1500, dividerDy: 9 },\n  /** Rótulo em cima do nome SANTUÁRIO"),
])

edit("src/systems/BiomeBanner.ts", [
("export function showBiomeBanner(", """/**
 * O nome da ala ao entrar nela (BIBLIOTECA, CAPELA...): uma linha discreta com um divisor, que
 * aparece e some sozinha. Não repete o aviso grande da área.
 */
export function showWingCaption(scene: Phaser.Scene, name: string): void {
  const cx = GAME_SIZE.width / 2;
  const label = pixelText(scene, cx, BANNER.wing.y, name, {
    color: TEXT_COLORS.normal,
    originX: 0.5,
    originY: 0.5,
    fixed: true,
  });
  const divider = scene.add
    .image(cx, BANNER.wing.y + BANNER.wing.dividerDy, UI_TEXTURE.divider)
    .setTint(PALETTE.glow)
    .setScrollFactor(0);
  const caption = scene.add
    .container(0, 0, [label, divider])
    .setScrollFactor(0)
    .setDepth(DEPTH.hud)
    .setAlpha(0);
  scene.tweens.add({
    targets: caption,
    alpha: 1,
    duration: BANNER.wing.fadeMs,
    hold: BANNER.wing.holdMs,
    yoyo: true,
    onComplete: () => caption.destroy(),
  });
}

export function showBiomeBanner("""),
])

edit("src/scenes/GameScene.ts", [
("import { planDecor } from '../logic/decor';", "import { planDecor, type DecorAvoid } from '../logic/decor';\nimport { footprintOf, planFurniture } from '../logic/furniture';\nimport { wingForRoom } from '../logic/wings';"),
("import { showBiomeBanner } from '../systems/BiomeBanner';", "import { showBiomeBanner, showWingCaption } from '../systems/BiomeBanner';\nimport { FurnitureSystem } from '../systems/FurnitureSystem';"),
("  private sanctuaryDecor: SanctuaryDecor | null = null;", "  private sanctuaryDecor: SanctuaryDecor | null = null;\n  /** A mobília da ala desta sala (null na sala do santuário). */\n  private furniture: FurnitureSystem | null = null;"),
("    this.sanctuaryDecor = null;\n    this.sanctuaryGates = [];", "    this.sanctuaryDecor = null;\n    this.furniture = null;\n    this.sanctuaryGates = [];"),
("    if (run.sanctuary) this.sanctuaryDecor = new SanctuaryDecor(this, this.lookBiome);\n    else this.spawnDecor(room);", "    if (run.sanctuary) this.sanctuaryDecor = new SanctuaryDecor(this, this.lookBiome);\n    else this.spawnDecor(room, this.spawnFurniture(room));"),
("[this.enemies, this.props, this.sanctuaryLights()],", "[this.enemies, this.props, this.sanctuaryLights(), this.furniture?.lights ?? []],"),
("  private spawnDecor(room: ParsedRoom): void {\n    const run = this.run;\n    const seed =\n      (Math.imul(run.seed | 0, 2654435761) + run.roomId * 977 + run.stage * 131) >>> 0;\n    for (const item of planDecor(room, seed)) {", "  private spawnDecor(room: ParsedRoom, avoid: readonly DecorAvoid[]): void {\n    const run = this.run;\n    const seed = this.roomSeed();\n    for (const item of planDecor(room, seed, avoid)) {"),
("  /**\n   * Decoração do cenário (tufos,", """  /** Semente da sala: a mesma sala de uma run sempre fica igual. */
  private roomSeed(): number {
    const run = this.run;
    return (Math.imul(run.seed | 0, 2654435761) + run.roomId * 977 + run.stage * 131) >>> 0;
  }

  /**
   * Mobília da ala em que a sala fica (as salas do mapa se agrupam em alas, da esquerda para a
   * direita). Devolve as áreas ocupadas, para a decoração miúda não nascer por cima. Ao mudar de
   * ala, o nome dela aparece.
   */
  private spawnFurniture(room: ParsedRoom): DecorAvoid[] {
    const placed = this.placed;
    if (!placed) return [];
    const run = this.run;
    const areaSeed = (Math.imul(run.seed | 0, 2654435761) + run.stage * 131) >>> 0;
    const wing = wingForRoom(this.lookBiome, placed, areaSeed);
    // A primeira sala da área já mostra o nome da área; as seguintes avisam quando a ala muda
    if (run.wingId !== null && run.wingId !== wing.id) showWingCaption(this, wing.name);
    run.wingId = wing.id;
    const items = planFurniture(room, wing, (this.roomSeed() ^ 0x5bd1e995) >>> 0);
    this.furniture = new FurnitureSystem(this, items, this.lookBiome);
    return items.map(footprintOf);
  }

  /**
   * Decoração do cenário (tufos,"""),
])
