import type { HeroGeometry, HeroPose } from '../data/hero';

export interface Point {
  x: number;
  y: number;
}

/** Juntas do esqueleto para uma pose, em pixels do quadro (herói olhando para a direita; y para baixo). */
export interface HeroJoints {
  /** y do quadril. */
  hipY: number;
  /** y do topo do tronco. */
  torsoTop: number;
  shoulderFront: Point;
  shoulderBack: Point;
  handFront: Point;
  handBack: Point;
  hipFront: Point;
  hipBack: Point;
  kneeFront: Point;
  kneeBack: Point;
  footFront: Point;
  footBack: Point;
  /** Canto superior esquerdo da cabeça (largura geo.headW, altura geo.headH). */
  head: Point;
}

/** Arredonda para inteiro; o "+ 0" troca -0 por 0 (Math.round(-0.3) dá -0). */
function r(value: number): number {
  return Math.round(value) + 0;
}

function point(x: number, y: number): Point {
  return { x: r(x), y: r(y) };
}

/**
 * Calcula as juntas de uma pose. Roda só ao gerar as texturas (não por frame), então
 * pode criar objetos. Todos os pontos saem arredondados para inteiros.
 */
export function heroJoints(pose: HeroPose, geo: HeroGeometry): HeroJoints {
  const hipY = geo.hipY - pose.bob;
  const torsoTop = hipY - geo.torsoH;

  const shoulderY = torsoTop + geo.shoulderDY;
  const shoulderFrontX = geo.centerX + geo.shoulderFrontDX + pose.lean;
  const shoulderBackX = geo.centerX + geo.shoulderBackDX + pose.lean;
  const armLen = geo.upperArm + geo.foreArm;

  const hipFrontX = geo.centerX + geo.hipFrontDX;
  const hipBackX = geo.centerX + geo.hipBackDX;

  let footFrontX: number;
  let footFrontY: number;
  let footBackX: number;
  let footBackY: number;
  if (pose.legs === 'walk') {
    footFrontX = hipFrontX + pose.stride * geo.strideReach;
    footFrontY = geo.footY - pose.liftFront;
    footBackX = hipBackX - pose.stride * geo.strideReach;
    footBackY = geo.footY - pose.liftBack;
  } else {
    const feet =
      pose.legs === 'jump' ? geo.jumpFeet : pose.legs === 'tuck' ? geo.tuckFeet : geo.fallFeet;
    footFrontX = hipFrontX + feet.front.dx;
    footFrontY = geo.footY + feet.front.dy;
    footBackX = hipBackX + feet.back.dx;
    footBackY = geo.footY + feet.back.dy;
  }

  const handFrontX = shoulderFrontX + Math.cos(pose.armFront) * armLen;
  const handFrontY = shoulderY + Math.sin(pose.armFront) * armLen;
  let handBackX = shoulderBackX + Math.cos(pose.armBack) * armLen;
  let handBackY = shoulderY + Math.sin(pose.armBack) * armLen;
  if (pose.backHold !== undefined && pose.weaponAngle !== undefined) {
    // Duas mãos: a de trás vai ao ponto do cabo que o ângulo da arma indica, até onde o braço alcança
    const targetX = handFrontX + Math.sin(pose.weaponAngle) * pose.backHold;
    const targetY = handFrontY - Math.cos(pose.weaponAngle) * pose.backHold;
    const reach = Math.hypot(targetX - shoulderBackX, targetY - shoulderY);
    const scale = reach > armLen ? armLen / reach : 1;
    handBackX = shoulderBackX + (targetX - shoulderBackX) * scale;
    handBackY = shoulderY + (targetY - shoulderY) * scale;
  }

  return {
    hipY: r(hipY),
    torsoTop: r(torsoTop),
    shoulderFront: point(shoulderFrontX, shoulderY),
    shoulderBack: point(shoulderBackX, shoulderY),
    handFront: point(handFrontX, handFrontY),
    handBack: point(handBackX, handBackY),
    hipFront: point(hipFrontX, hipY),
    hipBack: point(hipBackX, hipY),
    kneeFront: point((hipFrontX + footFrontX) / 2 + geo.kneeBend, (hipY + footFrontY) / 2),
    kneeBack: point((hipBackX + footBackX) / 2 + geo.kneeBend, (hipY + footBackY) / 2),
    footFront: point(footFrontX, footFrontY),
    footBack: point(footBackX, footBackY),
    head: point(geo.centerX - geo.headW / 2 + pose.lean, torsoTop - geo.headH + 1),
  };
}
