import { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { useTabs } from '../../api/tabs';
import { useCalculateCrawl, type CrawlPoint } from '../../api/crawls';
import './CrawlManager.css';

interface MarkRow {
  distance: number;
  crawl: number;
}

function getMarkInstruction(crawlMm: number, tabMarks: number[]): string {
  if (tabMarks.length === 0) return '';
  const closest = tabMarks.reduce((prev, curr) =>
    Math.abs(curr - crawlMm) < Math.abs(prev - crawlMm) ? curr : prev
  );
  const diff = crawlMm - closest;
  const idx = tabMarks.indexOf(closest) + 1;
  if (Math.abs(diff) < 0.5) return `M${idx}`;
  if (diff > 0) return `M${idx} + ${diff.toFixed(1)}mm`;
  return `M${idx} - ${Math.abs(diff).toFixed(1)}mm`;
}

export default function CrawlManager() {
  const [marks, setMarks] = useState<MarkRow[]>([
    { distance: 10, crawl: 25.0 },
    { distance: 30, crawl: 10.0 },
    { distance: 50, crawl: 0.0 },
  ]);
  const [selectedTabId, setSelectedTabId] = useState<string>('');
  const [targetDistance, setTargetDistance] = useState<number>(18);
  
  const { data: tabs } = useTabs();
  const calculateCrawl = useCalculateCrawl();
  
  // Parse tab marks
  const tabMarks = useMemo(() => {
    if (!selectedTabId || !tabs) return [];
    const tab = tabs.find(t => t.id === selectedTabId);
    if (!tab || !tab.marks) return [];
    return tab.marks.split(',').map(m => parseFloat(m.trim())).filter(n => !isNaN(n));
  }, [selectedTabId, tabs]);
  
  // Auto-calculate when marks change
  useEffect(() => {
    const validMarks = marks.filter(m => m.distance > 0 && !isNaN(m.distance) && !isNaN(m.crawl));
    if (validMarks.length >= 2) {
      calculateCrawl.mutate({
        known_distances: validMarks.map(m => m.distance),
        known_crawls: validMarks.map(m => m.crawl),
        min_dist: 5,
        max_dist: 60,
        step: 1,
      });
    }
  }, [marks]);
  
  const chartData: CrawlPoint[] = calculateCrawl.data?.chart || [];
  
  // Find predicted crawl for target distance
  const predictedCrawl = useMemo(() => {
    if (chartData.length === 0) return null;
    const point = chartData.find(p => Math.abs(p.distance - targetDistance) < 0.5);
    return point ? point.crawl_mm : null;
  }, [chartData, targetDistance]);
  
  const handleAddRow = () => {
    setMarks([...marks, { distance: 0, crawl: 0 }]);
  };
  
  const handleRemoveRow = (index: number) => {
    setMarks(marks.filter((_, i) => i !== index));
  };
  
  const handleMarkChange = (index: number, field: 'distance' | 'crawl', value: number) => {
    const newMarks = [...marks];
    newMarks[index][field] = value;
    setMarks(newMarks);
  };
  
  // Plotly figure for visual tab
  const plotlyData = useMemo(() => {
    const shapes = [];
    const annotations = [];
    
    // Tab body rectangle
    shapes.push({
      type: 'rect',
      x0: -15,
      y0: 0,
      x1: 15,
      y1: 80,
      fillcolor: '#e0e0e0',
      line: { color: 'black' },
    });
    
    // Ruler marks every 5mm
    for (let i = 0; i <= 80; i += 5) {
      const yPos = 80 - i;
      shapes.push({
        type: 'line',
        x0: -5,
        y0: yPos,
        x1: 5,
        y1: yPos,
        line: { color: 'grey', width: 1 },
      });
      
      if (i % 10 === 0) {
        annotations.push({
          x: 10,
          y: yPos,
          text: `${i}`,
          showarrow: false,
          font: { size: 8 },
        });
      }
    }
    
    // Nock annotation
    annotations.push({
      x: 0,
      y: 82,
      text: 'Nock',
      showarrow: false,
      font: { size: 12, color: 'black' },
    });
    
    // Tab marks (blue dotted lines)
    tabMarks.forEach((mark, idx) => {
      const yPos = 80 - mark;
      shapes.push({
        type: 'line',
        x0: -15,
        y0: yPos,
        x1: 15,
        y1: yPos,
        line: { color: 'blue', width: 2, dash: 'dot' },
      });
      
      annotations.push({
        x: -18,
        y: yPos,
        text: `M${idx + 1}`,
        showarrow: false,
        font: { color: 'blue', size: 10 },
        xanchor: 'right',
      });
    });
    
    // Thumb/crawl indicator (green rectangle)
    if (predictedCrawl !== null) {
      const thumbTop = 80 - predictedCrawl;
      shapes.push({
        type: 'rect',
        x0: -20,
        y0: thumbTop - 10,
        x1: 20,
        y1: thumbTop,
        fillcolor: 'rgba(50, 205, 50, 0.6)',
        line: { color: 'green' },
      });
    }
    
    return { shapes, annotations };
  }, [tabMarks, predictedCrawl]);
  
  // Split chart data into two columns for the crawl card
  const leftHalf = chartData.slice(0, Math.ceil(chartData.length / 2));
  const rightHalf = chartData.slice(Math.ceil(chartData.length / 2));
  
  return (
    <div className="crawl-manager">
      <h1>📏 Crawl Manager</h1>
      <p>
        <strong>String Walking Calculator</strong>: Enter your known crawls (e.g., 10m, 30m, 50m) and we will calculate the rest.
      </p>
      
      <div className="crawl-layout">
        <div className="known-marks-section">
          <h2>Known Marks</h2>
          <table className="marks-table">
            <thead>
              <tr>
                <th>Distance (m)</th>
                <th>Crawl (mm)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((mark, idx) => (
                <tr key={idx}>
                  <td>
                    <input
                      type="number"
                      value={mark.distance}
                      onChange={(e) => handleMarkChange(idx, 'distance', parseFloat(e.target.value) || 0)}
                      step="1"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={mark.crawl}
                      onChange={(e) => handleMarkChange(idx, 'crawl', parseFloat(e.target.value) || 0)}
                      step="0.1"
                    />
                  </td>
                  <td>
                    <button onClick={() => handleRemoveRow(idx)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="marks-actions">
            <button className="add-row-button" onClick={handleAddRow}>Add Row</button>
          </div>
          {marks.length >= 2 && calculateCrawl.isSuccess && (
            <div className="alert alert-success" style={{ marginTop: '1rem', padding: '0.75rem', background: '#d4edda', borderRadius: '4px', color: '#155724' }}>
              ✅ Model Calculated!
            </div>
          )}
          {marks.length < 2 && (
            <div className="alert alert-warning" style={{ marginTop: '1rem', padding: '0.75rem', background: '#fff3cd', borderRadius: '4px', color: '#856404' }}>
              ⚠️ Enter at least 2 marks to calculate.
            </div>
          )}
        </div>
        
        <div className="predictions-section">
          <h2>Visual Tab</h2>
          
          <div className="tab-selector">
            <label>Select Tab (optional)</label>
            <select value={selectedTabId} onChange={(e) => setSelectedTabId(e.target.value)}>
              <option value="">-- None --</option>
              {tabs?.map(tab => (
                <option key={tab.id} value={tab.id}>
                  {tab.make} {tab.model}
                </option>
              ))}
            </select>
          </div>
          
          <div className="distance-control">
            <label>Target Distance</label>
            <div className="distance-slider">
              <input
                type="range"
                min={5}
                max={60}
                value={targetDistance}
                onChange={(e) => setTargetDistance(parseInt(e.target.value))}
              />
              <span className="distance-value">{targetDistance}m</span>
            </div>
          </div>
          
          {predictedCrawl !== null && (
            <div className="predicted-crawl">
              <h3>Crawl for {targetDistance}m</h3>
              <div className="value">{predictedCrawl.toFixed(1)} mm</div>
              {tabMarks.length > 0 && (
                <div className="mark-instruction">
                  {getMarkInstruction(predictedCrawl, tabMarks)}
                </div>
              )}
            </div>
          )}
          
          {chartData.length > 0 && (
            <div className="visual-tab">
              <Plot
                data={[]}
                layout={{
                  width: 300,
                  height: 600,
                  xaxis: { visible: false, range: [-30, 30] },
                  yaxis: { visible: false, range: [-10, 90] },
                  shapes: plotlyData.shapes,
                  annotations: plotlyData.annotations,
                  margin: { l: 0, r: 0, t: 20, b: 0 },
                  title: 'Tab View',
                }}
                config={{ displayModeBar: false }}
              />
            </div>
          )}
          
          {chartData.length > 0 && (
            <div className="crawl-card-section">
              <h3>🖨️ Crawl Card</h3>
              <div className="crawl-table">
                <div className="crawl-table-half">
                  <table>
                    <thead>
                      <tr>
                        <th>Distance (m)</th>
                        <th>Crawl (mm)</th>
                        {tabMarks.length > 0 && <th>Mark</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {leftHalf.map((point, idx) => (
                        <tr key={idx}>
                          <td>{point.distance}</td>
                          <td>{point.crawl_mm.toFixed(1)}</td>
                          {tabMarks.length > 0 && (
                            <td>{getMarkInstruction(point.crawl_mm, tabMarks)}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="crawl-table-half">
                  <table>
                    <thead>
                      <tr>
                        <th>Distance (m)</th>
                        <th>Crawl (mm)</th>
                        {tabMarks.length > 0 && <th>Mark</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {rightHalf.map((point, idx) => (
                        <tr key={idx}>
                          <td>{point.distance}</td>
                          <td>{point.crawl_mm.toFixed(1)}</td>
                          {tabMarks.length > 0 && (
                            <td>{getMarkInstruction(point.crawl_mm, tabMarks)}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
