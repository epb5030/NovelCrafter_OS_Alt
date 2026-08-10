import React, { useState, useEffect } from 'react';
import { 
  Download, 
  X, 
  FileText, 
  BookOpen, 
  Database, 
  Check, 
  Copy, 
  Sliders, 
  Printer
} from 'lucide-react';

interface ExportModalProps {
  projectId: number;
  projectName: string;
  apiBase: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  projectId,
  projectName,
  apiBase,
  isOpen,
  onClose
}) => {
  const [exportType, setExportType] = useState<'manuscript_md' | 'manuscript_html' | 'codex_bible' | 'backup_json'>('manuscript_md');
  const [includeActs, setIncludeActs] = useState<boolean>(true);
  const [includeSummaries, setIncludeSummaries] = useState<boolean>(false);
  const [sceneDivider, setSceneDivider] = useState<string>('* * *');
  const [previewContent, setPreviewContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Fetch Preview
  const fetchPreview = async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      if (exportType === 'manuscript_md') {
        const query = new URLSearchParams({
          format: 'markdown',
          includeActs: String(includeActs),
          includeSummaries: String(includeSummaries),
          sceneDivider
        });
        const res = await fetch(`${apiBase}/projects/${projectId}/export/manuscript?${query}`);
        if (res.ok) {
          const text = await res.text();
          setPreviewContent(text);
        }
      } else if (exportType === 'manuscript_html') {
        const query = new URLSearchParams({
          format: 'html',
          includeActs: String(includeActs),
          includeSummaries: String(includeSummaries),
          sceneDivider
        });
        const res = await fetch(`${apiBase}/projects/${projectId}/export/manuscript?${query}`);
        if (res.ok) {
          const text = await res.text();
          setPreviewContent(text);
        }
      } else if (exportType === 'codex_bible') {
        const res = await fetch(`${apiBase}/projects/${projectId}/export/codex-bible`);
        if (res.ok) {
          const text = await res.text();
          setPreviewContent(text);
        }
      } else if (exportType === 'backup_json') {
        const res = await fetch(`${apiBase}/projects/${projectId}/export`);
        if (res.ok) {
          const json = await res.json();
          setPreviewContent(JSON.stringify(json, null, 2));
        }
      }
    } catch (err) {
      console.error('Failed to load export preview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [isOpen, exportType, includeActs, includeSummaries, sceneDivider]);

  const handleDownload = () => {
    let url = '';
    if (exportType === 'manuscript_md') {
      const query = new URLSearchParams({
        format: 'markdown',
        includeActs: String(includeActs),
        includeSummaries: String(includeSummaries),
        sceneDivider,
        download: 'true'
      });
      url = `${apiBase}/projects/${projectId}/export/manuscript?${query}`;
    } else if (exportType === 'manuscript_html') {
      const query = new URLSearchParams({
        format: 'html',
        includeActs: String(includeActs),
        includeSummaries: String(includeSummaries),
        sceneDivider,
        download: 'true'
      });
      url = `${apiBase}/projects/${projectId}/export/manuscript?${query}`;
    } else if (exportType === 'codex_bible') {
      url = `${apiBase}/projects/${projectId}/export/codex-bible?download=true`;
    } else if (exportType === 'backup_json') {
      const a = document.createElement('a');
      a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(previewContent);
      a.download = `${projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_backup.json`;
      a.click();
      return;
    }

    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.click();
    }
  };

  const handlePrintHTML = () => {
    if (exportType === 'manuscript_html') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(previewContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(previewContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div 
        className="modal-content animate-scale" 
        style={{ 
          maxWidth: '850px', 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column',
          padding: '24px',
          background: 'rgba(15, 15, 23, 0.98)',
          border: '1px solid rgba(129, 140, 248, 0.3)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Download size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <h2 style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                Manuscript & Story Bible Export Studio
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{projectName}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '6px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Format Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setExportType('manuscript_md')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: exportType === 'manuscript_md' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
              background: exportType === 'manuscript_md' ? 'rgba(129, 140, 248, 0.15)' : 'rgba(0,0,0,0.2)',
              color: exportType === 'manuscript_md' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px' }}>
              <FileText size={14} style={{ color: 'var(--primary)' }} /> Markdown (.md)
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Complete compiled prose formatted with headers.</span>
          </button>

          <button
            onClick={() => setExportType('manuscript_html')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: exportType === 'manuscript_html' ? '2px solid var(--secondary)' : '1px solid var(--border-light)',
              background: exportType === 'manuscript_html' ? 'rgba(167, 139, 250, 0.15)' : 'rgba(0,0,0,0.2)',
              color: exportType === 'manuscript_html' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px' }}>
              <Printer size={14} style={{ color: 'var(--secondary)' }} /> Print HTML / PDF
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Book typography with page breaks for printing to PDF.</span>
          </button>

          <button
            onClick={() => setExportType('codex_bible')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: exportType === 'codex_bible' ? '2px solid #fbbf24' : '1px solid var(--border-light)',
              background: exportType === 'codex_bible' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(0,0,0,0.2)',
              color: exportType === 'codex_bible' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px' }}>
              <BookOpen size={14} style={{ color: '#fbbf24' }} /> Codex Bible (.md)
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Worldbuilding encyclopedia and character guide.</span>
          </button>

          <button
            onClick={() => setExportType('backup_json')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: exportType === 'backup_json' ? '2px solid #4ade80' : '1px solid var(--border-light)',
              background: exportType === 'backup_json' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(0,0,0,0.2)',
              color: exportType === 'backup_json' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px' }}>
              <Database size={14} style={{ color: '#4ade80' }} /> Database Archive (.json)
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Full project backup for restoring on another machine.</span>
          </button>
        </div>

        {/* Compile Configuration Controls (for manuscript exports) */}
        {(exportType === 'manuscript_md' || exportType === 'manuscript_html') && (
          <div 
            className="glass-panel" 
            style={{ 
              padding: '12px 16px', 
              display: 'flex', 
              gap: '20px', 
              alignItems: 'center', 
              flexWrap: 'wrap',
              marginBottom: '14px',
              fontSize: '12px',
              background: 'rgba(0,0,0,0.25)'
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sliders size={13} /> Formatting Options:
            </span>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={includeActs}
                onChange={(e) => setIncludeActs(e.target.checked)}
              />
              Include Act Headings
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={includeSummaries}
                onChange={(e) => setIncludeSummaries(e.target.checked)}
              />
              Include Chapter Plot Summaries
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Scene Break Divider:</span>
              <select
                value={sceneDivider}
                onChange={(e) => setSceneDivider(e.target.value)}
                className="input"
                style={{ padding: '3px 8px', fontSize: '11px', width: 'auto' }}
              >
                <option value="* * *">* * * (Asterisks)</option>
                <option value="~ ~ ~">~ ~ ~ (Tildes)</option>
                <option value="###">### (Hashes)</option>
                <option value="---">--- (Horizontal Rule)</option>
                <option value="">None (Empty Line)</option>
              </select>
            </div>
          </div>
        )}

        {/* Live Preview Box */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
            Compiled Document Preview ({previewContent.length.toLocaleString()} characters)
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleCopy}
              className="btn btn-secondary"
              style={{ padding: '3px 8px', fontSize: '11px' }}
            >
              {copied ? <Check size={11} style={{ color: '#4ade80' }} /> : <Copy size={11} />} {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
            {exportType === 'manuscript_html' && (
              <button
                onClick={handlePrintHTML}
                className="btn btn-secondary"
                style={{ padding: '3px 8px', fontSize: '11px' }}
              >
                <Printer size={11} /> Print to PDF
              </button>
            )}
          </div>
        </div>

        <div 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            backgroundColor: 'rgba(0,0,0,0.4)', 
            border: '1px solid var(--border-light)', 
            borderRadius: '8px', 
            padding: '16px',
            fontFamily: exportType === 'backup_json' ? 'monospace' : 'var(--font-sans)',
            fontSize: '13px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            color: 'rgba(255,255,255,0.85)',
            maxHeight: '380px'
          }}
        >
          {loading ? 'Compiling manuscript preview...' : previewContent || '<Empty Document>'}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDownload}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={14} /> Download Export File
          </button>
        </div>
      </div>
    </div>
  );
};
