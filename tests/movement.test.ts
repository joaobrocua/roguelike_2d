import { describe, expect, it } from 'vitest';
import { createJumpState, resetJump, updateJump, type JumpConfig } from '../src/logic/movement';

const cfg: JumpConfig = { coyoteTimeMs: 100, jumpBufferMs: 120 };

describe('createJumpState', () => {
  it('começa com tudo zerado', () => {
    expect(createJumpState()).toEqual({ coyoteMs: 0, bufferMs: 0 });
  });
});

describe('updateJump', () => {
  it('pula normalmente no chão', () => {
    const s = createJumpState();
    expect(updateJump(s, 16, true, true, cfg)).toBe(true);
  });

  it('não pula sem apertar o botão', () => {
    const s = createJumpState();
    expect(updateJump(s, 16, true, false, cfg)).toBe(false);
  });

  it('coyote: pula dentro da janela depois de sair do chão', () => {
    const s = createJumpState();
    updateJump(s, 16, true, false, cfg); // no chão
    updateJump(s, 50, false, false, cfg); // saiu: restam 50ms
    expect(updateJump(s, 40, false, true, cfg)).toBe(true); // restam 10ms
  });

  it('coyote: não pula depois que a janela fecha', () => {
    const s = createJumpState();
    updateJump(s, 16, true, false, cfg);
    updateJump(s, 60, false, false, cfg);
    updateJump(s, 60, false, false, cfg); // 120ms no ar > 100ms
    expect(s.coyoteMs).toBe(0);
    expect(updateJump(s, 16, false, true, cfg)).toBe(false);
  });

  it('coyote: na borda exata da janela (0ms restantes) não pula', () => {
    const s = createJumpState();
    updateJump(s, 16, true, false, cfg);
    expect(updateJump(s, 100, false, true, cfg)).toBe(false);
  });

  it('buffer: aperta antes de pousar e pula ao pousar', () => {
    const s = createJumpState();
    expect(updateJump(s, 16, false, true, cfg)).toBe(false); // apertou no ar
    expect(updateJump(s, 50, false, false, cfg)).toBe(false);
    expect(updateJump(s, 16, true, false, cfg)).toBe(true); // pousou com buffer vivo
  });

  it('buffer expirado não pula', () => {
    const s = createJumpState();
    updateJump(s, 16, false, true, cfg);
    updateJump(s, 100, false, false, cfg);
    updateJump(s, 100, false, false, cfg); // 200ms > 120ms
    expect(s.bufferMs).toBe(0);
    expect(updateJump(s, 16, true, false, cfg)).toBe(false);
  });

  it('sem pulo duplo: coyote e buffer são consumidos ao pular', () => {
    const s = createJumpState();
    expect(updateJump(s, 16, true, true, cfg)).toBe(true);
    expect(s).toEqual({ coyoteMs: 0, bufferMs: 0 });
    // Saiu do chão logo após o pulo e aperta de novo: o coyote não pode reviver.
    expect(updateJump(s, 16, false, true, cfg)).toBe(false);
  });

  it('sem pulo duplo: segurar o botão no ar não dispara de novo', () => {
    const s = createJumpState();
    expect(updateJump(s, 16, true, true, cfg)).toBe(true);
    expect(updateJump(s, 16, false, false, cfg)).toBe(false);
    expect(updateJump(s, 16, false, false, cfg)).toBe(false);
  });

  it('muta o estado recebido', () => {
    const s = createJumpState();
    updateJump(s, 16, true, false, cfg);
    expect(s.coyoteMs).toBe(100);
    updateJump(s, 30, false, true, cfg); // pula (consome) – confere o reset
    expect(s.coyoteMs).toBe(0);
  });
});

describe('resetJump', () => {
  it('fecha coyote e buffer, evitando pulo fantasma depois da rolagem', () => {
    const state = { coyoteMs: 100, bufferMs: 110 };
    resetJump(state);
    expect(state).toEqual({ coyoteMs: 0, bufferMs: 0 });
    // Mesmo no chão e sem apertar nada, não dispara pulo
    expect(updateJump(state, 16, true, false, cfg)).toBe(false);
  });
});
