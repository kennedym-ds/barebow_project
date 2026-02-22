export function mapPixelToData(
  pixelX: number,
  pixelY: number,
  width: number,
  height: number,
  maxR: number,
) {
  return {
    dataX: -maxR + (2 * maxR * pixelX) / width,
    dataY: maxR - (2 * maxR * pixelY) / height,
  };
}

export function computeResponsiveTargetSize(
  containerWidth: number,
  viewportWidth: number,
  viewportHeight: number,
  isMobile: boolean,
) {
  if (containerWidth <= 0) return 0;
  if (!isMobile) return containerWidth;

  // Reserve predictable space for score/quiver/save controls + safe interaction margin
  const reservedControlsPx = Math.min(300, Math.max(200, viewportHeight * 0.34));
  const verticalPaddingPx = 28;
  const maxByHeight = Math.max(220, viewportHeight - reservedControlsPx - verticalPaddingPx);
  const maxByWidth = Math.max(220, Math.min(containerWidth, viewportWidth - 8));
  return Math.min(maxByWidth, maxByHeight);
}
