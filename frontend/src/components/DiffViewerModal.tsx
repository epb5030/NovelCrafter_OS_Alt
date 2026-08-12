import React, { useState } from 'react';
import { X, RotateCcw, GitCompare, FileText, CheckCircle2, History } from 'lucide-react';

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  oldLineNumber?: number;
  newLineNumber?: number;
  text: string;
}

interface DiffViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshotLabel: string;
  snapshotCreatedAt: string;
  currentContent: string;
  snapshotContent: string;
  onRestore: () => void;
  isRestoring?: boolean;
}

/**
 * Computes a paragraph/line diff between snapshot prose (old) and current prose (new).
 */
export function computeProseDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = (oldText || '').split('\n');
  const newLines = (newText || '').split('\n');
  const result: DiffLine[] = [];

  let i = 0;
  let j = 0;
  let oldLineNum = 1;
  let newLineNum = 1;

  while (i < oldLines.length || j < newLines.length) {
    const oldL = oldLines[i];
    const newL = newLines[j];

    if (i < oldLines.length && j < newLines.length && oldL === newL) {
      result.push({
        type: 'unchanged',
        oldLineNumber: oldLineNum++,
        newLineNumber: newLineNum++,
        text: oldL,
      });
      i++;
      j++;
    } else if (j < newLines.length && (!oldLines.slice(i).includes(newL) || oldLines.indexOf(newL, i) > i + 3)) {
      // Line added in current prose
      result.push({
        type: 'added',
        newLineNumber: newLineNum++,
        text: newL,
      });
      j++;
    } else if (i < oldLines.length) {
      // Line removed from snapshot prose
      result.push({
        type: 'removed',
        oldLineNumber: oldLineNum++,
        text: oldL,
      });
      i++;
    } else {
      j++;
    }
  }

  return result;
}

export const DiffViewerModal: React.FC<DiffViewerModalProps> = ({
  isOpen,
  onClose,
  snapshotLabel,
  snapshotCreatedAt,
  currentContent,
  snapshotContent,
  onRestore,
  isRestoring = false,
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split' | 'raw'>('split');

  if (!isOpen) return null;

  const diffLines = computeProseDiff(snapshotContent, currentContent);
  const addedCount = diffLines.filter(l => l.type === 'added').length;
  const removedCount = diffLines.filter(l => l.type === 'removed').length;

  const formattedDate = snapshotCreatedAt
    ? new Date(snapshotCreatedAt).toLocaleString()
    : 'Unknown Date';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#141824] border border-[#2a3044] rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a3044] bg-[#1a1f30]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#c89d54]/10 text-[#c89d54] border border-[#c89d54]/20">
              <GitCompare size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Version History Diff: <span className="text-[#c89d54]">{snapshotLabel}</span>
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <History size={12} /> Captured on {formattedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#111420] p-1 rounded-lg border border-[#2a3044]">
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  viewMode === 'split'
                    ? 'bg-[#c89d54] text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Split View
              </button>
              <button
                onClick={() => setViewMode('unified')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  viewMode === 'unified'
                    ? 'bg-[#c89d54] text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Unified Diff
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  viewMode === 'raw'
                    ? 'bg-[#c89d54] text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Raw Snapshot
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#2a3044] rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Diff Summary Bar */}
        <div className="flex items-center justify-between px-6 py-2 bg-[#111420] border-b border-[#2a3044] text-xs text-slate-300">
          <div className="flex items-center space-x-4">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              +{addedCount} lines added in current draft
            </span>
            <span className="text-rose-400 font-semibold flex items-center gap-1">
              -{removedCount} lines changed from snapshot
            </span>
          </div>

          <div className="text-slate-400">
            Comparing <span className="text-amber-400">Snapshot #{snapshotLabel}</span> vs.{' '}
            <span className="text-emerald-400">Active Scene Prose</span>
          </div>
        </div>

        {/* Diff Body Content */}
        <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed bg-[#0b0d14]">
          {viewMode === 'split' && (
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Left Column: Snapshot Prose */}
              <div className="border border-[#2a3044] rounded-lg bg-[#141824] flex flex-col overflow-hidden">
                <div className="px-4 py-2 bg-[#1a1f30] border-b border-[#2a3044] text-xs font-semibold text-amber-400 flex items-center gap-2">
                  <FileText size={14} /> Historical Snapshot Prose ({snapshotLabel})
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-2 text-slate-300 whitespace-pre-wrap font-serif text-sm">
                  {snapshotContent || <em className="text-slate-500">(Empty snapshot prose)</em>}
                </div>
              </div>

              {/* Right Column: Active Scene Prose */}
              <div className="border border-[#2a3044] rounded-lg bg-[#141824] flex flex-col overflow-hidden">
                <div className="px-4 py-2 bg-[#1a1f30] border-b border-[#2a3044] text-xs font-semibold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 size={14} /> Active Editor Prose (Current Draft)
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-2 text-slate-300 whitespace-pre-wrap font-serif text-sm">
                  {currentContent || <em className="text-slate-500">(Empty editor prose)</em>}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'unified' && (
            <div className="border border-[#2a3044] rounded-lg bg-[#141824] divide-y divide-[#1e2334] overflow-hidden">
              {diffLines.map((line, idx) => {
                let bgColor = 'bg-transparent text-slate-300';
                let prefix = ' ';

                if (line.type === 'added') {
                  bgColor = 'bg-emerald-950/40 text-emerald-300 border-l-4 border-emerald-500';
                  prefix = '+';
                } else if (line.type === 'removed') {
                  bgColor = 'bg-rose-950/40 text-rose-300 line-through opacity-80 border-l-4 border-rose-500';
                  prefix = '-';
                }

                return (
                  <div key={idx} className={`px-4 py-1.5 flex items-start font-mono text-xs ${bgColor}`}>
                    <span className="w-10 text-slate-500 select-none text-right pr-3 font-semibold">
                      {line.newLineNumber || line.oldLineNumber || ''}
                    </span>
                    <span className="w-6 text-slate-400 select-none font-bold">{prefix}</span>
                    <span className="flex-1 whitespace-pre-wrap font-serif text-sm">{line.text}</span>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'raw' && (
            <div className="border border-[#2a3044] rounded-lg bg-[#141824] p-6 text-slate-200 font-serif text-base leading-relaxed whitespace-pre-wrap">
              {snapshotContent}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#2a3044] bg-[#1a1f30]">
          <div className="text-xs text-slate-400">
            💡 Restoring this snapshot will automatically create a safety backup of your current editor prose.
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 bg-[#2a3044] hover:bg-[#343b54] rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={onRestore}
              disabled={isRestoring}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-[#c89d54] hover:bg-[#d6ac63] rounded-lg shadow-lg flex items-center gap-2 transition disabled:opacity-50"
            >
              <RotateCcw size={14} />
              {isRestoring ? 'Restoring Prose...' : 'Restore This Snapshot'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
