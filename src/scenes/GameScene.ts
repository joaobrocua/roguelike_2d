import Phaser from 'phaser';
import { PLAYER } from '../data/balance';
import {
  DEATH_SCREEN_DELAY_MS,
  PERFECT_DODGE,
  PLAYER_COMBAT,
  PROJECTILE_POOL,
} from '../data/combat';
import {
  ARQUEIRO_OCO,
  CAO_DE_OSSOS,
  CARNICAL,
  DOG_PACK,
  ENEMY_MARKERS,
  type EnemyType,
} from '../data/enemies';
import { BIOME_DARKNESS, DECOR_MARKERS, TILE_VARIANTS } from '../data/atmosphere';
import { BIOME_NAMES } from '../data/mapRules';
import { PALETTE } from '../data/palette';
import { RELIC_DROP, RELIC_IDS, type RelicId } from '../data/relics';
import { PROP_MARKERS, ROOM_TRANSITION, TILE_SIZE } from '../data/rooms';
import { GUARDIAO, VICTORY_DELAY_MS } from '../data/boss';
import { ROOM_TEMPLATES } from '../data/roomTemplates';
import { ArqueiroOco } from '../entities/ArqueiroOco';
import { CaoDeOssos } from '../entities/CaoDeOssos';
import { Carnical } from '../entities/Carnical';
import { Guardiao } from '../entities/Guardiao';
import type { Enemy, EnemyTarget, EnemyWorld } from '../entities/Enemy';
import { Player, type PlayerSnapshot } from '../entities/Player';
import { Prop, type PropKind } from '../entities/Prop';
import { RelicPickup } from '../entities/RelicPickup';
import { Vulto } from '../entities/Vulto';
import { createPack, updatePack } from '../logic/ai/pack';
import { rollRelicDrop } from '../logic/drops';
import { boxesOverlap } from '../logic/geometry';
import { buildCatalog } from '../logic/map/catalog';
import {
  cellAt,
  crossedSide,
  crossingAt,
  entryCandidates,
  sealUnusedExits,
  usedExits,
  type Crossing,
} from '../logic/map/roomRuntime';
import type { PlacedRoom, Side } from '../logic/map/types';
import { advanceBiome, createRun, enterRoom, propKey, type RunState } from '../logic/run';
import { floorYAt } from '../logic/pickupDrop';
import { isSolidTile, parseRoom, type ParsedRoom, type RoomMarker } from '../logic/roomParser';
import { createSlowMo, triggerSlowMo, updateSlowMo } from '../logic/slowMo';
import { planDecor } from '../logic/decor';
import { tileLook } from '../logic/tileVariant';
import { AtmosphereSystem } from '../systems/AtmosphereSystem';
import { BossHud } from '../systems/BossHud';
import { CombatSystem } from '../systems/CombatSystem';
import { decorTextureKey } from '../systems/decorArt';
import { tileTextureKey } from '../systems/environmentTextures';
import { FxSystem } from '../systems/FxSystem';
import { InputSystem } from '../systems/InputSystem';
import { MiniMap } from '../systems/MiniMap';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { showBiomeBanner } from '../systems/BiomeBanner';
import { HpBar } from '../systems/HpBar';
import { KeyHints } from '../systems/KeyHints';
import { RelicHud, type RelicSlotView } from '../systems/RelicHud';
import { TEXTURE } from '../systems/textures';
import { createRng, type Rng } from '../utils/rng';
import { EVENT_DONE, type RelicChoiceData, type RelicChoiceResult } from './RelicChoiceScene';

/** Índices dos dois slots de relíquia (constante: o update não pode alocar arrays). */
const SLOTS = [0, 1] as const;

/** Modelos de sala prontos (montados uma vez). */
const CATALOG = buildCatalog(ROOM_TEMPLATES);

/** Por onde o jogador entra na sala nova (a porta DA SALA NOVA) e o que ele leva da sala anterior. */
export interface GameSceneData {
  run?: RunState;
  entry?: { side: Side; cell: number } | null;
  snapshot?: PlayerSnapshot | null;
}

/**
 * A cena do jogo mostra UMA sala da fortaleza. Ao sair por uma porta, a cena é recriada com
 * a sala vizinha (o estado da run e do jogador viaja em `GameSceneData`).
 */
