import { useState, ChangeEvent } from 'react';
import { useImportShafts } from '../../api/arrows';

interface ShaftDataUploaderProps {
  arrowId: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

interface ParsedShaft {
  arrow_number: number;
  measured_weight_gr: number | null;
  measured_spine_astm: number | null;
  straightness: number | null;
}

export default function ShaftDataUploader({ arrowId, onSuccess, onError }: ShaftDataUploaderProps) {
  const [previewData, setPreviewData] = useState<ParsedShaft[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const importShafts = useImportShafts();

  const parseCSV = (text: string): ParsedShaft[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    // Try semicolon first
    let separator = ';';
    const firstLine = lines[0];
    if (firstLine.split(';').length === 1) {
      separator = ',';
    }

    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
    
    // Map column indices
    const colMap = {
      arrow_number: headers.findIndex(h => h.includes('no') || h.includes('number')),
      weight: headers.findIndex(h => h.includes('grain') || h.includes('weight')),
      spine: headers.findIndex(h => h.includes('astm') || h.includes('spine')),
      straightness: headers.findIndex(h => h.includes('straightness')),
    };

    const parsed: ParsedShaft[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map(v => v.trim());
      if (values.length < 2) continue; // Skip empty lines

      const shaft: ParsedShaft = {
        arrow_number: colMap.arrow_number >= 0 ? parseInt(values[colMap.arrow_number]) : i,
        measured_weight_gr: colMap.weight >= 0 && values[colMap.weight] ? parseFloat(values[colMap.weight]) : null,
        measured_spine_astm: colMap.spine >= 0 && values[colMap.spine] ? parseFloat(values[colMap.spine]) : null,
        straightness: colMap.straightness >= 0 && values[colMap.straightness] ? parseFloat(values[colMap.straightness]) : null,
      };

      if (!isNaN(shaft.arrow_number)) {
        parsed.push(shaft);
      }
    }

    return parsed;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          onError('No valid shaft data found in CSV file');
          return;
        }
        setPreviewData(parsed);
      } catch (err) {
        onError(`Failed to parse CSV: ${err}`);
      }
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;

    try {
      await importShafts.mutateAsync({ 
        arrowId, 
        shafts: previewData 
      });
      onSuccess(`Successfully imported ${previewData.length} shaft records!`);
      setPreviewData([]);
      setFileName('');
      // Reset file input
      const fileInput = document.getElementById('shaft-csv-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      onError(`Import failed: ${err}`);
    }
  };

  return (
    <div className="shaft-uploader">
      <div className="upload-controls">
        <input
          id="shaft-csv-upload"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="file-input"
        />
        <label htmlFor="shaft-csv-upload" className="file-label">
          {fileName || 'Choose CSV file...'}
        </label>
      </div>

      {previewData.length > 0 && (
        <>
          <div className="preview-header">
            <h5>Preview ({previewData.length} records)</h5>
            <button onClick={handleImport} className="btn-primary">
              Import Shaft Data
            </button>
          </div>
          
          <div className="shaft-table-container preview">
            <table className="shaft-table">
              <thead>
                <tr>
                  <th>Arrow #</th>
                  <th>Weight (gr)</th>
                  <th>Spine (ASTM)</th>
                  <th>Straightness</th>
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 10).map((shaft, idx) => (
                  <tr key={idx}>
                    <td>{shaft.arrow_number}</td>
                    <td>{shaft.measured_weight_gr?.toFixed(1) ?? '-'}</td>
                    <td>{shaft.measured_spine_astm?.toFixed(0) ?? '-'}</td>
                    <td>{shaft.straightness?.toFixed(3) ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 10 && (
              <p className="preview-note">Showing first 10 of {previewData.length} records</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
