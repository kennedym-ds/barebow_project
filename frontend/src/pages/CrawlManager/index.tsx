import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { useTabs, useUploadTabImage, useDeleteTabImage, useUpdateTab } from '../../api/tabs';
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

type CalibrationStep = 'idle' | 'set-nock' | 'set-ref';

export default function CrawlManager() {
  const [marks, setMarks] = useState<MarkRow[]>([
    { distance: 10, crawl: 25.0 },
    { distance: 30, crawl: 10.0 },
    { distance: 50, crawl: 0.0 },
  ]);
  const [selectedTabId, setSelectedTabId] = useState<string>('');
  const [targetDistance, setTargetDistance] = useState<number>(18);

  // Calibration state
  const [calibStep, setCalibStep] = useState<CalibrationStep>('idle');
  const [refMm, setRefMm] = useState<number>(20);
  const [nockYLocal, setNockYLocal] = useState<number | null>(null);
  const [refYLocal, setRefYLocal] = useState<number | null>(null);
  const imgContainerRef = useRef<HTMLDivElement>(null);

  const { data: tabs } = useTabs();
  const calculateCrawl = useCalculateCrawl();
  const uploadImage = useUploadTabImage();
  const deleteImage = useDeleteTabImage();
  const updateTab = useUpdateTab();

  const selectedTab = useMemo(() => {
    if (!selectedTabId || !tabs) return null;
    return tabs.find(t => t.id === selectedTabId) ?? null;
  }, [selectedTabId, tabs]);

  const tabMarks = useMemo(() => {
    if (!selectedTab || !selectedTab.marks) return [];
    return selectedTab.marks.split(',').map(m => parseFloat(m.trim())).filter(n => !isNaN(n));
  }, [selectedTab]);

  // Sync calibration from saved tab
  useEffect(() => {
    if (selectedTab?.nock_y_px != null) {
      setNockYLocal(selectedTab.nock_y_px);
    } else {
      setNockYLocal(null);
    }
    setRefYLocal(null);
  }, [selectedTab]);

  // Auto-calculate when marks change (debounced to avoid firing on every keystroke)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
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
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [marks]);

  const chartData: CrawlPoint[] = calculateCrawl.data?.chart || [];

  const predictedCrawl = useMemo(() => {
    if (chartData.length === 0) return null;
    const point = chartData.find(p => Math.abs(p.distance - targetDistance) < 0.5);
    return point ? point.crawl_mm : null;
  }, [chartData, targetDistance]);

  const handleAddRow = () => setMarks([...marks, { distance: 0, crawl: 0 }]);
  const handleRemoveRow = (index: number) => setMarks(marks.filter((_, i) => i !== index));
  const handleMarkChange = (index: number, field: 'distance' | 'crawl', value: number) => {
    const newMarks = [...marks];
    newMarks[index][field] = value;
    setMarks(newMarks);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTabId) return;
    uploadImage.mutate({ id: selectedTabId, file });
  };

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (calibStep === 'idle') return;
    const container = imgContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const yPx = e.clientY - rect.top;
    if (calibStep === 'set-nock') {
      setNockYLocal(yPx);
      setCalibStep('set-ref');
    } else if (calibStep === 'set-ref') {
      setRefYLocal(yPx);
      if (nockYLocal !== null && selectedTabId) {
        const deltaPixels = yPx - nockYLocal;
        if (deltaPixels > 0) {
          const scale = refMm / deltaPixels;
          updateTab.mutate({ id: selectedTabId, data: { nock_y_px: nockYLocal, scale_mm_per_px: scale } });
        }
      }
      setCalibStep('idle');
    }
  }, [calibStep, nockYLocal, refMm, selectedTabId, updateTab]);

  const scale = selectedTab?.scale_mm_per_px ?? null;
  const nockY = nockYLocal ?? selectedTab?.nock_y_px ?? null;
  const imageUrl = selectedTab?.tab_image_path ? `/api/tabs/${selectedTab.id}/image` : null;

  // Plotly fallback diagram
  const plotlyData = useMemo(() => {
    const shapes: object[] = [];
    const annotations: object[] = [];
    shapes.push({ type: 'rect', x0: -15, y0: 0, x1: 15, y1: 80, fillcolor: '#e0e0e0', line: { color: 'black' } });
    for (let i = 0; i <= 80; i += 5) {
      const yPos = 80 - i;
      shapes.push({ type: 'line', x0: -5, y0: yPos, x1: 5, y1: yPos, line: { color: 'grey', width: 1 } });
      if (i % 10 === 0) annotations.push({ x: 10, y: yPos, text: `${i}`, showarrow: false, font: { size: 8 } });
    }
    annotations.push({ x: 0, y: 82, text: 'Nock', showarrow: false, font: { size: 12, color: 'black' } });
    tabMarks.forEach((mark, idx) => {
      const yPos = 80 - mark;
      shapes.push({ type: 'line', x0: -15, y0: yPos, x1: 15, y1: yPos, line: { color: 'blue', width: 2, dash: 'dot' } });
      annotations.push({ x: -18, y: yPos, text: `M${idx + 1}`, showarrow: false, font: { color: 'blue', size: 10 }, xanchor: 'right' });
    });
    if (predictedCrawl !== null) {
      const thumbTop = 80 - predictedCrawl;
      shapes.push({ type: 'rect', x0: -20, y0: thumbTop - 10, x1: 20, y1: thumbTop, fillcolor: 'rgba(50, 205, 50, 0.6)', line: { color: 'green' } });
    }
    return { shapes, annotations };
  }, [tabMarks, predictedCrawl]);

  const leftHalf = chartData.slice(0, Math.ceil(chartData.length / 2));
  const rightHalf = chartData.slice(Math.ceil(chartData.length / 2));

  return (
    <div className="crawl-manager">
      <h1>Crawl Manager</h1>
      <p><strong>String Walking Calculator</strong>: Enter your known crawls and we will calculate the rest.</p>

      <div className="crawl-layout">
        <div className="known-marks-section">
          <h2>Known Marks</h2>
          <table className="marks-table">
            <thead><tr><th>Distance (m)</th><th>Crawl (mm)</th><th>Action</th></tr></thead>
            <tbody>
              {marks.map((mark, idx) => (
                <tr key={idx}>
                  <td><input type="number" value={mark.distance} onChange={(e) => handleMarkChange(idx, 'distance', parseFloat(e.target.value) || 0)} step="1" /></td>
                  <td><input type="number" value={mark.crawl} onChange={(e) => handleMarkChange(idx, 'crawl', parseFloat(e.target.value) || 0)} step="0.1" /></td>
                  <td><button onClick={() => handleRemoveRow(idx)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="marks-actions">
            <button className="add-row-button" onClick={handleAddRow}>Add Row</button>
          </div>
          {marks.length >= 2 && calculateCrawl.isSuccess && (
            <div className="alert alert-success" style={{ marginTop: '1rem', padding: '0.75rem', background: '#d4edda', borderRadius: '4px', color: '#155724' }}>Model Calculated!</div>
          )}
          {marks.length < 2 && (
            <div className="alert alert-warning" style={{ marginTop: '1rem', padding: '0.75rem', background: '#fff3cd', borderRadius: '4px', color: '#856404' }}>Enter at least 2 marks to calculate.</div>
          )}
        </div>

        <div className="predictions-section">
          <h2>Visual Tab</h2>

          <div className="tab-selector">
            <label>Select Tab</label>
            <select value={selectedTabId} onChange={(e) => setSelectedTabId(e.target.value)}>
              <option value="">-- None --</option>
              {tabs?.map(tab => (
                <option key={tab.id} value={tab.id}>{tab.make} {tab.model}</option>
              ))}
            </select>
          </div>

          {/* Image upload controls */}
          {selectedTabId && (
            <div className="tab-image-controls">
              {!imageUrl ? (
                <label className="upload-button">
                  Upload Tab Photo
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
              ) : (
                <div className="image-actions">
                  <label className="upload-button small">
                    Replace Photo
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                  <button className="delete-image-btn" onClick={() => deleteImage.mutate(selectedTabId)}>Remove Photo</button>
                </div>
              )}
            </div>
          )}

          <div className="distance-control">
            <label>Target Distance</label>
            <div className="distance-slider">
              <input type="range" min={5} max={60} value={targetDistance} onChange={(e) => setTargetDistance(parseInt(e.target.value))} />
              <span className="distance-value">{targetDistance}m</span>
            </div>
          </div>

          {predictedCrawl !== null && (
            <div className="predicted-crawl">
              <h3>Crawl for {targetDistance}m</h3>
              <div className="value">{predictedCrawl.toFixed(1)} mm</div>
              {tabMarks.length > 0 && (
                <div className="mark-instruction">{getMarkInstruction(predictedCrawl, tabMarks)}</div>
              )}
            </div>
          )}

          {calculateCrawl.data?.point_on_distance != null && (
            <div className="point-on-callout">
              <span className="point-on-icon">🎯</span>
              <div className="point-on-info">
                <div className="point-on-label">Point-On Distance</div>
                <div className="point-on-value">{calculateCrawl.data.point_on_distance.toFixed(1)}m</div>
                <div className="point-on-desc">Zero crawl — aim directly at the target</div>
              </div>
            </div>
          )}

          {/* ---- Tab image with overlay ---- */}
          {imageUrl ? (
            <div className="visual-tab">
              <div className="calibration-bar">
                {scale !== null && nockY !== null ? (
                  <span className="calib-status ok">Calibrated ({(1 / scale).toFixed(1)} px/mm)</span>
                ) : (
                  <span className="calib-status pending">Not calibrated</span>
                )}
                <button className={`calib-btn ${calibStep !== 'idle' ? 'active' : ''}`}
                  onClick={() => { setCalibStep(calibStep === 'idle' ? 'set-nock' : 'idle'); setNockYLocal(null); setRefYLocal(null); }}>
                  {calibStep === 'idle' ? 'Calibrate' : 'Cancel'}
                </button>
                {calibStep !== 'idle' && (
                  <div className="calib-ref-input">
                    <label>Reference length (mm):</label>
                    <input type="number" value={refMm} onChange={(e) => setRefMm(parseFloat(e.target.value) || 20)} min={1} step={1} />
                  </div>
                )}
              </div>

              {calibStep !== 'idle' && (
                <div className="calib-instruction">
                  {calibStep === 'set-nock'
                    ? 'Click the nock groove (top reference point) on the tab image.'
                    : `Click a point ${refMm}mm below the nock groove.`}
                </div>
              )}

              <div className={`tab-image-container ${calibStep !== 'idle' ? 'calibrating' : ''}`}
                ref={imgContainerRef} onClick={handleImageClick}>
                <img src={imageUrl} alt="Tab face" className="tab-photo" draggable={false} />

                {/* Nock marker */}
                {nockY !== null && (
                  <div className="overlay-line nock-line" style={{ top: `${nockY}px` }}>
                    <span className="overlay-label nock-label">Nock</span>
                  </div>
                )}

                {/* Ref point marker (during calibration) */}
                {refYLocal !== null && (
                  <div className="overlay-line ref-line" style={{ top: `${refYLocal}px` }}>
                    <span className="overlay-label ref-label">{refMm}mm</span>
                  </div>
                )}

                {/* Tab marks overlay */}
                {scale !== null && nockY !== null && tabMarks.map((mm, idx) => {
                  const yPx = nockY + mm / scale;
                  return (
                    <div key={`mark-${idx}`} className="overlay-line mark-line" style={{ top: `${yPx}px` }}>
                      <span className="overlay-label mark-label">M{idx + 1} ({mm}mm)</span>
                    </div>
                  );
                })}

                {/* Predicted crawl overlay */}
                {scale !== null && nockY !== null && predictedCrawl !== null && (
                  <div className="overlay-line crawl-line" style={{ top: `${nockY + predictedCrawl / scale}px` }}>
                    <span className="overlay-label crawl-label">{targetDistance}m = {predictedCrawl.toFixed(1)}mm</span>
                  </div>
                )}

                {/* Crawl chart marks (every 5m) */}
                {scale !== null && nockY !== null && chartData
                  .filter(p => p.distance % 5 === 0 && p.distance !== targetDistance)
                  .map(p => (
                    <div key={`chart-${p.distance}`} className="overlay-tick" style={{ top: `${nockY + p.crawl_mm / scale}px` }}>
                      <span className="overlay-label tick-label">{p.distance}m</span>
                    </div>
                  ))}
              </div>
            </div>
          ) : chartData.length > 0 ? (
            <div className="visual-tab">
              <Plot
                data={[]}
                layout={{
                  width: 300, height: 600,
                  xaxis: { visible: false, range: [-30, 30] },
                  yaxis: { visible: false, range: [-10, 90] },
                  shapes: plotlyData.shapes as Plotly.Shape[],
                  annotations: plotlyData.annotations as Plotly.Annotations[],
                  margin: { l: 0, r: 0, t: 20, b: 0 },
                  title: { text: 'Tab View' },
                }}
                config={{ displayModeBar: false }}
              />
            </div>
          ) : null}

          {chartData.length > 0 && (
            <div className="crawl-card-section">
              <div className="crawl-card-header">
                <h3>Crawl Card</h3>
                <button className="print-btn" onClick={() => window.print()}>Print Card</button>
              </div>
              <p className="print-date">Printed {new Date().toLocaleDateString()}{selectedTab ? ` | ${selectedTab.make} ${selectedTab.model}` : ''}</p>
              <div className="crawl-table">
                <div className="crawl-table-half">
                  <table>
                    <thead><tr><th>Distance (m)</th><th>Crawl (mm)</th>{tabMarks.length > 0 && <th>Mark</th>}</tr></thead>
                    <tbody>
                      {leftHalf.map((point, idx) => (
                        <tr key={idx}>
                          <td>{point.distance}</td>
                          <td>{point.crawl_mm.toFixed(1)}</td>
                          {tabMarks.length > 0 && <td>{getMarkInstruction(point.crawl_mm, tabMarks)}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="crawl-table-half">
                  <table>
                    <thead><tr><th>Distance (m)</th><th>Crawl (mm)</th>{tabMarks.length > 0 && <th>Mark</th>}</tr></thead>
                    <tbody>
                      {rightHalf.map((point, idx) => (
                        <tr key={idx}>
                          <td>{point.distance}</td>
                          <td>{point.crawl_mm.toFixed(1)}</td>
                          {tabMarks.length > 0 && <td>{getMarkInstruction(point.crawl_mm, tabMarks)}</td>}
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