export class GameScene extends Phaser.Scene {
  private run!: RunState;
  private entry: GameSceneData['entry'] = null;
  private savedPlayer: PlayerSnapshot | null = null;
  private placed!: PlacedRoom;
  private roomWidthPx = 0;
  private roomHeightPx = 0;
  /** Mesmas medidas, num objeto reaproveitado a cada frame (sem alocar no update). */
  private readonly roomSize = { widthPx: 0, heightPx: 0 };
  private transitioning = false;
  private roomCleared = false;

  private player!: Player;
  private enemies: Enemy[] = [];
  private props: Prop[] = [];
  private inputSystem!: InputSystem;
  private combat!: CombatSystem;
  private fx!: FxSystem;
  private atmosphere!: AtmosphereSystem;
  private minimap!: MiniMap;
  private boss: Guardiao | null = null;
  private bossHud: BossHud | null = null;
  private victoryQueued = false;
  private arrows!: ProjectileSystem;
  private bolts!: ProjectileSystem;
  private relicHud!: RelicHud;
  private rng!: Rng;
  private pickups: RelicPickup[] = [];
  /** A sala em que estamos (para achar o chão sob uma relíquia que cai). */
  private roomData!: ParsedRoom;
  private choiceOpen = false;
  /** Dados da HUD de relíquias, reaproveitados a cada frame. */
  private readonly slotViews: [RelicSlotView, RelicSlotView] = [
    { relicId: 'lamina', cooldownFraction: 0 },
    { relicId: 'lamina', cooldownFraction: 0 },
  ];
  private readonly pack = createPack(DOG_PACK.maxConcurrent, DOG_PACK.gapMs);
  private readonly slowMo = createSlowMo();
  /** Alvo dos inimigos; é um objeto só, reaproveitado a cada frame. */
  private readonly target: EnemyTarget = { x: 0, y: 0, alive: true };
  private hpBar!: HpBar;
  private deathTimerMs = 0;
  private deathShown = false;
  private worldFrozen = false;

  constructor() {
    super('Game');
  }

  init(data: GameSceneData): void {
    // Sem dados = começo de uma run nova (do menu, da morte ou do carregamento)
    this.run = data.run ?? createRun(Date.now(), CATALOG.infos);
    this.entry = data.entry ?? null;
    this.savedPlayer = data.snapshot ?? null;
  }

