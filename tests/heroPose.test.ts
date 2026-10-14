import { describe, expect, it } from 'vitest';
import {
  HERO_BASE_POSE,
  HERO_CELL,
  HERO_FRAMES,
  HERO_GEOMETRY,
  type HeroPose,
} from '../src/data/hero';
import { heroJoints, type HeroJoints, type Point } from '../src/logic/heroPose';

const geo = HERO_GEOMETRY;

const BASE = HERO_BASE_POSE;

function withPose(overrides: Partial<HeroPose>): HeroJoints {
  return heroJoints({ ...BASE, ...overrides }, geo);
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function allPoints(j: HeroJoints): Point[] {
  return [
    j.shoulderFront,
    j.shoulderBack,
    j.handFront,
    j.handBack,
    j.hipFront,
    j.hipBack,
    j.kneeFront,
    j.kneeBack,
    j.footFront,
    j.footBack,
    j.head,
    { x: j.head.x + geo.headW - 1, y: j.head.y + geo.headH - 1 },
    { x: geo.centerX, y: j.hipY },
    { x: geo.centerX, y: j.torsoTop },
  ];
}

describe('heroJoints', () => {
  it('pose neutra: quadril, tronco, ombros, cabeça e pés nos valores da geometria', () => {
    const j = withPose({});
    expect(j.hipY).toBe(geo.hipY);
    expect(j.torsoTop).toBe(geo.hipY - geo.torsoH);
    expect(j.shoulderFront).toEqual({
      x: geo.centerX + geo.shoulderFrontDX,
      y: geo.hipY - geo.torsoH + geo.shoulderDY,
    });
    expect(j.shoulderBack).toEqual({
      x: geo.centerX + geo.shoulderBackDX,
      y: geo.hipY - geo.torsoH + geo.shoulderDY,
    });
    expect(j.hipFront).toEqual({ x: geo.centerX + geo.hipFrontDX, y: geo.hipY });
    expect(j.hipBack).toEqual({ x: geo.centerX + geo.hipBackDX, y: geo.hipY });
    expect(j.head).toEqual({
      x: geo.centerX - geo.headW / 2,
      y: geo.hipY - geo.torsoH - geo.headH + 1,
    });
    expect(j.footFront).toEqual({ x: j.hipFront.x, y: geo.footY });
    expect(j.footBack).toEqual({ x: j.hipBack.x, y: geo.footY });
  });

  it('as mãos ficam a upperArm + foreArm do ombro para qualquer ângulo (±1 px de arredondamento)', () => {
    const reach = geo.upperArm + geo.foreArm;
    for (let i = 0; i < 24; i++) {
      const angle = -Math.PI + (i / 24) * Math.PI * 2 + 0.07;
      const j = withPose({ armFront: angle, armBack: angle + 0.4 });
      expect(Math.abs(dist(j.shoulderFront, j.handFront) - reach)).toBeLessThanOrEqual(1);
      expect(Math.abs(dist(j.shoulderBack, j.handBack) - reach)).toBeLessThanOrEqual(1);
    }
  });

  it('ângulo 0 aponta a mão para a frente e ângulo positivo para baixo', () => {
    const reach = geo.upperArm + geo.foreArm;
    const forward = withPose({ armFront: 0 });
    expect(forward.handFront).toEqual({
      x: forward.shoulderFront.x + reach,
      y: forward.shoulderFront.y,
    });
    const down = withPose({ armFront: Math.PI / 2 });
    expect(down.handFront).toEqual({
      x: down.shoulderFront.x,
      y: down.shoulderFront.y + reach,
    });
  });

  it('lean desloca ombros e cabeça no mesmo valor, sem mexer no quadril', () => {
    const a = withPose({});
    const b = withPose({ lean: 2 });
    expect(b.shoulderFront.x - a.shoulderFront.x).toBe(2);
    expect(b.shoulderBack.x - a.shoulderBack.x).toBe(2);
    expect(b.head.x - a.head.x).toBe(2);
    expect(b.head.y).toBe(a.head.y);
    expect(b.hipFront).toEqual(a.hipFront);
    expect(b.hipBack).toEqual(a.hipBack);
    const c = withPose({ lean: -2 });
    expect(c.head.x - a.head.x).toBe(-2);
  });

  it('bob sobe quadril, tronco, ombros e cabeça, mas os pés continuam no chão', () => {
    const a = withPose({});
    const b = withPose({ bob: 1 });
    expect(b.hipY).toBe(a.hipY - 1);
    expect(b.torsoTop).toBe(a.torsoTop - 1);
    expect(b.shoulderFront.y).toBe(a.shoulderFront.y - 1);
    expect(b.hipFront.y).toBe(a.hipFront.y - 1);
    expect(b.head.y).toBe(a.head.y - 1);
    expect(b.footFront.y).toBe(a.footFront.y);
    expect(b.footBack.y).toBe(a.footBack.y);
  });

  it('stride 1 e -1 espelham os pés em relação ao quadril', () => {
    const forward = withPose({ stride: 1 });
    const backward = withPose({ stride: -1 });
    const neutral = withPose({ stride: 0 });
    expect(forward.footFront.x - forward.hipFront.x).toBe(geo.strideReach);
    expect(backward.footFront.x - backward.hipFront.x).toBe(-geo.strideReach);
    expect(forward.footBack.x - forward.hipBack.x).toBe(-geo.strideReach);
    expect(backward.footBack.x - backward.hipBack.x).toBe(geo.strideReach);
    expect(forward.footFront.x - neutral.footFront.x).toBe(
      neutral.footFront.x - backward.footFront.x,
    );
    expect(forward.footBack.x - neutral.footBack.x).toBe(neutral.footBack.x - backward.footBack.x);
  });

  it('liftFront e liftBack sobem só o pé correspondente', () => {
    const a = withPose({});
    const b = withPose({ liftFront: 3 });
    expect(b.footFront.y).toBe(a.footFront.y - 3);
    expect(b.footBack.y).toBe(a.footBack.y);
    const c = withPose({ liftBack: 2 });
    expect(c.footBack.y).toBe(a.footBack.y - 2);
    expect(c.footFront.y).toBe(a.footFront.y);
  });

  it('jump usa jumpFeet e ignora stride e lift', () => {
    const j = withPose({ legs: 'jump', stride: 1, liftFront: 3, liftBack: 3 });
    expect(j.footFront).toEqual({
      x: j.hipFront.x + geo.jumpFeet.front.dx,
      y: geo.footY + geo.jumpFeet.front.dy,
    });
    expect(j.footBack).toEqual({
      x: j.hipBack.x + geo.jumpFeet.back.dx,
      y: geo.footY + geo.jumpFeet.back.dy,
    });
  });

  it('fall usa fallFeet e ignora stride e lift', () => {
    const j = withPose({ legs: 'fall', stride: -1, liftFront: 3, liftBack: 3 });
    expect(j.footFront).toEqual({
      x: j.hipFront.x + geo.fallFeet.front.dx,
      y: geo.footY + geo.fallFeet.front.dy,
    });
    expect(j.footBack).toEqual({
      x: j.hipBack.x + geo.fallFeet.back.dx,
      y: geo.footY + geo.fallFeet.back.dy,
    });
    const jump = withPose({ legs: 'jump' });
    expect(j.footFront).not.toEqual(jump.footFront);
  });

  it('o joelho avança kneeBend em relação ao meio da perna', () => {
    const j = withPose({ stride: 1 });
    expect(j.kneeFront.x).toBe(Math.round((j.hipFront.x + j.footFront.x) / 2 + geo.kneeBend));
    expect(j.kneeFront.y).toBe(Math.round((j.hipFront.y + j.footFront.y) / 2));
    expect(j.kneeBack.x).toBe(Math.round((j.hipBack.x + j.footBack.x) / 2 + geo.kneeBend));
    expect(j.kneeBack.y).toBe(Math.round((j.hipBack.y + j.footBack.y) / 2));

    // Perna reta (pé sob o quadril): o joelho fica kneeBend à frente da linha da perna.
    const straight = withPose({});
    expect(straight.kneeFront.x - straight.hipFront.x).toBe(geo.kneeBend);
  });

  it('todos os pontos são inteiros e nunca -0', () => {
    const j = withPose({ stride: 0.37, armFront: 0.123, armBack: -2.71, lean: 1, bob: 1 });
    for (const p of allPoints(j)) {
      expect(Number.isInteger(p.x)).toBe(true);
      expect(Number.isInteger(p.y)).toBe(true);
      expect(Object.is(p.x, -0)).toBe(false);
      expect(Object.is(p.y, -0)).toBe(false);
    }
  });

  describe('poses dentro do quadro', () => {
    function expectInsideFrame(j: HeroJoints): void {
      for (const p of allPoints(j)) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(HERO_CELL - 1);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(HERO_CELL - 1);
      }
    }

    it('a pose neutra cabe no quadro 32x32', () => {
      expectInsideFrame(withPose({}));
    });

    const checkable = HERO_FRAMES.filter((f) => f.pose.rotation === 0 && !f.pose.tuck);

    it('há quadros reais para conferir', () => {
      expect(checkable.length).toBeGreaterThan(0);
    });

    it.each(checkable.map((f) => [f.name, f.pose] as const))(
      'o quadro %s cabe no quadro 32x32',
      (_name, pose) => {
        expectInsideFrame(heroJoints(pose, geo));
      },
    );
  });
});
