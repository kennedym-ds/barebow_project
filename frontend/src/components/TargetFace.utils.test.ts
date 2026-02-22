import { describe, expect, it } from 'vitest';
import { computeResponsiveTargetSize, mapPixelToData } from './TargetFace.utils';

describe('TargetFace utils', () => {
  it('maps center pixel to target center', () => {
    const { dataX, dataY } = mapPixelToData(150, 150, 300, 300, 6);
    expect(dataX).toBeCloseTo(0, 5);
    expect(dataY).toBeCloseTo(0, 5);
  });

  it('maps top-left pixel to (+/-) max bounds', () => {
    const { dataX, dataY } = mapPixelToData(0, 0, 300, 300, 5);
    expect(dataX).toBeCloseTo(-5, 5);
    expect(dataY).toBeCloseTo(5, 5);
  });

  it('keeps desktop responsive size equal to container width', () => {
    const size = computeResponsiveTargetSize(620, 1280, 900, false);
    expect(size).toBe(620);
  });

  it('caps mobile responsive size to preserve control area', () => {
    const size = computeResponsiveTargetSize(420, 390, 740, true);
    expect(size).toBeLessThanOrEqual(390);
    expect(size).toBeGreaterThanOrEqual(220);
  });
});
