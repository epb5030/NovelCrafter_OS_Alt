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
  Printer,
  Book,
  FileCode
} from 'lucide-react';

interface ExportModalProps {
  projectId: number;
  projectName: string;
  apiBase: string;
  isOpen: boolean;
  onClose: () => void;
}

export type ExportFormatType = 
  | 'epub'
  | 'docx'
  | 'manuscript_md' 
  | 'manuscript_html' 
  | 'codex_bible' 
  | 'backup_json';

export const ExportModal: React.FC<ExportModalProps> = ({
  projectId,
  projectName,
  apiBase,
  isOpen,
  onClose
}) => {
  const [exportType, setExportType] = useState<ExportFormatType>('epub');
  
  // Manuscript / Markdown / HTML Options
  const [includeActs, setIncludeActs] = useState<boolean>(true);
  const [includeSummaries, setIncludeSummaries] = useState<boolean>(false);
  const [sceneDivider, setSceneDivider] = useState<string>('* * *');
  
  // EPUB Options
  const [epubTheme, setEpubTheme] = useState<'classic' | 'modern' | 'vintage'>('classic');
  const [epubPublisher, setEpubPublisher] = useState<string>('OpenCrafter Studio');
  const [epubLanguage, setEpubLanguage] = useState<string>('en');
  
  // DOCX Options
  const [docxFormat, setDocxFormat] = useState<'standard_manuscript' | 'reading_draft'>('standard_manuscript');
  const [docxTitlePage, setDocxTitlePage] = useState<boolean>(true);
  
  // Preview State
  const [previewContent, setPreviewContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Fetch Preview
  const fetchPreview = async () => {
    if (!isOpen) return;
    
    // Binary formats don't show text preview in the box, show helpful summary
    if (exportType === 'epub') {
      setPreviewContent(`[EPUB 3 E-Book Binary Package]\n\nReady to compile: "${projectName}.epub"\n- Compatible with: Amazon Kindle, Apple Books, Kobo, Google Play Books\n- Typography Theme: ${epubTheme.toUpperCase()}\n- Publisher: ${epubPublisher}\n- Language: ${epubLanguage}\n- Structure: Valid EPUB 3 OEBPS container with dynamic Table of Contents\n\nClick "Download EPUB E-Book" below to generate binary e-book.`);
      return;
    }
    if (exportType === 'docx') {
      setPreviewContent(`[Microsoft Word Document (.docx) Package]\n\nReady to compile: "${projectName}.docx"\n- Formatting Standard: ${docxFormat === 'standard_manuscript' ? 'Standard Shunn Literary Submission (Double spaced, 1-inch margins, Times New Roman)' : 'Clean Reading Draft (1.15 spaced, Calibri)'}\n- Title Page: ${docxTitlePage ? 'Included (Author Pen Name, Contact Email, Approx. Word Count)' : 'Omitted'}\n- Scene Breaks: Centered # symbol\n\nClick "Download Word Manuscript" below to generate .docx file.`);
      return;
    }

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
  }, [isOpen, exportType, includeActs, includeSummaries, sceneDivider, epubTheme, epubPublisher, epubLanguage, docxFormat, docxTitlePage]);

  // Handle Binary and Text Downloads
  const handleDownload = () => {
    const slug = (projectName || 'manuscript').replace(/[^a-zA-Z0-9_-]/g, '_');

    if (exportType === 'epub') {
      const query = new URLSearchParams({
        theme: epubTheme,
        publisher: epubPublisher,
        language: epubLanguage
      });
      window.location.href = `${apiBase}/projects/${projectId}/export/epub?${query}`;
      return;
    }

    if (exportType === 'docx') {
      const query = new URLSearchParams({
        format: docxFormat,
        includeTitlePage: String(docxTitlePage)
      });
      window.location.href = `${apiBase}/projects/${projectId}/export/docx?${query}`;
      return;
    }

    if (exportType === 'manuscript_md') {
      const query = new URLSearchParams({
        format: 'markdown',
        includeActs: String(includeActs),
        includeSummaries: String(includeSummaries),
        sceneDivider,
        download: 'true'
      });
      window.location.href = `${apiBase}/projects/${projectId}/export/manuscript?${query}`;
    } else if (exportType === 'manuscript_html') {
      const blob = new Blob([previewContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}_printable_manuscript.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (exportType === 'codex_bible') {
      window.location.href = `${apiBase}/projects/${projectId}/export/codex-bible?download=true`;
    } else if (exportType === 'backup_json') {
      window.location.href = `${apiBase}/projects/${projectId}/export?download=true`;
    }
  };

  const handlePrint = () => {
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
          maxWidth: '920px', 
          maxHeight: '92vh', 
          display: 'flex', 
          flexDirection: 'column',
          padding: '24px', 
          background: 'var(--bg-panel)', 
          border: '1px solid var(--border-light)', 
          boxShadow: 'var(--shadow-premium)' 
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Download size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <h2 style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                Manuscript & Book Compiler Studio
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

        {/* 6 Format Selector Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
          
          {/* 1. EPUB 3 E-Book */}
          <button
            type="button"
            onClick={() => setExportType('epub')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: exportType === 'epub' ? '2px solid var(--primary)' : '1px solid var(--border-light)',
              background: exportType === 'epub' ? 'rgba(200, 157, 84, 0.15)' : 'rgba(0,0,0,0.2)',
              color: exportType === 'epub' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', color: exportType === 'epub' ? 'var(--primary)' : '#ffffff' }}>
              <Book size={15} /> EPUB 3 E-Book (.epub)
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Publish-ready e-book for Kindle, Apple Books & Kobo.</span>
          </button>

          {/* 2. Word (.docx) */}
          <button
            type="button"
            onClick={() => setExportType('docx')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: exportType === 'docx' ? '2px solid #38bdf8' : '1px solid var(--border-light)',
              background: exportType === 'docx' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0,0,0,0.2)',
              color: exportType === 'docx' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', color: exportType === 'docx' ? '#38bdf8' : '#ffffff' }}>
              <FileText size={15} /> Microsoft Word (.docx)
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Industry-standard Shunn submission format.</span>
          </button>

          {/* 3. Markdown (.md) */}
          <button
            type="button"
            onClick={() => setExportType('manuscript_md')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: exportType === 'manuscript_md' ? '2px solid #a78bfa' : '1px solid var(--border-light)',
              background: exportType === 'manuscript_md' ? 'rgba(167, 139, 250, 0.15)' : 'rgba(0,0,0,0.2)',
              color: exportType === 'manuscript_md' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', color: exportType === 'manuscript_md' ? '#a78bfa' : '#ffffff' }}>
              <FileCode size={15} /> Markdown (.md)
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Clean prose markdown with chapter headers.</span>
          </button>

          {/* 4. Print HTML / PDF */}
          <button
            type="button"
            onClick={() => setExportType('manuscript_html')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: exportType === 'manuscript_html' ? '2px solid #34d399' : '1px solid var(--border-light)',
              background: exportType === 'manuscript_html' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(0,0,0,0.2)',
              color: exportType === 'manuscript_html' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', color: exportType === 'manuscript_html' ? '#34d399' : '#ffffff' }}>
              <Printer size={15} /> Printable HTML / PDF
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Book typography with page breaks for printing to PDF.</span>
          </button>

          {/* 5. Codex Bible (.md) */}
          <button
            type="button"
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', color: exportType === 'codex_bible' ? '#fbbf24' : '#ffffff' }}>
              <BookOpen size={15} /> Codex Bible (.md)
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Worldbuilding encyclopedia and character guide.</span>
          </button>

          {/* 6. Project Backup (.json) */}
          <button
            type="button"
            onClick={() => setExportType('backup_json')}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: exportType === 'backup_json' ? '2px solid #f472b6' : '1px solid var(--border-light)',
              background: exportType === 'backup_json' ? 'rgba(244, 114, 182, 0.15)' : 'rgba(0,0,0,0.2)',
              color: exportType === 'backup_json' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', color: exportType === 'backup_json' ? '#f472b6' : '#ffffff' }}>
              <Database size={15} /> Project Archive (.json)
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Complete database snapshot for backup and transfer.</span>
          </button>
        </div>

        {/* Dynamic Options Bar */}
        {exportType === 'epub' && (
          <div className="glass-panel" style={{ padding: '12px 16px', marginBottom: '14px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="label" style={{ fontSize: '12px', margin: 0 }}>Typography Theme:</span>
              <select
                value={epubTheme}
                onChange={(e) => setEpubTheme(e.target.value as any)}
                className="input"
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                <option value="classic">Classic Garamond Serif</option>
                <option value="modern">Modern Sans-Serif</option>
                <option value="vintage">Vintage Typewriter</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="label" style={{ fontSize: '12px', margin: 0 }}>Publisher:</span>
              <input
                type="text"
                value={epubPublisher}
                onChange={(e) => setEpubPublisher(e.target.value)}
                className="input"
                style={{ padding: '4px 8px', fontSize: '12px', width: '150px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="label" style={{ fontSize: '12px', margin: 0 }}>Lang:</span>
              <input
                type="text"
                value={epubLanguage}
                onChange={(e) => setEpubLanguage(e.target.value)}
                className="input"
                placeholder="en"
                style={{ padding: '4px 8px', fontSize: '12px', width: '50px', textAlign: 'center' }}
              />
            </div>
          </div>
        )}

        {exportType === 'docx' && (
          <div className="glass-panel" style={{ padding: '12px 16px', marginBottom: '14px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="label" style={{ fontSize: '12px', margin: 0 }}>Format Style:</span>
              <select
                value={docxFormat}
                onChange={(e) => setDocxFormat(e.target.value as any)}
                className="input"
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                <option value="standard_manuscript">Standard Shunn Submission (Double-Spaced, Times New Roman)</option>
                <option value="reading_draft">Clean Reading Draft (1.15 Spaced, Calibri)</option>
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={docxTitlePage} 
                onChange={(e) => setDocxTitlePage(e.target.checked)} 
              />
              Include Shunn Title Page (Author Info & Word Count)
            </label>
          </div>
        )}

        {(exportType === 'manuscript_md' || exportType === 'manuscript_html') && (
          <div className="glass-panel" style={{ padding: '12px 16px', marginBottom: '14px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <Sliders size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600 }}>Prose Options:</span>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={includeActs} 
                onChange={(e) => setIncludeActs(e.target.checked)} 
              />
              Include Act Headings
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={includeSummaries} 
                onChange={(e) => setIncludeSummaries(e.target.checked)} 
              />
              Include Scene Summaries
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Scene Divider:</span>
              <input 
                type="text" 
                value={sceneDivider} 
                onChange={(e) => setSceneDivider(e.target.value)} 
                className="input"
                style={{ width: '80px', padding: '4px 8px', fontSize: '12px', textAlign: 'center' }}
              />
            </div>
          </div>
        )}

        {/* Live Preview / Summary Box */}
        <div style={{ position: 'relative', flex: 1, minHeight: '220px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
              {['epub', 'docx'].includes(exportType) ? 'Package Details & Compilation Target:' : 'Compiled Output Preview:'}
            </span>
            {!['epub', 'docx'].includes(exportType) && (
              <button
                type="button"
                onClick={handleCopy}
                className="btn btn-secondary"
                style={{ padding: '3px 8px', fontSize: '11px', gap: '4px' }}
              >
                {copied ? <Check size={12} style={{ color: 'var(--status-done)' }} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            )}
          </div>

          <div 
            style={{ 
              flex: 1, 
              backgroundColor: 'rgba(0,0,0,0.3)', 
              border: '1px solid var(--border-light)', 
              borderRadius: '6px', 
              padding: '14px', 
              overflowY: 'auto',
              fontFamily: ['manuscript_md', 'codex_bible', 'backup_json'].includes(exportType) ? 'monospace' : 'inherit',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6
            }}
          >
            {loading ? 'Compiling preview...' : previewContent}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '14px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {exportType === 'epub' && '📦 Generates valid EPUB 3 e-book with manifest, spine & NCX navigation.'}
            {exportType === 'docx' && '📄 Generates industry-formatted Microsoft Word .docx file.'}
            {exportType === 'manuscript_html' && '💡 Open print view and select "Save as PDF" in your browser print dialog.'}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {exportType === 'manuscript_html' && (
              <button
                type="button"
                onClick={handlePrint}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', gap: '6px' }}
              >
                <Printer size={15} /> Print / Save PDF
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="btn btn-primary"
              style={{ padding: '8px 20px', gap: '6px', fontWeight: 600 }}
            >
              <Download size={15} /> 
              {exportType === 'epub' && 'Download EPUB E-Book'}
              {exportType === 'docx' && 'Download Word Manuscript'}
              {exportType === 'manuscript_md' && 'Download Markdown'}
              {exportType === 'manuscript_html' && 'Download HTML'}
              {exportType === 'codex_bible' && 'Download Story Bible'}
              {exportType === 'backup_json' && 'Download Project Backup'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
