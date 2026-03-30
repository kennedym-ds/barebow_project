import { describe, expect, it } from 'vitest';
import { getRingScore, getFlintScore, isXRing } from './scoring';

// ── WA getRingScore ───────────────────────────────────────────────────────────

describe('getRingScore (WA, no arrow diameter)', () => {
  // 40cm face: ring_width = 2cm; rings 1-10 span 0-20cm from centre
  const face = 40;

  it('scores 10 at the centre', () => {
    expect(getRingScore(0, face)).toBe(10);
  });

  it('scores 10 at the inner 10-ring boundary (< ringWidth)', () => {
    expect(getRingScore(1.99, face)).toBe(10);
  });

  it('scores 10 exactly on the 10-ring boundary (= ringWidth = 2cm)', () => {
    // ceil(2/2) = 1 → 10
    expect(getRingScore(2, face)).toBe(10);
  });

  it('scores 9 just inside the 9-ring', () => {
    // ceil(2.01/2) = 2 → 11-2 = 9
    expect(getRingScore(2.01, face)).toBe(9);
  });

  it('scores 9 at its outer boundary (4cm)', () => {
    expect(getRingScore(4, face)).toBe(9);
  });

  it('scores 1 at the outermost ring boundary (20cm)', () => {
    expect(getRingScore(20, face)).toBe(1);
  });

  it('scores 0 (miss) just outside the outermost ring', () => {
    expect(getRingScore(20.01, face)).toBe(0);
  });

  it('returns 0 for negative radius', () => {
    expect(getRingScore(-1, face)).toBe(0);
  });
});

describe('getRingScore — X=11 flag', () => {
  const face = 40; // ring_width = 2cm; X threshold = 1cm

  it('returns 10 at centre when xIs11 is false', () => {
    expect(getRingScore(0, face, false)).toBe(10);
  });

  it('returns 11 at centre when xIs11 is true', () => {
    expect(getRingScore(0, face, true)).toBe(11);
  });

  it('returns 11 at X-ring boundary (0.99cm) when xIs11 is true', () => {
    expect(getRingScore(0.99, face, true)).toBe(11);
  });

  it('returns 10 just outside X-ring (1.01cm) when xIs11 is true', () => {
    expect(getRingScore(1.01, face, true)).toBe(10);
  });
});

describe('getRingScore — line-break rule (arrowDiameterMm)', () => {
  const face = 40; // ring_width = 2cm

  it('line-break promotes 9 to 10 when shaft straddles the ring boundary', () => {
    // Arrow centre at 2.3cm, shaft diameter 9.3mm (radius 0.465cm)
    // effective = 2.3 - 0.465 = 1.835 → ceil(1.835/2) = 1 → score 10
    expect(getRingScore(2.3, face, false, 9.3)).toBe(10);
  });

  it('no promotion when arrow is fully inside ring (no boundary straddle)', () => {
    // Arrow centre at 1.0cm, shaft diameter 9.3mm
    // effective = max(0, 1.0 - 0.465) = 0.535 → ceil(0.535/2) = 1 → score 10 anyway
    expect(getRingScore(1.0, face, false, 9.3)).toBe(10);
  });

  it('line-break at miss boundary promotes 0 to 1', () => {
    // Arrow centre at 20.3cm, shaft diameter 9.3mm
    // effective = 20.3 - 0.465 = 19.835 → ceil(19.835/2) = 10 → score 1
    expect(getRingScore(20.3, face, false, 9.3)).toBe(1);
  });

  it('effective radius is clamped to 0 when arrow overlaps centre', () => {
    expect(getRingScore(0.2, face, false, 9.3)).toBe(10);
  });
});

// ── getFlintScore ─────────────────────────────────────────────────────────────

describe('getFlintScore (IFAA Flint)', () => {
  // 35cm face: r5=3.5, r4=7, r3=10.5
  const face = 35;

  it('scores 5 at centre', () => {
    expect(getFlintScore(0, face)).toBe(5);
  });

  it('scores 5 at inner boundary (3.5cm)', () => {
    expect(getFlintScore(3.5, face)).toBe(5);
  });

  it('scores 4 just outside 5-ring (3.51cm)', () => {
    expect(getFlintScore(3.51, face)).toBe(4);
  });

  it('scores 4 at 4-ring boundary (7cm)', () => {
    expect(getFlintScore(7, face)).toBe(4);
  });

  it('scores 3 just outside 4-ring (7.01cm)', () => {
    expect(getFlintScore(7.01, face)).toBe(3);
  });

  it('scores 3 at outer boundary (10.5cm)', () => {
    expect(getFlintScore(10.5, face)).toBe(3);
  });

  it('scores 0 (miss) outside all rings', () => {
    expect(getFlintScore(10.51, face)).toBe(0);
  });

  it('line-break promotes 0 to 3', () => {
    // centre at 10.9cm, shaft diameter 9.3mm (radius 0.465cm)
    // effective = 10.9 - 0.465 = 10.435 ≤ 10.5 → score 3
    expect(getFlintScore(10.9, face, 9.3)).toBe(3);
  });
});

// ── isXRing ───────────────────────────────────────────────────────────────────

describe('isXRing', () => {
  // WA 40cm face: X threshold = ring_width/2 = 1cm
  it('WA: true at centre', () => {
    expect(isXRing(0, 40, 'WA')).toBe(true);
  });

  it('WA: true at threshold (1cm)', () => {
    expect(isXRing(1, 40, 'WA')).toBe(true);
  });

  it('WA: false just outside threshold (1.01cm)', () => {
    expect(isXRing(1.01, 40, 'WA')).toBe(false);
  });

  it('WA: line-break shifts effective radius into X-ring', () => {
    // centre at 1.3cm, shaft 9.3mm → effective = 1.3 - 0.465 = 0.835 ≤ 1
    expect(isXRing(1.3, 40, 'WA', 9.3)).toBe(true);
  });

  // Flint 35cm face: X threshold = r5 * 0.5 = 1.75cm
  it('Flint: true at centre', () => {
    expect(isXRing(0, 35, 'Flint')).toBe(true);
  });

  it('Flint: true at threshold (1.75cm)', () => {
    expect(isXRing(1.75, 35, 'Flint')).toBe(true);
  });

  it('Flint: false just outside threshold (1.76cm)', () => {
    expect(isXRing(1.76, 35, 'Flint')).toBe(false);
  });
});