  create(): void {
    // A cena é reaproveitada a cada sala: zera todo o estado local.
    this.enemies = [];
    this.props = [];
    this.pickups = [];
    this.choiceOpen = false;
    this.transitioning = false;
    this.roomCleared = false;
    this.boss = null;
    this.bossHud = null;
    this.victoryQueued = false;
    this.rng = createRng(Date.now());
    this.deathTimerMs = 0;
    this.deathShown = false;
    this.worldFrozen = false;
    this.slowMo.remainingMs = 0;
    this.pack.holders.fill(-1);
    this.pack.gapTimerMs = 0;
    this.physics.world.resume();
    this.physics.world.timeScale = 1;
    this.cameras.main.setBackgroundColor(PALETTE.void);

    const run = this.run;
    const placed = run.map.rooms.find((r) => r.id === run.roomId);
    const template = placed ? CATALOG.byId.get(placed.templateId) : undefined;
    if (!placed || !template) throw new Error(`Sala ${run.roomId} sem modelo.`);
    this.placed = placed;

    // Portas sem ligação no mapa viram parede
    const layout = sealUnusedExits(template.layout, usedExits(run.map, run.roomId));
    const room = parseRoom(layout);
    this.roomData = room;
    this.roomWidthPx = room.cols * TILE_SIZE;
    this.roomHeightPx = room.rows * TILE_SIZE;
    this.roomSize.widthPx = this.roomWidthPx;
    this.roomSize.heightPx = this.roomHeightPx;

    // O mundo é um pouco maior que a sala: o jogador atravessa a porta e a cena troca de sala
    const margin = ROOM_TRANSITION.worldMarginPx;
    this.physics.world.setBounds(
      -margin,
      -margin,
      this.roomWidthPx + margin * 2,
      this.roomHeightPx + margin * 2,
    );
    this.cameras.main.setBounds(0, 0, this.roomWidthPx, this.roomHeightPx);

    const solids = this.physics.add.staticGroup();
    for (const { col, row } of room.solids) {
      const key = tileTextureKey(run.map.biome, tileLook(room, col, row, TILE_VARIANTS));
      solids.create(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, key);
    }
    this.spawnDecor(room);

    this.bolts = new ProjectileSystem(this, room, TEXTURE.bolt, PROJECTILE_POOL.bolts);
    const spawn = this.spawnPoint(room);
    this.player = new Player(this, spawn.x, spawn.y, this.bolts);
    if (this.savedPlayer) this.player.restore(this.savedPlayer);
    this.player.setVelocity(spawn.vx, spawn.vy);
    this.physics.add.collider(this.player, solids);

    this.arrows = new ProjectileSystem(this, room, TEXTURE.arrow, PROJECTILE_POOL.arrows);
    this.spawnEnemies(
      room,
      {
        room,
        arrows: this.arrows,
        onBossPhase: () => this.onBossPhase(),
        onBossLand: (x, y) => this.onBossLand(x, y),
      },
      solids,
    );
    this.spawnProps(room);
    this.spawnSecretTreasure(room);

    this.inputSystem = new InputSystem(this);
    this.fx = new FxSystem(this);
    this.player.onDust = (x, y, count) => this.fx.puffDust(x, y, count);
    this.combat = new CombatSystem(this.player, this.enemies, this.arrows, this.bolts, {
      onEnemyHit: (enemy, damage, empowered) =>
        this.fx.enemyHit(enemy.x, enemy.y, damage, empowered),
      onEnemyKilled: (enemy) => this.onEnemyKilled(enemy),
      onPlayerHit: (damage) => this.fx.playerHit(this.player.x, this.player.y, damage),
      onPerfectDodge: () => this.onPerfectDodge(),
      onProjectileBlocked: (arrow) => this.fx.projectileBlocked(arrow.x, arrow.y),
      onSwapStrike: (strike) =>
        this.fx.swapStrike(this.player.x, this.player.y, this.player.relic.color, strike.radius),
    });

    this.createHud();
    this.relicHud = new RelicHud(this);
    this.minimap = new MiniMap(this, run);
    this.atmosphere = new AtmosphereSystem(
      this,
      room,
      [this.enemies, this.props],
      run.map.biome,
      BIOME_DARKNESS[run.map.biome],
    );

    // A câmera acompanha o jogador dentro dos limites da sala
    this.cameras.main.startFollow(
      this.player,
      true,
      ROOM_TRANSITION.cameraLerp,
      ROOM_TRANSITION.cameraLerp,
    );
    // Já começa centrada no jogador (sem deslizar desde o canto da sala)
    const cam = this.cameras.main;
    cam.setScroll(
      Phaser.Math.Clamp(spawn.x - cam.width / 2, 0, Math.max(0, this.roomWidthPx - cam.width)),
      Phaser.Math.Clamp(spawn.y - cam.height / 2, 0, Math.max(0, this.roomHeightPx - cam.height)),
    );
    cam.fadeIn(ROOM_TRANSITION.fadeMs, 0, 0, 0);

    // Ao chegar a um bioma novo, mostra o nome dele
    if (run.visited.size === 1 && !this.entry) {
      showBiomeBanner(this, run.biomeIndex, BIOME_NAMES[run.map.biome]);
    }
  }

  update(_time: number, delta: number): void {
    // Hit stop: o jogo congela por instantes (tempo real). O input não é lido nesses
    // frames, então um botão do teclado apertado durante o congelamento fica guardado.
    const frozen = this.fx.beginFrame(delta);
    if (frozen !== this.worldFrozen) {
      this.worldFrozen = frozen;
      if (frozen) this.physics.world.pause();
      else this.physics.world.resume();
    }

    if (!frozen && !this.transitioning) {
      // Câmera lenta da esquiva perfeita: o tempo do jogo desacelera, o input não.
      const timeScale = updateSlowMo(this.slowMo, delta, PERFECT_DODGE.slowMoScale);
      this.physics.world.timeScale = 1 / timeScale;
      const dt = delta * timeScale;

      this.inputSystem.update();
      this.player.update(dt, this.inputSystem.intent);

      this.target.x = this.player.x;
      this.target.y = this.player.y;
      this.target.alive = !this.player.isDead();
      updatePack(this.pack, dt);
      for (const enemy of this.enemies) enemy.update(dt, this.target);
      this.arrows.update(dt);
      this.bolts.update(dt);
      this.updatePickups(dt);
      for (const prop of this.props) prop.update(dt);

      this.combat.update();
      this.fx.update(dt);
      const cam = this.cameras.main;
      this.atmosphere.update(dt, this.player.x, this.player.y, cam.scrollX, cam.scrollY);
      this.checkPickups();
      this.checkProps();
      this.checkRoomCleared();
      this.checkExit();
    }
    this.minimap.update(delta);
    this.bossHud?.update(delta, this.boss ? this.boss.hpFraction : 0);
    this.updateRelicHud();

    this.hpBar.update(delta, this.player.health.hp);

    // Morte: espera um instante (tempo real) e mostra a tela de "Você caiu".
    if (this.player.isDead() && !this.deathShown) {
      this.deathTimerMs += delta;
      if (this.deathTimerMs >= DEATH_SCREEN_DELAY_MS) {
        this.deathShown = true;
        this.scene.launch('Death');
        this.scene.pause();
      }
    }
  }

