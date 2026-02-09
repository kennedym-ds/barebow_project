import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout, Shape } from 'plotly.js';

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

  const traces = useMemo(() => {
    const data: Data[] = [];

    // Invisible heatmap for click detection (200x200 grid)
    const gridSize = 200;
    const xVals = Array.from({ length: gridSize }, (_, i) => -maxR + (2 * maxR * i) / (gridSize - 1));
    const yVals = Array.from({ length: gridSize }, (_, i) => -maxR + (2 * maxR * i) / (gridSize - 1));
    const zVals = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));

    data.push({
      type: 'heatmap',
      x: xVals,
      y: yVals,
      z: zVals,
      showscale: false,
      opacity: 0.01,
      hoverinfo: 'none',
    } as Data);

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
          line: { color: 'black', width: 1 },
        },
        text: shots.map(s => s.arrow_number?.toString() || ''),
        textfont: { color: 'black', size: 11 },
        textposition: 'middle center' as any,
        hovertext: shots.map(s => `Arrow #${s.arrow_number || '?'}: ${s.score}`),
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
  }, [shots, maxR, showMedianCenter]);

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
    showlegend: false,
  }), [shapes, maxR, width, height]);

  return (
    <Plot
      data={traces}
      layout={layout}
      config={{ 
        displayModeBar: false, 
        staticPlot: !interactive 
      }}
      onClick={(event) => {
        if (onPlotClick && interactive && event.points.length > 0) {
          const pt = event.points[0];
          onPlotClick(pt.x as number, pt.y as number);
        }
      }}
      style={{ width, height }}
    />
  );
}
