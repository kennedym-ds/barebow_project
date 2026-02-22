import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout, Shape } from 'plotly.js';
import { getRingScore, getFlintScore } from '../utils/scoring';
import { mapPixelToData, computeResponsiveTargetSize } from './TargetFace.utils';
import { useMobileLayout } from '../hooks/useMobileLayout';

interface Centroid {
  x: number;
  y: number;
  label: string;
  color: string;
}

interface TargetFaceProps {
  faceSizeCm: number;
  faceType: 'WA' | 'Flint';
  shots?: Array<{ 
    x: number; 
    y: number; 
    score: number; 
    arrow_number?: number; 
    color?: string;
  }>;
  onPlotClick?: (x: number, y: number) => void;
  showMedianCenter?: boolean;
  width?: number;
  height?: number;
  interactive?: boolean;
  /** Arrow shaft outer diameter in mm — used for hover preview and line-break display */
  shaftDiameterMm?: number;
  /** Whether X-ring scores as 11 (WA scoring option) */
  xIs11?: boolean;
  /** Opacity for shot dot markers (0–1). Default 1. */
  markerOpacity?: number;
  /** Centre-of-mass markers rendered as × symbols */
  centroids?: Centroid[];
  /** Extra Plotly traces (e.g. heatmap contours) injected before shot markers */
  extraTraces?: Data[];
  /** If true, auto-size to container width (overrides width/height props) */
  responsive?: boolean;
}