  /**
   * Decoração do cenário (tufos, ossos, trepadeiras, teias...), sorteada por sala com a semente
   * da run: a mesma sala sempre fica igual. É só visual, atrás de personagens e objetos.
   */
  private spawnDecor(room: ParsedRoom): void {
    const run = this.run;
    const seed =
      (Math.imul(run.seed | 0, 2654435761) + run.roomId * 977 + run.biomeIndex * 131) >>> 0;
    for (const item of planDecor(room, seed)) {
      const image = this.add.image(0, 0, decorTextureKey(run.map.biome, item.kind, item.variant));
      const left = item.col * TILE_SIZE;
      const top = item.row * TILE_SIZE;
      switch (item.kind) {
        case 'tuft':
        case 'rubble':
        case 'bone':
          // Em pé sobre o bloco de chão, um pixel enterrado
          image.setOrigin(0.5, 1).setPosition(left + TILE_SIZE / 2, top + 1);
          break;
        case 'vine':
        case 'chain':
        case 'drip':
          // Pendurado sob o bloco de teto
          image.setOrigin(0.5, 0).setPosition(left + TILE_SIZE / 2, top + TILE_SIZE - 1);
          break;
        case 'cobweb':
          if (item.flipX) image.setOrigin(1, 0).setPosition(left + TILE_SIZE, top);
          else image.setOrigin(0, 0).setPosition(left, top);
          break;
        default:
          image.setPosition(left + TILE_SIZE / 2, top + TILE_SIZE / 2);
      }
      if (item.flipX) image.setFlipX(true);
    }
  }

  /** Onde o jogador nasce: na porta por onde entrou ou, na sala inicial, no ponto 'P'. */
  private spawnPoint(room: ParsedRoom): { x: number; y: number; vx: number; vy: number } {
    const entry = this.entry;
    if (entry) {
      const candidates = entryCandidates(
        entry.side,
        entry.cell,
        room.cols,
        PLAYER.height / TILE_SIZE,
      );
      // Usa o primeiro ponto que não cai dentro de um bloco do desenho
      const half = PLAYER.height / TILE_SIZE / 2;
      const point =
        candidates.find(
          (c) =>
            !isSolidTile(room, Math.floor(c.col), Math.floor(c.row - half)) &&
            !isSolidTile(room, Math.floor(c.col), Math.floor(c.row + half - 0.05)),
        ) ?? candidates[0];
      if (point) {
        return { x: point.col * TILE_SIZE, y: point.row * TILE_SIZE, vx: point.vx, vy: point.vy };
      }
    }
    if (!room.spawn) throw new Error('A sala inicial precisa de um ponto de nascimento (P).');
    // Centro do sprite: encosta a base do corpo no chão do bloco 'P'
    return {
      x: room.spawn.col * TILE_SIZE + TILE_SIZE / 2,
      y: (room.spawn.row + 1) * TILE_SIZE - PLAYER.height / 2,
      vx: 0,
      vy: 0,
    };
  }

