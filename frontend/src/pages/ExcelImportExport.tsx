/**
 * Excel Import/Export Page - Upload, preview, import, and export data
 */
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ExcelImportExport() {
  const [previewData, setPreviewData] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setImportResult(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', f);
      const res = await api.post('/excel/preview/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewData(res.data);
      toast.success(`Preview loaded: ${res.data.row_count} rows`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to read file');
    }
    setUploading(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('update_existing', 'true');
      if (previewData?.column_mapping) {
        formData.append('column_mapping', JSON.stringify(previewData.column_mapping));
      }
      const res = await api.post('/excel/import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      toast.success(`Imported ${res.data.success_count} items!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Import failed');
    }
    setImporting(false);
  };

  const exportData = async (type: string) => {
    try {
      const endpoints: Record<string, string> = {
        inventory: '/excel/export/inventory/',
        sales: '/excel/export/sales/',
        gst: '/excel/export/gst/',
        profit: '/excel/export/profit-loss/',
      };
      const res = await api.get(endpoints[type], { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `${type}_export.xlsx`; a.click();
      toast.success(`${type} exported!`);
    } catch { toast.error('Export failed'); }
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Excel Import / Export</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
        Import inventory from Excel/CSV or export reports
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Import Section */}
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>📥 Import</h2>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className="card"
            style={{
              padding: '2.5rem', textAlign: 'center', cursor: 'pointer',
              borderStyle: 'dashed', borderWidth: 2,
              borderColor: isDragActive ? 'var(--primary)' : 'var(--border)',
              background: isDragActive ? 'rgba(99,102,241,0.05)' : 'var(--bg-secondary)',
              transition: 'all 0.2s', marginBottom: '1rem',
            }}
          >
            <input {...getInputProps()} />
            <Upload size={40} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
            <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
              {isDragActive ? 'Drop file here...' : 'Drag & drop Excel/CSV file'}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              or click to browse • .xlsx, .xls, .csv
            </p>
          </div>

          {uploading && <p style={{ textAlign: 'center', color: 'var(--primary)' }}>Reading file...</p>}

          {/* Column Mapping */}
          {previewData && (
            <motion.div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                  Column Mapping ({previewData.row_count} rows)
                </h3>
                <button className="btn btn-ghost btn-icon" onClick={() => { setPreviewData(null); setFile(null); }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
                {Object.entries(previewData.column_mapping || {}).map(([field, col]) => (
                  <div key={field} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontWeight: 500 }}>{field}</span>
                    <span style={{ color: 'var(--success)' }}>→ {col as string}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}
                onClick={handleImport} disabled={importing}>
                {importing ? 'Importing...' : `Import ${previewData.row_count} rows`}
              </button>
            </motion.div>
          )}

          {/* Preview Table */}
          {previewData?.preview && (
            <div className="card table-container" style={{ maxHeight: 300, overflow: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>{previewData.columns.map((c: string) => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {previewData.preview.slice(0, 10).map((row: any, i: number) => (
                    <tr key={i}>
                      {previewData.columns.map((c: string) => <td key={c} style={{ fontSize: '0.75rem' }}>{String(row[c] ?? '')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <motion.div className="card" style={{ padding: '1.25rem', marginTop: '1rem' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} color="var(--success)" /> Import Complete
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--success-bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: 'var(--success)' }}>{importResult.created_count}</div>Created
                </div>
                <div style={{ padding: '0.5rem', background: 'rgba(99,102,241,0.1)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{importResult.updated_count}</div>Updated
                </div>
                <div style={{ padding: '0.5rem', background: 'var(--error-bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: 'var(--error)' }}>{importResult.errors?.length || 0}</div>Errors
                </div>
              </div>
              {importResult.errors?.length > 0 && (
                <div style={{ marginTop: '0.75rem', maxHeight: 150, overflow: 'auto', fontSize: '0.75rem' }}>
                  {importResult.errors.map((e: any, i: number) => (
                    <div key={i} style={{ color: 'var(--error)', padding: '0.25rem 0' }}>
                      Row {e.row}: {e.error}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Export Section */}
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>📤 Export</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { type: 'inventory', label: 'Inventory Data', desc: 'All medicines with stock, prices, expiry', color: '#6366f1' },
              { type: 'sales', label: 'Sales Report', desc: 'Invoice summary and item details', color: '#10b981' },
              { type: 'gst', label: 'GST Report', desc: 'CGST, SGST breakdown per invoice', color: '#06b6d4' },
              { type: 'profit', label: 'Profit & Loss', desc: 'Revenue, cost, profit per item', color: '#f59e0b' },
            ].map(exp => (
              <motion.button
                key={exp.type}
                className="card"
                onClick={() => exportData(exp.type)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
                  cursor: 'pointer', border: 'none', textAlign: 'left', width: '100%',
                  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${exp.color}15`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileSpreadsheet size={24} color={exp.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{exp.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{exp.desc}</div>
                </div>
                <Download size={20} color="var(--text-muted)" />
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