export default function TargetFace({
  faceSizeCm,
  faceType,
  shots = [],
  onPlotClick,
  showMedianCenter = false,
  width = 600,
  height = 600,
  interactive = true,
  shaftDiameterMm = 0,
  xIs11 = false,
  markerOpacity = 1,
  centroids = [],
  extraTraces = [],
  responsive = false,
}: TargetFaceProps) {
  // Auto-size to container while reserving room for mobile controls below target
  const containerRef = useRef<HTMLDivElement>(null);
  const suppressClickRef = useRef(false);
  const [autoSize, setAutoSize] = useState<number>(width);
  const { isMobile: isMobileViewport, width: windowWidth, height: windowHeight } = useMobileLayout();
  const [zoomEnabled, setZoomEnabled] = useState<boolean>(true);
  const [touchActive, setTouchActive] = useState<boolean>(false);

  useEffect(() => {
    if (!responsive) return;
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) {
        setAutoSize(
          computeResponsiveTargetSize(w, windowWidth, windowHeight, isMobileViewport),
        );
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Also re-measure when orientation changes (affects vh)
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [responsive, windowWidth, windowHeight, isMobileViewport]);

  const resolvedSize = responsive ? autoSize : width;
  const resolvedHeight = responsive ? autoSize : height;
  const { shapes, maxR } = useMemo(() => {
    const shapes: Partial<Shape>[] = [];
    let maxR: number;

    if (faceType === 'Flint') {
      // IFAA Flint: Black (5), White (4), Black (3)
      const r5 = (faceSizeCm * 0.2) / 2;
      const r4 = (faceSizeCm * 0.4) / 2;
      const r3 = (faceSizeCm * 0.6) / 2;

      shapes.push({
        type: 'circle',
        x0: -r3, y0: -r3, x1: r3, y1: r3,
        fillcolor: 'black',
        line: { color: 'black' },
        layer: 'below',
      });
      shapes.push({
        type: 'circle',
        x0: -r4, y0: -r4, x1: r4, y1: r4,
        fillcolor: 'white',
        line: { color: 'black' },
        layer: 'below',
      });
      shapes.push({
        type: 'circle',
        x0: -r5, y0: -r5, x1: r5, y1: r5,
        fillcolor: 'black',
        line: { color: 'white' },
        layer: 'below',
      });

      // X-ring indicator
      const rx = r5 * 0.5;
      shapes.push({
        type: 'circle',
        x0: -rx, y0: -rx, x1: rx, y1: rx,
        line: { color: 'white' },
        layer: 'below',
      });

      maxR = r3 * 1.1;
    } else {
      // WA Target
      const colors = [
        '#FFFF00', '#FFFF00', // 10, 9 (yellow)
        '#FF0000', '#FF0000', // 8, 7 (red)
        '#0000FF', '#0000FF', // 6, 5 (blue)
        '#000000', '#000000', // 4, 3 (black)
        '#FFFFFF', '#FFFFFF', // 2, 1 (white)
      ];

      const ringWidth = faceSizeCm / 20;

      // Draw rings from outside in (1 to 10)
      for (let i = 10; i >= 1; i--) {
        const radius = i * ringWidth;
        const color = colors[i - 1];

        shapes.push({
          type: 'circle',
          x0: -radius, y0: -radius, x1: radius, y1: radius,
          fillcolor: color,
          line: { color: '#D3D3D3', width: 1 },
          layer: 'below',
        });
      }

      // X-ring boundary
      const xRadius = 0.5 * ringWidth;
      shapes.push({
        type: 'circle',
        x0: -xRadius, y0: -xRadius, x1: xRadius, y1: xRadius,
        line: { color: '#D3D3D3', width: 1 },
        layer: 'below',
      });

      maxR = (faceSizeCm / 2) * 1.05;
    }

    return { shapes, maxR };
  }, [faceSizeCm, faceType]);

  // Click handler using overlay div — much more reliable than invisible heatmap
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onPlotClick || !interactive) return;
      if (suppressClickRef.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pixelX = e.clientX - rect.left;
      const pixelY = e.clientY - rect.top;
      const { dataX, dataY } = mapPixelToData(pixelX, pixelY, resolvedSize, resolvedHeight, maxR);
      onPlotClick(dataX, dataY);
    },
    [onPlotClick, interactive, maxR, resolvedSize, resolvedHeight],
  );

  // Hover preview state: show arrow circle + predicted score at cursor
  const [hover, setHover] = useState<{ px: number; py: number; dataX: number; dataY: number } | null>(null);

  const handleOverlayMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const { dataX, dataY } = mapPixelToData(px, py, resolvedSize, resolvedHeight, maxR);
      setHover({ px, py, dataX, dataY });
    },
    [interactive, maxR, resolvedSize, resolvedHeight],
  );

  const handleOverlayLeave = useCallback(() => setHover(null), []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!interactive || !onPlotClick) return;
      const touch = e.touches[0];
      if (!touch) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const px = touch.clientX - rect.left;
      const py = touch.clientY - rect.top;
      const { dataX, dataY } = mapPixelToData(px, py, resolvedSize, resolvedHeight, maxR);
      setTouchActive(true);
      setHover({ px, py, dataX, dataY });
    },
    [interactive, onPlotClick, resolvedSize, resolvedHeight, maxR],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!interactive || !touchActive) return;
      const touch = e.touches[0];
      if (!touch) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const px = touch.clientX - rect.left;
      const py = touch.clientY - rect.top;
      const { dataX, dataY } = mapPixelToData(px, py, resolvedSize, resolvedHeight, maxR);
      setHover({ px, py, dataX, dataY });
    },
    [interactive, touchActive, resolvedSize, resolvedHeight, maxR],
  );

  const handleTouchEnd = useCallback(() => {
    if (!interactive || !onPlotClick) return;
    if (hover) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 250);
      onPlotClick(hover.dataX, hover.dataY);
    }
    setTouchActive(false);
    setHover(null);
  }, [interactive, onPlotClick, hover]);

  // Preview score computed from hover position
  const hoverScore = useMemo(() => {
    if (!hover) return null;
    const r = Math.sqrt(hover.dataX ** 2 + hover.dataY ** 2);
    return faceType === 'Flint'
      ? getFlintScore(r, faceSizeCm, shaftDiameterMm)
      : getRingScore(r, faceSizeCm, xIs11, shaftDiameterMm);
  }, [hover, faceSizeCm, faceType, shaftDiameterMm, xIs11]);

  // Arrow circle radius in pixels (for hover indicator)
  const arrowRadiusPx = useMemo(() => {
    if (shaftDiameterMm <= 0) return 0;
    const radiusCm = (shaftDiameterMm / 10) / 2;
    return (radiusCm / (2 * maxR)) * resolvedSize;
  }, [shaftDiameterMm, maxR, resolvedSize]);

  const traces = useMemo(() => {
    const data: Data[] = [];

    // Extra traces (heatmap contours etc.) go behind shot markers
    data.push(...extraTraces);

    // Shot markers
    if (shots.length > 0) {
      data.push({
        type: 'scatter',
        x: shots.map(s => s.x),
        y: shots.map(s => s.y),
        mode: 'text+markers' as const,
        marker: {
          color: shots.map(s => s.color || '#00FF00'),
          size: 18,
          opacity: markerOpacity,
          line: { color: 'black', width: 1 },
        },
        text: shots.map(s => s.arrow_number?.toString() || ''),
        textfont: { color: 'black', size: 11 },
        textposition: 'middle center' as const,
        hovertext: shots.map(s => `Arrow #${s.arrow_number || '?'}: ${s.score}`),
        hoverinfo: 'text',
      } as Data);
    }

    // Centroid markers (centre of mass per arrow group)
    if (centroids.length > 0) {
      data.push({
        type: 'scatter',
        x: centroids.map(c => c.x),
        y: centroids.map(c => c.y),
        mode: 'text+markers' as const,
        marker: {
          symbol: 'x' as const,
          color: centroids.map(c => c.color),
          size: 16,
          line: { color: 'black', width: 2 },
        },
        text: centroids.map(c => c.label),
        textfont: { color: 'black', size: 10 },
        textposition: 'top center' as const,
        hovertext: centroids.map(c => `${c.label} centre`),
        hoverinfo: 'text',
      } as Data);
    }

    // Median center
    if (showMedianCenter && shots.length > 0) {
      const medianX = [...shots].map(s => s.x).sort((a, b) => a - b)[Math.floor(shots.length / 2)];
      const medianY = [...shots].map(s => s.y).sort((a, b) => a - b)[Math.floor(shots.length / 2)];

      data.push({
        type: 'scatter',
        x: [medianX],
        y: [medianY],
        mode: 'markers' as const,
        marker: {
          symbol: 'cross' as const,
          color: 'red',
          size: 25,
          line: { color: 'black', width: 3 },
        },
        hoverinfo: 'name',
        name: 'Group Center (Median)',
      } as Data);
    }

    return data;
  }, [shots, showMedianCenter, markerOpacity, centroids, extraTraces]);

  const zoomRange = useMemo(() => maxR * 0.24, [maxR]);

  const zoomLayout: Partial<Layout> = useMemo(() => {
    if (!hover) return {};

    return {
      shapes,
      xaxis: {
        range: [hover.dataX - zoomRange, hover.dataX + zoomRange],
        showgrid: false,
        zeroline: false,
        visible: false,
      },
      yaxis: {
        range: [hover.dataY - zoomRange, hover.dataY + zoomRange],
        showgrid: false,
        zeroline: false,
        visible: false,
        scaleanchor: 'x',
        scaleratio: 1,
      },
      width: 190,
      height: 190,
      margin: { l: 0, r: 0, t: 0, b: 0 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      dragmode: false,
      showlegend: false,
    };
  }, [hover, shapes, zoomRange]);

  const layout: Partial<Layout> = useMemo(() => ({
    shapes,
    xaxis: {
      range: [-maxR, maxR],
      showgrid: false,
      zeroline: false,
      visible: false,
    },
    yaxis: {
      range: [-maxR, maxR],
      showgrid: false,
      zeroline: false,
      visible: false,
      scaleanchor: 'x',
      scaleratio: 1,
    },
    width: resolvedSize,
    height: resolvedHeight,
    margin: { l: 0, r: 0, t: 0, b: 0 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    dragmode: false,
    clickmode: 'event',
    showlegend: false,
  }), [shapes, maxR, resolvedSize, resolvedHeight]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: responsive ? '100%' : resolvedSize, height: resolvedHeight }}>
      <Plot
        data={traces}
        layout={layout}
        config={{ 
          displayModeBar: false, 
          staticPlot: true,
        }}
        style={{ width: resolvedSize, height: resolvedHeight }}
      />
      {interactive && (
        <div
          onClick={handleOverlayClick}
          onMouseMove={handleOverlayMove}
          onMouseLeave={handleOverlayLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            cursor: 'crosshair',
            touchAction: isMobileViewport ? 'none' : 'auto',
          }}
        >
          {/* Hover preview: arrow circle + score badge */}
          {hover && (
            <>
              {arrowRadiusPx > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: hover.px - arrowRadiusPx,
                    top: hover.py - arrowRadiusPx,
                    width: arrowRadiusPx * 2,
                    height: arrowRadiusPx * 2,
                    borderRadius: '50%',
                    border: '2px solid rgba(0,255,0,0.7)',
                    backgroundColor: 'rgba(0,255,0,0.15)',
                    pointerEvents: 'none',
                  }}
                />
              )}
              {hoverScore !== null && (
                <div
                  style={{
                    position: 'absolute',
                    left: hover.px + (arrowRadiusPx || 8) + 6,
                    top: hover.py - 12,
                    background: 'rgba(0,0,0,0.8)',
                    color: '#0f0',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 14,
                    fontWeight: 700,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {hoverScore === 0 ? 'M' : hoverScore}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Mobile precision zoom controls and lens */}
      {interactive && isMobileViewport && (
        <>
          <button
            type="button"
            onClick={() => setZoomEnabled(v => !v)}
            style={{
              position: 'absolute',
              right: 8,
              top: 8,
              zIndex: 20,
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: 6,
              background: zoomEnabled ? 'rgba(0,82,163,0.9)' : 'rgba(0,0,0,0.65)',
              color: '#fff',
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 700,
            }}
            aria-pressed={zoomEnabled}
            aria-label="Toggle precision zoom"
          >
            {zoomEnabled ? 'Zoom On' : 'Zoom Off'}
          </button>

          {zoomEnabled && touchActive && hover && (
            <div
              style={{
                position: 'absolute',
                left: 8,
                top: 8,
                width: 190,
                height: 190,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.85)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                zIndex: 30,
                background: 'rgba(16,16,16,0.65)',
                pointerEvents: 'none',
              }}
            >
              <Plot
                data={traces}
                layout={zoomLayout}
                config={{ displayModeBar: false, staticPlot: true }}
                style={{ width: 190, height: 190 }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  width: 2,
                  height: '100%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(255,255,255,0.8)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  width: '100%',
                  height: 2,
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.8)',
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