  /** Cria um inimigo para cada marcador da sala ('C', 'A', 'V', 'D'), se a sala ainda não foi limpa. */
  private spawnEnemies(
    room: ParsedRoom,
    world: EnemyWorld,
    solids: Phaser.Physics.Arcade.StaticGroup,
  ): void {
    if (this.run.cleared.has(this.run.roomId)) return;
    let dogs = 0;

    for (const marker of room.markers) {
      if (marker.char === 'G') {
        this.spawnBoss(marker, world, solids);
        continue;
      }
      if (marker.char in DECOR_MARKERS || marker.char in PROP_MARKERS) continue;
      const type = ENEMY_MARKERS[marker.char as keyof typeof ENEMY_MARKERS] as
        EnemyType | undefined;
      if (!type) continue;
      const x = marker.col * TILE_SIZE + TILE_SIZE / 2;
      let enemy: Enemy;
      switch (type) {
        case 'carnical':
          enemy = new Carnical(this, x, this.markerY(marker, CARNICAL.height), world);
          break;
        case 'arqueiro':
          enemy = new ArqueiroOco(this, x, this.markerY(marker, ARQUEIRO_OCO.height), world);
          break;
        case 'vulto':
          enemy = new Vulto(this, x, marker.row * TILE_SIZE + TILE_SIZE / 2, world);
          break;
        case 'cao':
          enemy = new CaoDeOssos(this, x, this.markerY(marker, CAO_DE_OSSOS.height), world, {
            pack: this.pack,
            packId: dogs++,
          });
          break;
      }
      // Voadores atravessam plataformas: só os terrestres colidem com o cenário.
      if (type !== 'vulto') this.physics.add.collider(enemy, solids);
      this.enemies.push(enemy);
    }
  }

  /** O Guardião Partido: nasce no marcador 'G' da sala do chefe. */
  private spawnBoss(
    marker: RoomMarker,
    world: EnemyWorld,
    solids: Phaser.Physics.Arcade.StaticGroup,
  ): void {
    const rng = createRng(this.run.seed ^ 0x9e3779b9);
    const boss = new Guardiao(
      this,
      marker.col * TILE_SIZE + TILE_SIZE / 2,
      this.markerY(marker, GUARDIAO.height),
      world,
      rng,
    );
    this.physics.add.collider(boss, solids);
    this.enemies.push(boss);
    this.boss = boss;
    this.bossHud = new BossHud(this);
  }

  /** Sala secreta: um baú escondido no meio do chão (o tesouro do desvio). */
  private spawnSecretTreasure(room: ParsedRoom): void {
    if (this.placed.kind !== 'secret') return;
    const col = Math.floor(room.cols / 2);
    const prop = new Prop(this, 'chest', col * TILE_SIZE, (room.rows - 2) * TILE_SIZE);
    prop.key = propKey(this.run.roomId, col, -1);
    if (this.run.usedProps.has(prop.key)) prop.markUsed();
    this.props.push(prop);
  }

  /** O chefe pousou de um salto: nuvem de poeira e um tremor curto. */
  private onBossLand(x: number, y: number): void {
    const { landShakeMs, landShakeIntensity, landDustCount } = ROOM_TRANSITION;
    this.fx.puffDust(x, y, landDustCount);
    this.cameras.main.shake(landShakeMs, landShakeIntensity, true);
  }

  /** O chefe entrou na fase 2: a tela treme e dá um clarão. */
  private onBossPhase(): void {
    const { phaseShakeMs, phaseShakeIntensity, phaseFlashMs, phaseFlashColor } = ROOM_TRANSITION;
    this.cameras.main.shake(phaseShakeMs, phaseShakeIntensity, true);
    this.cameras.main.flash(phaseFlashMs, phaseFlashColor.r, phaseFlashColor.g, phaseFlashColor.b);
  }

  private onEnemyKilled(enemy: Enemy): void {
    if (enemy.isBoss) {
      this.onBossDefeated(enemy);
      return;
    }
    this.dropRelic(enemy.x, enemy.y);
  }

  /** O chefe caiu: solta uma relíquia e, depois de um instante, mostra a tela de vitória. */
  private onBossDefeated(boss: Enemy): void {
    const id = rollRelicDrop(this.rng, 1, RELIC_IDS, this.player.loadout.slots);
    if (id) this.spawnPickup(boss.x, boss.y - 6, id);
    if (this.victoryQueued) return;
    this.victoryQueued = true;
    this.run.finished = true; // a vitória não se perde se o jogador sair da arena antes dela
    this.time.delayedCall(VICTORY_DELAY_MS, () => {
      if (this.player.isDead()) return;
      this.scene.launch('Victory');
      this.scene.pause();
    });
  }

