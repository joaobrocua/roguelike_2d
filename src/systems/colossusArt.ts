import { BIOME_LOOK } from '../data/biomeLook';
import type { BiomeId } from '../data/mapRules';
import { PALETTE } from '../data/palette';
import { SANCTUARY_DECOR as D } from '../data/sanctuaryRoom';
import { bayer, disc, mix, noise2, rect, type Ctx } from './pixelCanvas';

/**
 * O anjo caído colossal da parede do fundo, desenhado em código com sombreamento tramado
 * (dithering) sobre a rampa de pedra do bioma: asas de três fileiras de penas (a da direita
 * partida, só com o osso), auréola partida, capuz baixo com o rosto de olhos fechados e uma
 * lágrima de luz, ombreiras em placas, peitoral com um sol gravado, tassetes, correntes soltas e
 * uma espada enorme com runas acesas e a guarda em asas. O musgo e as trepadeiras vêm do bioma.
 */
export function drawColossus(ctx: Ctx, biome: BiomeId): void {
  const look = BIOME_LOOK[biome];
  const st = look.stone;
  const { width, height, haloY, haloRx, haloRy } = D.colossus;
  const cx = width / 2;
  const ramp = [st.deep, st.dark, st.base, st.light, st.highlight];
  const bone = mix(st.highlight, 0xffffff, 0.38);

  /** Pinta um pixel na rampa da pedra; `t` (0 a 1) é a luz, com trama de Bayer entre os tons. */
  const paint = (x: number, y: number, t: number): void => {
    const level = Math.min(1, Math.max(0, t)) * (ramp.length - 1);
    const i = Math.min(ramp.length - 2, Math.floor(level));
    const color = level - i > bayer(x, y) ? ramp[i + 1] : ramp[i];
    rect(ctx, color ?? st.base, x, y, 1, 1);
  };
  /** Luz geral: vem do alto e do centro (da auréola), então a esquerda é um pouco mais clara. */
  const lightAt = (x: number, y: number): number =>
    0.62 - 0.34 * (y / height) - 0.1 * ((x - cx) / cx);

  // --- Auréola partida: arco grosso com vão, anel interno de pontos, joias e estilhaços -------
  for (let deg = 0; deg < 360; deg += 2) {
    if (deg > 285 && deg < 345) continue;
    const rad = (deg * Math.PI) / 180;
    const x = cx + Math.round(Math.cos(rad) * haloRx);
    const y = haloY + Math.round(Math.sin(rad) * haloRy);
    rect(ctx, PALETTE.glow, x - 1, y - 1, 3, 3);
    rect(ctx, PALETTE.playerAccent, x, y, 1, 1, 0.7);
    if (deg % 6 === 0) {
      const ix = cx + Math.round(Math.cos(rad) * (haloRx - 6));
      const iy = haloY + Math.round(Math.sin(rad) * (haloRy - 5));
      rect(ctx, PALETTE.glow, ix, iy, 1, 1, 0.55);
    }
  }
  for (const deg of [20, 110, 200, 250]) {
    const rad = (deg * Math.PI) / 180;
    disc(
      ctx,
      PALETTE.playerAccent,
      cx + Math.round(Math.cos(rad) * haloRx),
      haloY + Math.round(Math.sin(rad) * haloRy),
      1,
      0.9,
    );
  }
  for (const [dx, dy, w, h] of [
    [haloRx + 6, -30, 6, 2],
    [haloRx + 11, -23, 4, 2],
    [haloRx + 2, -36, 3, 2],
    [haloRx + 14, -14, 2, 4],
    [haloRx + 18, -30, 2, 2],
  ] as const) {
    rect(ctx, PALETTE.glow, cx + dx, haloY + dy, w, h, 0.9);
  }
  const sx = cx + haloRx + 9;
  const sy = haloY - 40; // brilho em cruz na ponta do arco partido
  rect(ctx, PALETTE.playerAccent, sx - 3, sy, 7, 1, 0.9);
  rect(ctx, PALETTE.playerAccent, sx, sy - 3, 1, 7, 0.9);

  // --- Asas: três fileiras de penas (primárias, secundárias, coberteiras) ------------------
  const span = 98;
  const leadingTop = (t: number): number =>
    Math.round(66 - 52 * Math.sin(Math.PI * t) + 34 * t ** 3);
  for (const side of [-1, 1] as const) {
    const broken = side > 0;
    for (const layer of [0, 1, 2] as const) {
      const offset = [0, 3, 5][layer] ?? 0;
      for (let i = 0; i < span; i++) {
        const t = i / span;
        const x = side < 0 ? cx - 24 - i : cx + 23 + i;
        const top0 = leadingTop(t);
        const low = Math.round(116 + 0.55 * i);
        const reach = low - top0;
        const group = Math.floor((i + offset) / 7);
        const k = (i + offset) % 7;
        // A asa partida perde penas de verdade: buracos nas pontas e só osso na extremidade
        if (broken && i > 56 && noise2(group, layer + 11) < (i > 76 ? 1 : 0.45)) continue;
        const top = layer === 0 ? top0 + 2 : layer === 1 ? top0 + Math.round(reach * 0.2) : top0;
        const base =
          layer === 0
            ? low
            : layer === 1
              ? top0 + Math.round(reach * 0.72)
              : top0 + Math.round(reach * 0.4);
        const profile = 1 - ((k - 3) / 3.6) ** 2;
        const bottom = base - Math.round((1 - profile) * 5);
        if (bottom <= top + 1) continue;
        for (let y = top; y < bottom; y++) {
          let tone = lightAt(x, y) + [-0.2, -0.04, 0.1][layer]!;
          if (k === 3) tone += 0.13; // nervura central da pena
          if (k === 0) tone -= 0.14; // divisa entre as penas
          if ((y + k + group) % 3 === 0) tone -= 0.06; // barbas
          paint(x, y, tone);
        }
        rect(ctx, st.deep, x, bottom - 1, 1, 1); // contorno da ponta
        if (k === 0) rect(ctx, st.deep, x, top, 1, bottom - top);
      }
    }
    // O osso da asa: do ombro ao pulso e a garra; na asa partida ele segue nu até a ponta
    const last = broken ? 94 : 60;
    for (let i = 0; i < last; i++) {
      const x = side < 0 ? cx - 24 - i : cx + 23 + i;
      const y = leadingTop(i / span) + 1;
      rect(ctx, bone, x, y, 1, 2);
      if (i % 5 === 0) rect(ctx, st.deep, x, y + 2, 1, 1);
    }
    const wristX = side < 0 ? cx - 24 - 48 : cx + 23 + 48;
    const wristY = leadingTop(48 / span);
    disc(ctx, bone, wristX, wristY + 1, 3);
    disc(ctx, st.deep, wristX, wristY + 1, 1);
    for (let c = 0; c < 8; c++) {
      rect(ctx, bone, wristX + side * c, wristY - 3 - Math.round(c * 0.9), 1, 2); // garra
    }
  }

  // --- Manto: do pescoço ao chão, com dobras sombreadas e a barra rasgada ----------------------
  const halfAt = (y: number): number => {
    if (y < 72) return 12 + (y - 60) * 1.6;
    if (y < 132) return 31 - (y - 72) * (15 / 60);
    return 16 + ((y - 132) / (height - 132)) ** 1.4 * 26;
  };
  for (let y = 60; y < height; y++) {
    const half = Math.round(halfAt(y));
    for (let x = cx - half; x < cx + half; x++) {
      const u = (x - cx) / Math.max(8, half);
      const fold = y > 134 ? 0.12 * Math.sin(u * 9 + Math.sin(y * 0.05) * 1.5) : 0;
      const edge = Math.abs(u) > 0.82 ? -0.12 : 0;
      paint(x, y, lightAt(x, y) - 0.04 + fold + edge);
    }
    rect(ctx, st.deep, cx - half - 1, y, 1, 1);
    rect(ctx, st.deep, cx + half, y, 1, 1);
  }
  for (let x = cx - 40; x < cx + 40; x += 4) {
    const drop = Math.round(noise2(x, 7) * 5); // barra rasgada
    rect(ctx, st.deep, x, height - 16 + drop, 3, 1);
  }
  rect(ctx, PALETTE.glow, cx - 40, height - 18, 80, 1, 0.35);

  // --- Peitoral, sol gravado, cinto e tassetes -----------------------------------------------
  for (let y = 72; y < 128; y++) {
    const half = Math.round(halfAt(y)) - 4;
    for (let x = cx - half; x < cx + half; x++) {
      const u = (x - cx) / half;
      paint(x, y, lightAt(x, y) + 0.1 + 0.14 * (1 - Math.abs(u)) - 0.05 * Math.abs(u));
    }
  }
  for (const seamY of [84, 98, 112]) {
    for (let x = cx - 26; x < cx + 26; x++) {
      const dx = (x - cx) / 26;
      rect(ctx, st.deep, x, seamY + Math.round(dx * dx * 4), 1, 1);
    }
  }
  rect(ctx, st.highlight, cx - 1, 76, 2, 50); // quilha do peitoral
  rect(ctx, st.deep, cx + 1, 76, 1, 50);
  for (let deg = 0; deg < 360; deg += 30) {
    const rad = (deg * Math.PI) / 180;
    for (let r = 4; r < 11; r++) {
      rect(
        ctx,
        PALETTE.glow,
        cx + Math.round(Math.cos(rad) * r),
        96 + Math.round(Math.sin(rad) * r),
        1,
        1,
        0.8,
      );
    }
  }
  disc(ctx, st.deep, cx, 96, 5);
  disc(ctx, PALETTE.glow, cx, 96, 3);
  disc(ctx, PALETTE.playerAccent, cx, 96, 1);
  // Cinto com rebites e fivela
  rect(ctx, st.deep, cx - 19, 127, 38, 10);
  rect(ctx, st.dark, cx - 18, 128, 36, 8);
  for (let x = cx - 16; x < cx + 16; x += 5) rect(ctx, st.highlight, x, 130, 1, 1);
  rect(ctx, st.deep, cx - 5, 126, 10, 12);
  rect(ctx, PALETTE.glow, cx - 4, 127, 8, 10);
  rect(ctx, st.deep, cx - 2, 129, 4, 6);
  // Tassetes: placas sobrepostas pendendo do cinto
  for (let j = 0; j < 8; j++) {
    const x0 = cx - 32 + j * 8;
    const length = j % 2 === 0 ? 30 : 26;
    for (let y = 137; y < 137 + length; y++) {
      const round = y > 137 + length - 5 ? Math.round(((y - (137 + length - 5)) / 5) ** 2 * 3) : 0;
      for (let x = x0 + round; x < x0 + 8 - round; x++) {
        paint(x, y, lightAt(x, y) + 0.06 - 0.07 * ((y - 137) / length) + (x === x0 + 3 ? 0.1 : 0));
      }
    }
    rect(ctx, st.deep, x0, 137, 1, length);
    rect(ctx, st.deep, x0 + 1, 137 + length - 1, 6, 1);
    rect(ctx, st.highlight, x0 + 3, 139, 1, 1); // rebite
  }

  // --- Espada enorme: lâmina com sulco e runas, punho enrolado, guarda em asas ----------------
  const blade = mix(st.highlight, 0xffffff, 0.2);
  for (let y = 126; y < height; y++) {
    for (let x = cx - 5; x < cx + 5; x++) {
      const u = x - cx + 0.5;
      const color = u < -2.5 ? blade : u < 0 ? st.highlight : u < 2.5 ? st.light : st.base;
      rect(ctx, color, x, y, 1, 1);
    }
    rect(ctx, st.deep, cx - 1, y, 2, 1); // sulco central
  }
  rect(ctx, st.deep, cx - 6, 126, 1, height);
  rect(ctx, st.deep, cx + 5, 126, 1, height);
  for (let y = 142; y < height - 8; y += 18) {
    for (let gy = 0; gy < 6; gy++) {
      for (let gx = 0; gx < 3; gx++) {
        if (gx === 1 || noise2(y + gx, gy + 3) > 0.45) {
          rect(ctx, PALETTE.glow, cx - 2 + gx * 2 - 1, y + gy, 1, 1, 0.85);
        }
      }
    }
  }
  rect(ctx, st.deep, cx - 3, 132, 1, 4); // rachadura
  rect(ctx, st.deep, cx - 2, 135, 1, 3);
  // Guarda: bloco central e duas asas de penas que afinam até uma ponta
  for (const side of [-1, 1] as const) {
    for (let j = 0; j < 30; j++) {
      const x = cx + side * (9 + j);
      const lift = Math.round(Math.sin((j / 30) * Math.PI) * 5);
      const top = 117 - lift + Math.round(j * 0.15);
      const bottom = 126 - Math.round(j * 0.22);
      for (let y = top; y < bottom; y++)
        paint(x, y, lightAt(x, y) + 0.22 - (j % 6 === 5 ? 0.18 : 0));
      rect(ctx, st.deep, x, bottom, 1, 1);
      rect(ctx, st.highlight, x, top, 1, 1);
    }
    disc(ctx, st.highlight, cx + side * 40, 121, 3);
    disc(ctx, st.deep, cx + side * 40, 121, 1);
  }
  rect(ctx, st.deep, cx - 10, 114, 20, 14);
  rect(ctx, st.light, cx - 9, 115, 18, 12);
  rect(ctx, st.highlight, cx - 9, 115, 18, 2);
  disc(ctx, st.deep, cx, 121, 5);
  disc(ctx, PALETTE.soul, cx, 121, 3);
  disc(ctx, PALETTE.playerAccent, cx - 1, 120, 1);
  // Punho enrolado em tiras e pomo com uma joia
  for (let y = 98; y < 114; y++) {
    rect(ctx, y % 3 === 0 ? st.deep : st.dark, cx - 2, y, 5, 1);
  }
  disc(ctx, st.highlight, cx, 95, 5);
  disc(ctx, st.deep, cx, 95, 3);
  disc(ctx, PALETTE.glow, cx, 95, 1);

  // --- Correntes soltas enroladas na lâmina e pendendo dos pulsos --------------------------------
  const link = mix(st.highlight, 0xffffff, 0.12);
  for (let y = 124; y < 176; y += 3) {
    const x = cx - 9 + Math.round(2 * Math.sin(y * 0.16));
    const horizontal = ((y - 124) / 3) % 2 === 0;
    rect(ctx, link, x, y, horizontal ? 3 : 2, horizontal ? 2 : 3);
    rect(ctx, st.deep, x + 1, y + 1, 1, 1);
  }
  for (let y = 124; y < 150; y += 3) {
    const x = cx + 8 + Math.round(2 * Math.sin(y * 0.2 + 2));
    rect(ctx, link, x, y, ((y - 124) / 3) % 2 === 0 ? 3 : 2, 2);
  }
  rect(ctx, link, cx + 9, 154, 3, 2); // elo caído
  rect(ctx, link, cx - 8, 182, 3, 2);

  // --- Braços, mãos e ombreiras ------------------------------------------------------------------
  for (const side of [-1, 1] as const) {
    for (let k = 0; k <= 44; k++) {
      const t = k / 44;
      const x = Math.round(cx + side * (30 - 22 * t));
      const y = Math.round(72 + 38 * t);
      for (let u = -8; u < 8; u++) {
        const round = 1 - Math.abs(u) / 8;
        paint(x + u, y, lightAt(x + u, y) + 0.04 + 0.2 * round * (side < 0 ? 1 : 0.8) - 0.1);
        paint(x + u, y + 1, lightAt(x + u, y + 1) + 0.2 * round - 0.1);
        paint(x + u, y + 2, lightAt(x + u, y + 2) + 0.2 * round - 0.1);
      }
      rect(ctx, st.deep, x - 9, y, 1, 3);
      rect(ctx, st.deep, x + 8, y, 1, 3);
      if (k % 9 === 4) rect(ctx, st.deep, x - 8, y, 16, 1); // tiras do braçal
    }
    for (let k = 28; k <= 44; k++) {
      const t = k / 44;
      const x = Math.round(cx + side * (30 - 22 * t));
      const y = Math.round(72 + 38 * t);
      rect(ctx, st.highlight, x - 6, y, 12, 1); // braçal de placa
    }
  }
  rect(ctx, st.deep, cx - 12, 105, 24, 13);
  for (let x = cx - 11; x < cx + 11; x++) {
    for (let y = 106; y < 117; y++) paint(x, y, lightAt(x, y) + 0.3 - Math.abs(y - 110) * 0.03);
  }
  for (const f of [-7, -3, 1, 5]) rect(ctx, st.deep, cx + f, 109, 1, 8); // dedos
  rect(ctx, st.highlight, cx - 11, 106, 22, 1);
  for (const side of [-1, 1] as const) {
    // Ombreiras: três placas sobrepostas, com espinho no alto
    for (let plate = 0; plate < 3; plate++) {
      const px = cx + side * 30;
      const py = 66 + plate * 6;
      const rx = 14 - plate * 2;
      const ry = 9 - plate;
      for (let y = py - ry; y <= py + ry; y++) {
        for (let x = px - rx; x <= px + rx; x++) {
          const d = ((x - px) / rx) ** 2 + ((y - py) / ry) ** 2;
          if (d > 1) continue;
          if (d > 0.8) rect(ctx, st.deep, x, y, 1, 1);
          else paint(x, y, lightAt(x, y) + 0.22 - plate * 0.06 - (y - py) * 0.02);
        }
      }
      rect(ctx, st.highlight, px - rx + 3, py - ry + 1, rx, 1);
    }
    for (let j = 0; j < 9; j++) {
      rect(
        ctx,
        st.light,
        cx + side * 32 - Math.max(0, 3 - Math.floor(j / 3)),
        58 - j,
        Math.max(1, 6 - Math.floor(j * 0.6)),
        1,
      );
    }
  }

  // --- Gorjal e a cabeça baixa sob o capuz ---------------------------------------------------------
  for (let y = 56; y < 66; y += 3) {
    rect(ctx, st.deep, cx - 14, y, 28, 1);
    for (let x = cx - 13; x < cx + 13; x++) paint(x, y + 1, lightAt(x, y) + 0.25);
  }
  for (let y = haloY - 22; y <= haloY + 22; y++) {
    const dy = (y - haloY) / 22;
    const half = Math.round(16 * Math.max(0, 1 - dy * dy) ** 0.6);
    if (half <= 0) continue;
    for (let x = cx - half; x < cx + half; x++) {
      const u = (x - cx) / half;
      const cloth = 0.05 * Math.sin(u * 7 + y * 0.12); // dobras do capuz
      paint(x, y, lightAt(x, y) + 0.22 + cloth - 0.1 * Math.abs(u));
    }
    rect(ctx, st.deep, cx - half - 1, y, 1, 1);
    rect(ctx, st.deep, cx + half, y, 1, 1);
  }
  // Rosto na sombra, com o contorno da boca e do queixo à luz da auréola
  for (let y = haloY - 4; y < haloY + 19; y++) {
    const dy = (y - (haloY + 7)) / 12;
    const half = Math.round(9 * Math.max(0, 1 - dy * dy) ** 0.5);
    for (let x = cx - half; x < cx + half; x++) paint(x, y, 0.1 + (y > haloY + 12 ? 0.22 : 0));
  }
  rect(ctx, st.highlight, cx - 6, haloY + 1, 12, 1, 0.8); // arco da sobrancelha
  rect(ctx, st.deep, cx - 6, haloY + 4, 4, 1); // olhos fechados
  rect(ctx, st.deep, cx + 2, haloY + 4, 4, 1);
  rect(ctx, st.base, cx - 6, haloY + 5, 3, 1);
  rect(ctx, st.base, cx + 3, haloY + 5, 3, 1);
  rect(ctx, st.dark, cx, haloY + 6, 1, 5); // nariz
  rect(ctx, st.light, cx + 1, haloY + 9, 1, 1);
  rect(ctx, st.deep, cx - 3, haloY + 14, 6, 1); // boca
  rect(ctx, st.highlight, cx - 4, haloY + 17, 8, 1, 0.9); // queixo
  rect(ctx, PALETTE.glow, cx - 5, haloY + 6, 1, 6, 0.95); // lágrima de luz
  rect(ctx, PALETTE.playerAccent, cx - 5, haloY + 7, 1, 2, 0.9);
  rect(ctx, PALETTE.glow, cx - 5, haloY + 14, 1, 1, 0.6);

  // --- Musgo, trepadeiras e rachaduras do bioma --------------------------------------------------------
  const mossAt = (x: number, y: number, n: number): void => {
    for (let i = 0; i < n; i++) {
      const mx = x + Math.floor(noise2(i, x) * 14) - 7;
      const my = y - Math.floor(noise2(i, y) * 6);
      rect(
        ctx,
        noise2(mx, my) > 0.5 ? look.moss : look.mossLight,
        mx,
        my,
        1 + Math.floor(noise2(my, mx) * 2),
        1,
      );
    }
  };
  mossAt(cx - 40, height - 18, 16);
  mossAt(cx + 38, height - 22, 14);
  mossAt(cx - 30, 62, 9);
  for (const [vx, vy, len] of [
    [cx + 23 + 70, leadingTop(70 / span) + 2, 26],
    [cx + 23 + 84, leadingTop(84 / span) + 2, 18],
    [cx - 24 - 86, leadingTop(86 / span) + 2, 14],
  ] as const) {
    for (let j = 0; j < len; j++) {
      const x = vx + Math.round(Math.sin(j * 0.5) * 1.5);
      rect(ctx, j % 4 === 0 ? look.mossLight : look.moss, x, vy + j, 1, 1);
      if (j % 5 === 2) rect(ctx, look.mossLight, x + 1, vy + j, 2, 1);
    }
  }
  const crack = (x0: number, y0: number, steps: number, seed: number): void => {
    let x = x0;
    let y = y0;
    for (let i = 0; i < steps; i++) {
      rect(ctx, st.deep, x, y, 1, 1);
      y += 1;
      x += noise2(seed, i) < 0.35 ? -1 : noise2(seed, i) > 0.65 ? 1 : 0;
    }
  };
  crack(cx + 12, 84, 22, 1);
  crack(cx - 16, 146, 26, 2);
  crack(cx + 6, 40, 12, 3);
  crack(cx + 22, 160, 30, 4);

  // --- Contorno: 1 px escuro em volta de toda a figura, para ela se destacar do fundo ----------------
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const opaque = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < width && y < height && (data[(y * width + x) * 4 + 3] ?? 0) > 0;
  const marks: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (opaque(x, y)) continue;
      if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) {
        marks.push((y * width + x) * 4);
      }
    }
  }
  const outline = look.back.deep;
  for (const i of marks) {
    data[i] = (outline >> 16) & 0xff;
    data[i + 1] = (outline >> 8) & 0xff;
    data[i + 2] = outline & 0xff;
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}
