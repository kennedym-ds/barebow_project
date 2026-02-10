import { useMemo, useCallback, useState } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout, Shape } from 'plotly.js';
import { getRingScore, getFlintScore } from '../utils/scoring';

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
}: TargetFaceProps) {
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
      const rect = e.currentTarget.getBoundingClientRect();
      const pixelX = e.clientX - rect.left;
      const pixelY = e.clientY - rect.top;
      // margins are 0, so axis fills the full div
      const dataX = -maxR + (2 * maxR * pixelX) / width;
      const dataY = maxR - (2 * maxR * pixelY) / height; // screen-Y is inverted
      onPlotClick(dataX, dataY);
    },
    [onPlotClick, interactive, maxR, width, height],
  );

  // Hover preview state: show arrow circle + predicted score at cursor
  const [hover, setHover] = useState<{ px: number; py: number; dataX: number; dataY: number } | null>(null);

  const handleOverlayMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const dataX = -maxR + (2 * maxR * px) / width;
      const dataY = maxR - (2 * maxR * py) / height;
      setHover({ px, py, dataX, dataY });
    },
    [interactive, maxR, width, height],
  );

  const handleOverlayLeave = useCallback(() => setHover(null), []);

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
    return (radiusCm / (2 * maxR)) * width;
  }, [shaftDiameterMm, maxR, width]);

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
        mode: 'markers+text' as any,
        marker: {
          color: shots.map(s => s.color || '#00FF00'),
          size: 18,
          opacity: markerOpacity,
          line: { color: 'black', width: 1 },
        },
        text: shots.map(s => s.arrow_number?.toString() || ''),
        textfont: { color: 'black', size: 11 },
        textposition: 'middle center' as any,
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
        mode: 'markers+text' as any,
        marker: {
          symbol: 'x' as any,
          color: centroids.map(c => c.color),
          size: 16,
          line: { color: 'black', width: 2 },
        },
        text: centroids.map(c => c.label),
        textfont: { color: 'black', size: 10 },
        textposition: 'top center' as any,
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
        mode: 'markers' as any,
        marker: {
          symbol: 'cross' as any,
          color: 'red',
          size: 25,
          line: { color: 'black', width: 3 },
        },
        hoverinfo: 'name',
        name: 'Group Center (Median)',
      } as Data);
    }

    return data;
  }, [shots, maxR, showMedianCenter, markerOpacity, centroids, extraTraces]);

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
    width,
    height,
    margin: { l: 0, r: 0, t: 0, b: 0 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    dragmode: false,
    clickmode: 'event',
    showlegend: false,
  }), [shapes, maxR, width, height]);

  return (
    <div style={{ position: 'relative', width, height }}>
      <Plot
        data={traces}
        layout={layout}
        config={{ 
          displayModeBar: false, 
          staticPlot: true,
        }}
        style={{ width, height }}
      />
      {interactive && (
        <div
          onClick={handleOverlayClick}
          onMouseMove={handleOverlayMove}
          onMouseLeave={handleOverlayLeave}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            cursor: 'crosshair',
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
    </div>
  );
}