  /** Baús, fogueiras de descanso e a porta para o próximo bioma. */
  private spawnProps(room: ParsedRoom): void {
    for (const marker of room.markers) {
      const kind: PropKind | undefined = PROP_MARKERS[marker.char as keyof typeof PROP_MARKERS];
      if (!kind) continue;
      const prop = new Prop(
        this,
        kind,
        marker.col * TILE_SIZE + TILE_SIZE / 2,
        (marker.row + 1) * TILE_SIZE,
      );
      prop.key = propKey(this.run.roomId, marker.col, marker.row);
      if (this.run.usedProps.has(prop.key)) prop.markUsed();
      this.props.push(prop);
    }
  }

  /** Centro do sprite que apoia o corpo (de altura `height`) no chão do tile do marcador. */
  private markerY(marker: RoomMarker, height: number): number {
    return (marker.row + 1) * TILE_SIZE - height / 2;
  }

  private createHud(): void {
    this.hpBar = new HpBar(this, PLAYER_COMBAT.maxHp, this.player.health.hp);
    // A dica de controles só aparece na primeira sala da run e some sozinha
    if (this.run.biomeIndex === 0 && this.run.visited.size === 1) new KeyHints(this);
  }

  // --- Saídas, objetos e limpeza da sala -------------------------------------------------

  /** O jogador saiu da sala por uma porta? Então troca para a sala vizinha. */
  private checkExit(): void {
    if (this.transitioning || this.player.isDead() || this.victoryQueued) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const side = crossedSide(body.center.x, body.center.y, this.roomSize);
    if (!side) return;
    const cell = cellAt(body.center.x, TILE_SIZE, this.placed.cellsW);
    const crossing = crossingAt(this.run.map, this.run.roomId, side, cell);
    if (crossing) this.goToRoom(crossing);
  }

  private goToRoom(crossing: Crossing): void {
    enterRoom(this.run, crossing.toId);
    this.leave({ side: crossing.entrySide, cell: crossing.entryCell });
  }

