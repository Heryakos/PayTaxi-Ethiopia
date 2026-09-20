import { canTransition } from '../services/fares';

describe('canTransition()', () => {
  // ---- Valid (allowed) transitions ----
  test('PENDING -> SUCCESS is allowed', () => {
    expect(canTransition('PENDING', 'SUCCESS')).toBe(true);
  });
  test('PENDING -> FAILED is allowed', () => {
    expect(canTransition('PENDING', 'FAILED')).toBe(true);
  });
  test('PENDING -> REFUNDED is allowed', () => {
    expect(canTransition('PENDING', 'REFUNDED')).toBe(true);
  });
  test('PENDING -> UNKNOWN is allowed', () => {
    expect(canTransition('PENDING', 'UNKNOWN')).toBe(true);
  });
  test('SUCCESS -> REFUNDED is allowed', () => {
    expect(canTransition('SUCCESS', 'REFUNDED')).toBe(true);
  });
  test('UNKNOWN -> SUCCESS is allowed', () => {
    expect(canTransition('UNKNOWN', 'SUCCESS')).toBe(true);
  });
  test('UNKNOWN -> FAILED is allowed', () => {
    expect(canTransition('UNKNOWN', 'FAILED')).toBe(true);
  });
  test('UNKNOWN -> REFUNDED is allowed', () => {
    expect(canTransition('UNKNOWN', 'REFUNDED')).toBe(true);
  });

  // ---- Invalid (blocked) transitions ----
  test('FAILED -> SUCCESS is blocked (terminal)', () => {
    expect(canTransition('FAILED', 'SUCCESS')).toBe(false);
  });
  test('FAILED -> REFUNDED is blocked (terminal)', () => {
    expect(canTransition('FAILED', 'REFUNDED')).toBe(false);
  });
  test('REFUNDED -> SUCCESS is blocked (terminal)', () => {
    expect(canTransition('REFUNDED', 'SUCCESS')).toBe(false);
  });
  test('SUCCESS -> PENDING is blocked (no backward)', () => {
    expect(canTransition('SUCCESS', 'PENDING')).toBe(false);
  });
  test('SUCCESS -> FAILED is blocked', () => {
    expect(canTransition('SUCCESS', 'FAILED')).toBe(false);
  });
  test('PENDING -> PENDING (same state) is blocked', () => {
    expect(canTransition('PENDING', 'PENDING')).toBe(false);
  });
  test('SUCCESS -> SUCCESS (same state) is blocked', () => {
    expect(canTransition('SUCCESS', 'SUCCESS')).toBe(false);
  });
  test('unknown state returns false', () => {
    expect(canTransition('INVALID_STATE', 'SUCCESS')).toBe(false);
  });
});
