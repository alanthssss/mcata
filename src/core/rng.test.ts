import { describe, it, expect } from 'vitest';
import { createRng } from './rng';

describe('createRng', () => {
  it('produces values in [0, 1)', () => {
    const rng = createRng(42);
    for (let i = 0; i < 20; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic for the same seed', () => {
    const r1 = createRng(123);
    const r2 = createRng(123);
    for (let i = 0; i < 10; i++) {
      expect(r1.next()).toBe(r2.next());
    }
  });

  it('produces different sequences for different seeds', () => {
    const r1 = createRng(1);
    const r2 = createRng(2);
    const seq1 = Array.from({ length: 5 }, () => r1.next());
    const seq2 = Array.from({ length: 5 }, () => r2.next());
    expect(seq1).not.toEqual(seq2);
  });

  it('seed 0 is treated as 1 (non-zero state)', () => {
    const r0 = createRng(0);
    const r1 = createRng(1);
    expect(r0.next()).toBe(r1.next());
  });

  describe('nextInt', () => {
    it('returns values within [min, max]', () => {
      const rng = createRng(7);
      for (let i = 0; i < 100; i++) {
        const v = rng.nextInt(3, 7);
        expect(v).toBeGreaterThanOrEqual(3);
        expect(v).toBeLessThanOrEqual(7);
      }
    });

    it('returns min when min === max', () => {
      const rng = createRng(7);
      expect(rng.nextInt(5, 5)).toBe(5);
    });
  });

  describe('pick', () => {
    it('returns an element from the array', () => {
      const rng = createRng(99);
      const arr = [10, 20, 30, 40, 50];
      for (let i = 0; i < 20; i++) {
        expect(arr).toContain(rng.pick(arr));
      }
    });

    it('is deterministic', () => {
      const arr = ['a', 'b', 'c'];
      const r1 = createRng(5);
      const r2 = createRng(5);
      expect(r1.pick(arr)).toBe(r2.pick(arr));
    });
  });

  describe('shuffle', () => {
    it('returns an array with the same elements', () => {
      const rng = createRng(11);
      const arr = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle(arr);
      expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('does not mutate the original array', () => {
      const rng = createRng(11);
      const arr = [1, 2, 3, 4, 5];
      rng.shuffle(arr);
      expect(arr).toEqual([1, 2, 3, 4, 5]);
    });

    it('is deterministic', () => {
      const arr = [1, 2, 3, 4, 5];
      const r1 = createRng(22);
      const r2 = createRng(22);
      expect(r1.shuffle(arr)).toEqual(r2.shuffle(arr));
    });
  });
});