  /** Desvanece e recria a cena com a próxima sala (ou o primeiro ponto do próximo bioma). */
  private leave(entry: GameSceneData['entry']): void {
    this.transitioning = true;
    const snapshot = this.player.snapshot();
    const camera = this.cameras.main;
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ run: this.run, entry, snapshot } satisfies GameSceneData);
    });
    camera.fadeOut(ROOM_TRANSITION.fadeMs, 0, 0, 0);
  }

  private checkRoomCleared(): void {
    if (this.roomCleared || this.enemies.length === 0) return;
    for (const enemy of this.enemies) if (enemy.alive) return;
    this.roomCleared = true;
    this.run.cleared.add(this.run.roomId);
  }

  /** O jogador encostou num baú, numa fogueira ou na porta do próximo bioma? */
  private checkProps(): void {
    if (this.player.isDead()) return;
    for (const prop of this.props) {
      if (prop.used || !boxesOverlap(prop.box, this.player.hurtBox)) continue;
      switch (prop.kind) {
        case 'chest':
          this.openChest(prop);
          break;
        case 'fire':
          this.restAtFire(prop);
          break;
        case 'door':
          this.useDoor();
          return;
      }
    }
  }

  private markPropUsed(prop: Prop): void {
    prop.markUsed();
    this.run.usedProps.add(prop.key);
  }

  /** Baú: solta uma relíquia nova (se ainda houver uma que o jogador não carrega) ou cura. */
  private openChest(prop: Prop): void {
    this.markPropUsed(prop);
    this.fx.puffDust(prop.x, prop.y + 8, 6);
    const id = rollRelicDrop(this.rng, 1, RELIC_IDS, this.player.loadout.slots);
    const taken = id !== null && this.pickups.some((pickup) => pickup.relicId === id);
    if (id && !taken) {
      this.spawnPickup(prop.x, prop.y - 10, id);
      return;
    }
    const amount = PLAYER_COMBAT.maxHp * PLAYER_COMBAT.chestHealFraction;
    this.fx.heal(prop.x, prop.y - 10, this.player.heal(amount));
  }

  /** Fogueira de descanso: cura tudo uma vez e apaga. */
  private restAtFire(prop: Prop): void {
    const healed = this.player.heal(PLAYER_COMBAT.maxHp);
    this.markPropUsed(prop);
    this.fx.heal(this.player.x, this.player.y - 6, healed);
  }

  /** Porta do próximo bioma. */
  private useDoor(): void {
    if (this.transitioning || this.victoryQueued) return;
    const hasNext = advanceBiome(this.run, CATALOG.infos);
    if (!hasNext) return; // último bioma: o fim da run é do chefe (ver sala 'boss')
    this.leave(null);
  }

  // --- Relíquias do chão -------------------------------------------------------------------

  /** Relíquia nova no chão com certa chance; só as que o jogador ainda não carrega. */
  private dropRelic(x: number, y: number): void {
    const loadout = this.player.loadout;
    const id = rollRelicDrop(this.rng, RELIC_DROP.chance, RELIC_IDS, loadout.slots);
    if (!id || this.pickups.some((pickup) => pickup.relicId === id)) return;
    this.spawnPickup(x, y - 6, id, RELIC_DROP.lifetimeMs);
  }

  /** Larga uma relíquia: ela cai até o chão sob (x, y) e fica ali esperando ser pega. */
  private spawnPickup(x: number, y: number, id: RelicId, lifetimeMs?: number): void {
    const floorY = floorYAt(this.roomData, x, y, TILE_SIZE);
    this.pickups.push(new RelicPickup(this, x, y, floorY, id, lifetimeMs));
  }

  /** Atualiza as relíquias do chão e remove as que o tempo esgotou. */
  private updatePickups(dt: number): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      if (!pickup) continue;
      pickup.update(dt);
      if (!pickup.expired) continue;
      this.fx.puffDust(pickup.x, pickup.y, 3);
      this.pickups.splice(i, 1);
      pickup.destroy();
    }
  }

  /**
   * O jogador está perto de uma relíquia do chão? Aparece o aviso "[E] nome" nela; apertar o botão
   * de interagir abre a tela de troca. Só a mais próxima de quem chegou primeiro mostra o aviso.
   */
  private checkPickups(): void {
    const canUse = !this.choiceOpen && !this.player.isDead() && !this.transitioning;
    let target: RelicPickup | null = null;
    for (const pickup of this.pickups) {
      const near = canUse && target === null && boxesOverlap(pickup.box, this.player.hurtBox);
      pickup.setNear(near);
      if (near) target = pickup;
    }
    if (target && this.inputSystem.intent.interactPressed) this.openRelicChoice(target);
  }

  private openRelicChoice(pickup: RelicPickup): void {
    this.choiceOpen = true;
    const data: RelicChoiceData = {
      newRelic: pickup.relicId,
      slots: this.player.loadout.slots,
      active: this.player.loadout.active,
    };
    const onDone = (result: RelicChoiceResult): void => {
      this.events.off('shutdown', cleanup);
      this.scene.stop('RelicChoice');
      this.scene.resume('Game');
      this.inputSystem.resync(); // o botão de confirmar não vira pulo/ataque no jogo
      this.choiceOpen = false;
      if (result.discardSlot === null) return; // deixou no chão: continua lá para pegar depois
      this.player.equipRelic(result.discardSlot, pickup.relicId);
      this.pickups.splice(this.pickups.indexOf(pickup), 1);
      pickup.destroy();
    };
    // Se a cena for encerrada com a escolha aberta, solta o ouvinte
    const cleanup = (): void => {
      this.game.events.off(EVENT_DONE, onDone);
    };
    this.game.events.once(EVENT_DONE, onDone);
    this.events.once('shutdown', cleanup);
    this.scene.pause();
    this.scene.launch('RelicChoice', data);
  }

  private updateRelicHud(): void {
    const player = this.player;
    for (const slot of SLOTS) {
      const view = this.slotViews[slot];
      view.relicId = player.loadout.slots[slot];
      view.cooldownFraction = player.specialCooldownFraction(slot);
    }
    this.relicHud.update(player.loadout.active, this.slotViews);
  }

  /** Esquiva perfeita: bônus de dano, câmera lenta e efeitos visuais. */
  private onPerfectDodge(): void {
    this.player.grantDodgeBonus();
    triggerSlowMo(this.slowMo, PERFECT_DODGE.slowMoMs);
    this.fx.perfectDodge(this.player.x, this.player.y);
  }
}
