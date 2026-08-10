import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Send, 
  Wand2, 
  BookOpen, 
  Info, 
  MessageSquare, 
  RefreshCw, 
  AlertCircle,
  History,
  Square,
  RotateCcw,
  Trash2,
  Plus,
  Sliders,
  X,
  Eye,
  Check,
  AtSign,
  User,
  MapPin,
  Package,
  FileText,
  Timer,
  Flame
} from 'lucide-react';
import type { CodexEntry } from './CodexManager';
import type { OutlineElement } from './OutlinePlanner';

interface WriteEditorProps {
  projectId: number;
  apiBase: string;
  activeProvider: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SceneSnapshot {
  id: number;
  scene_id: number;
  content?: string;
  word_count: number;
  label: string;
  source: 'manual' | 'ai_generation' | 'autosave' | 'safety_backup';
  created_at: string;
}

export const WriteEditor: React.FC<WriteEditorProps> = ({ projectId, apiBase, activeProvider }) => {
  const [elements, setElements] = useState<OutlineElement[]>([]);
  const [codex, setCodex] = useState<CodexEntry[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<number | null>(null);
  
  // Editor States
  const [editorText, setEditorText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('');
  
  // Right Sidebar States
  const [rightTab, setRightTab] = useState<'info' | 'ai' | 'history'>('info');
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  
  // AI States & Streaming
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [streamingAction, setStreamingAction] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Runtime Style Overrides
  const [stylePov, setStylePov] = useState<string>('default');
  const [styleTense, setStyleTense] = useState<string>('default');
  const [styleTone, setStyleTone] = useState<string>('default');
  const [showStyleSettings, setShowStyleSettings] = useState(false);
  
  // Selection Rewrite states
  const [selection, setSelection] = useState('');
  const [rewriteInstruction, setRewriteInstruction] = useState('');
  const [isRewriteModalOpen, setIsRewriteModalOpen] = useState(false);
  const [streamedRewriteResult, setStreamedRewriteResult] = useState('');

  // Snapshots & History states
  const [snapshots, setSnapshots] = useState<SceneSnapshot[]>([]);
  const [isCreateSnapshotModalOpen, setIsCreateSnapshotModalOpen] = useState(false);
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const [previewSnapshot, setPreviewSnapshot] = useState<SceneSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  // Inline @ Mention Autocomplete States
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number>(-1);
  const [selectedMentionIdx, setSelectedMentionIdx] = useState<number>(0);
  const [activeLorePreview, setActiveLorePreview] = useState<CodexEntry | null>(null);

  // Writing Sprint Timer States
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [sprintDurationMinutes, setSprintDurationMinutes] = useState(15);
  const [sprintActive, setSprintActive] = useState(false);
  const [sprintTimeLeft, setSprintTimeLeft] = useState(0);
  const [sprintStartWords, setSprintStartWords] = useState(0);
  const [sprintWordsWritten, setSprintWordsWritten] = useState(0);
  const [sprintSummary, setSprintSummary] = useState<{ words: number; minutes: number; wpm: number } | null>(null);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const autosaveTimeoutRef = useRef<any>(null);
  const sprintIntervalRef = useRef<any>(null);

  const getCurrentWordCount = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  };

  // Fetch initial structure
  const fetchStructure = async () => {
    try {
      const [outRes, codexRes] = await Promise.all([
        fetch(`${apiBase}/projects/${projectId}/outline`),
        fetch(`${apiBase}/projects/${projectId}/codex`)
      ]);
      if (outRes.ok && codexRes.ok) {
        const outData: OutlineElement[] = await outRes.json();
        const codexData: CodexEntry[] = await codexRes.json();
        setElements(outData);
        setCodex(codexData);

        const scenes = outData.filter(e => e.type === 'scene');
        if (scenes.length > 0 && activeSceneId === null) {
          handleSelectScene(scenes[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStructure();
    setChatMessages([]);
  }, [projectId]);

  // Fetch Snapshots for active scene
  const fetchSnapshots = async (sceneId: number) => {
    try {
      setSnapshotLoading(true);
      const res = await fetch(`${apiBase}/scenes/${sceneId}/snapshots`);
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data);
      }
    } catch (err) {
      console.error('Failed to fetch snapshots:', err);
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleSelectScene = async (sceneId: number) => {
    if (activeSceneId !== null) {
      await saveSceneContent(activeSceneId, editorText);
    }

    setActiveSceneId(sceneId);
    setEditorText('');
    setLastSaved('');
    setSelection('');
    setPreviewSnapshot(null);
    setMentionQuery(null);
    
    try {
      const res = await fetch(`${apiBase}/scenes/${sceneId}/content`);
      if (res.ok) {
        const data = await res.json();
        const initialText = data.content || '';
        setEditorText(initialText);
        if (data.last_saved_at) {
          setLastSaved(new Date(data.last_saved_at).toLocaleTimeString());
        }

        if (sprintActive) {
          setSprintStartWords(getCurrentWordCount(initialText));
        }
      }
      fetchSnapshots(sceneId);
    } catch (err) {
      console.error(err);
    }
  };

  // Sprint Timer Countdown effect
  useEffect(() => {
    if (sprintActive && sprintTimeLeft > 0) {
      sprintIntervalRef.current = setInterval(() => {
        setSprintTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(sprintIntervalRef.current);
            setSprintActive(false);
            const words = sprintWordsWritten;
            const minutes = sprintDurationMinutes;
            const wpm = minutes > 0 ? Math.round(words / minutes) : words;
            setSprintSummary({ words, minutes, wpm });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(sprintIntervalRef.current);
    }

    return () => clearInterval(sprintIntervalRef.current);
  }, [sprintActive, sprintWordsWritten, sprintDurationMinutes]);

  const handleStartSprint = (minutes: number) => {
    const currentWords = getCurrentWordCount(editorText);
    setSprintDurationMinutes(minutes);
    setSprintTimeLeft(minutes * 60);
    setSprintStartWords(currentWords);
    setSprintWordsWritten(0);
    setSprintActive(true);
    setSprintSummary(null);
    setIsSprintModalOpen(false);
  };

  const handleStopSprint = () => {
    clearInterval(sprintIntervalRef.current);
    setSprintActive(false);
    const elapsedMinutes = Math.max(1, Math.round((sprintDurationMinutes * 60 - sprintTimeLeft) / 60));
    const words = sprintWordsWritten;
    const wpm = Math.round(words / elapsedMinutes);
    setSprintSummary({ words, minutes: elapsedMinutes, wpm });
  };

  // Autosave content & Check @ Mention trigger
  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setEditorText(value);

    // Update sprint word count delta
    if (sprintActive) {
      const currentWords = getCurrentWordCount(value);
      const delta = Math.max(0, currentWords - sprintStartWords);
      setSprintWordsWritten(delta);
    }

    // Check if user is typing an @ mention
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

    if (lastAtIdx !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIdx + 1);
      if (!/\s/.test(textAfterAt) && textAfterAt.length <= 25) {
        setMentionQuery(textAfterAt.toLowerCase());
        setMentionIndex(lastAtIdx);
        setSelectedMentionIdx(0);
      } else {
        setMentionQuery(null);
      }
    } else {
      setMentionQuery(null);
    }

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    if (activeSceneId) {
      setIsSaving(true);
      autosaveTimeoutRef.current = setTimeout(() => {
        saveSceneContent(activeSceneId, value);
      }, 1500);
    }
  };

  const saveSceneContent = async (sceneId: number, content: string) => {
    try {
      const res = await fetch(`${apiBase}/scenes/${sceneId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        const data = await res.json();
        setLastSaved(new Date(data.last_saved_at || new Date()).toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to autosave:', err);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  // Text selection listener
  const handleTextSelect = () => {
    if (editorRef.current) {
      const start = editorRef.current.selectionStart;
      const end = editorRef.current.selectionEnd;
      if (start !== end) {
        const selected = editorText.substring(start, end);
        setSelection(selected);
      } else {
        setSelection('');
      }
    }
  };

  // Mention Filter List
  const filteredMentions = codex.filter(item => {
    if (mentionQuery === null) return false;
    if (mentionQuery === '') return true;
    const nameMatch = item.name.toLowerCase().includes(mentionQuery);
    const aliasMatch = item.aliases ? item.aliases.toLowerCase().includes(mentionQuery) : false;
    const catMatch = item.category.toLowerCase().includes(mentionQuery);
    return nameMatch || aliasMatch || catMatch;
  }).slice(0, 6);

  // Insert Selected Mention
  const handleInsertMention = (entry: CodexEntry) => {
    if (mentionIndex === -1 || !editorRef.current) return;
    const cursorPos = editorRef.current.selectionStart;
    const beforeAt = editorText.substring(0, mentionIndex);
    const afterCursor = editorText.substring(cursorPos);
    const newText = `${beforeAt}${entry.name} ${afterCursor}`;

    setEditorText(newText);
    setMentionQuery(null);
    setMentionIndex(-1);

    if (activeSceneId) {
      saveSceneContent(activeSceneId, newText);
    }

    setTimeout(() => {
      if (editorRef.current) {
        const newCursor = beforeAt.length + entry.name.length + 1;
        editorRef.current.focus();
        editorRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 10);
  };

  // Handle Keyboard Navigation in Editor for Mentions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIdx((prev) => (prev + 1) % filteredMentions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIdx((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleInsertMention(filteredMentions[selectedMentionIdx]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }
  };

  // Stop AI Generation handler
  const handleStopAI = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAiLoading(false);
    setStreamingAction(null);
  };

  // Helper to trigger automated snapshot before AI mutations
  const createPreAISnapshot = async (sceneId: number, currentText: string, actionName: string) => {
    try {
      await fetch(`${apiBase}/scenes/${sceneId}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: currentText,
          label: `Auto-snapshot before AI ${actionName}`,
          source: 'ai_generation'
        })
      });
      fetchSnapshots(sceneId);
    } catch (err) {
      console.warn('Pre-AI snapshot failed:', err);
    }
  };

  // SSE Stream helper
  const streamAIResponse = async (payload: any, onChunk: (text: string) => void) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const res = await fetch(`${apiBase}/ai/generate-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'AI request failed' }));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    if (!res.body) {
      throw new Error('No response stream available');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      if (controller.signal.aborted) {
        reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.replace(/^data:\s*/, '');
        if (dataStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) {
            onChunk(parsed.text);
          }
        } catch (err: any) {
          if (err.message && !err.message.includes('Unexpected token')) {
            throw err;
          }
        }
      }
    }
  };

  // AI ACTIONS (Streaming)
  const handleAIAction = async (action: 'continue' | 'rewrite' | 'summarize') => {
    if (!activeSceneId) return;
    setAiLoading(true);
    setAiError('');
    setStreamingAction(action);

    const styleOverrides = {
      ...(stylePov !== 'default' ? { pov: stylePov } : {}),
      ...(styleTense !== 'default' ? { tense: styleTense } : {}),
      ...(styleTone !== 'default' ? { tone: styleTone } : {})
    };

    try {
      if (action === 'continue') {
        await createPreAISnapshot(activeSceneId, editorText, 'Continue');

        const space = editorText.endsWith(' ') || editorText.endsWith('\n') || editorText.length === 0 ? '' : ' ';
        let currentFullText = editorText + space;
        setEditorText(currentFullText);

        await streamAIResponse(
          {
            sceneId: activeSceneId,
            action: 'continue',
            styleOverrides
          },
          (chunk) => {
            currentFullText += chunk;
            setEditorText(currentFullText);
          }
        );

        await saveSceneContent(activeSceneId, currentFullText);
      } else if (action === 'rewrite') {
        if (!selection) {
          alert('Please highlight a block of text in your editor to rewrite.');
          setAiLoading(false);
          setStreamingAction(null);
          return;
        }

        setStreamedRewriteResult('');
        let accumulatedResult = '';

        await streamAIResponse(
          {
            sceneId: activeSceneId,
            action: 'rewrite',
            selection,
            prompt: rewriteInstruction,
            styleOverrides
          },
          (chunk) => {
            accumulatedResult += chunk;
            setStreamedRewriteResult(accumulatedResult);
          }
        );
      } else if (action === 'summarize') {
        const activeScene = elements.find(el => el.id === activeSceneId);
        if (!activeScene) throw new Error('Active scene not found in index');

        let summaryText = '';
        await streamAIResponse(
          {
            sceneId: activeSceneId,
            action: 'summarize',
            selection: selection || editorText,
            styleOverrides
          },
          (chunk) => {
            summaryText += chunk;
          }
        );

        await fetch(`${apiBase}/projects/${projectId}/outline/${activeSceneId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: activeScene.title,
            position: activeScene.position,
            summary: summaryText,
            status: activeScene.status,
            metadata: activeScene.metadata
          })
        });
        await fetchStructure();
        alert('Scene summary updated using manuscript outline!');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setAiError(err.message || 'Error running AI action');
      }
    } finally {
      setAiLoading(false);
      setStreamingAction(null);
      abortControllerRef.current = null;
    }
  };

  // Apply rewrite into manuscript
  const handleApplyRewrite = async () => {
    if (!activeSceneId || !editorRef.current || !streamedRewriteResult) return;
    
    await createPreAISnapshot(activeSceneId, editorText, 'Rewrite Selection');

    const start = editorRef.current.selectionStart;
    const end = editorRef.current.selectionEnd;
    const newText = editorText.substring(0, start) + streamedRewriteResult + editorText.substring(end);
    
    setEditorText(newText);
    await saveSceneContent(activeSceneId, newText);
    setIsRewriteModalOpen(false);
    setRewriteInstruction('');
    setStreamedRewriteResult('');
    setSelection('');
  };

  // AI Chat Submit (Streaming)
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeSceneId || aiLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    const initialHistory = [...chatMessages, userMessage];
    setChatMessages(initialHistory);
    setChatInput('');
    setAiLoading(true);
    setAiError('');
    setStreamingAction('chat');

    const styleOverrides = {
      ...(stylePov !== 'default' ? { pov: stylePov } : {}),
      ...(styleTense !== 'default' ? { tense: styleTense } : {}),
      ...(styleTone !== 'default' ? { tone: styleTone } : {})
    };

    const assistantIndex = initialHistory.length;
    setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    let accumulatedContent = '';

    try {
      await streamAIResponse(
        {
          sceneId: activeSceneId,
          action: 'chat',
          prompt: userMessage.content,
          history: chatMessages,
          styleOverrides
        },
        (chunk) => {
          accumulatedContent += chunk;
          setChatMessages(prev => {
            const updated = [...prev];
            if (updated[assistantIndex]) {
              updated[assistantIndex] = { role: 'assistant', content: accumulatedContent };
            }
            return updated;
          });
        }
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setAiError(err.message || 'Error calling AI assistant');
      }
    } finally {
      setAiLoading(false);
      setStreamingAction(null);
      abortControllerRef.current = null;
    }
  };

  const insertChatOutput = (content: string) => {
    if (editorRef.current && activeSceneId) {
      const start = editorRef.current.selectionStart;
      const end = editorRef.current.selectionEnd;
      const newText = editorText.substring(0, start) + '\n\n' + content + '\n\n' + editorText.substring(end);
      setEditorText(newText);
      saveSceneContent(activeSceneId, newText);
      alert('Prose inserted into manuscript!');
    }
  };

  // Manual Snapshot handlers
  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSceneId) return;

    try {
      const res = await fetch(`${apiBase}/scenes/${activeSceneId}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editorText,
          label: newSnapshotLabel.trim() || 'Manual Snapshot',
          source: 'manual'
        })
      });

      if (res.ok) {
        setIsCreateSnapshotModalOpen(false);
        setNewSnapshotLabel('');
        fetchSnapshots(activeSceneId);
      }
    } catch (err) {
      console.error('Failed to create snapshot:', err);
    }
  };

  const handlePreviewSnapshot = async (snapshotId: number) => {
    if (!activeSceneId) return;
    try {
      const res = await fetch(`${apiBase}/scenes/${activeSceneId}/snapshots/${snapshotId}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewSnapshot(data);
      }
    } catch (err) {
      console.error('Failed to load snapshot preview:', err);
    }
  };

  const handleRestoreSnapshot = async (snapshotId: number) => {
    if (!activeSceneId) return;
    if (!confirm('Are you sure you want to restore this version? A safety backup of your current manuscript will be recorded.')) {
      return;
    }

    try {
      const res = await fetch(`${apiBase}/scenes/${activeSceneId}/snapshots/${snapshotId}/restore`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setEditorText(data.restoredContent);
        setPreviewSnapshot(null);
        fetchSnapshots(activeSceneId);
        alert('Scene successfully restored to historical version!');
      }
    } catch (err) {
      console.error('Failed to restore snapshot:', err);
    }
  };

  const handleDeleteSnapshot = async (snapshotId: number) => {
    if (!activeSceneId) return;
    if (!confirm('Permanently delete this snapshot record?')) return;

    try {
      const res = await fetch(`${apiBase}/scenes/${activeSceneId}/snapshots/${snapshotId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (previewSnapshot?.id === snapshotId) {
          setPreviewSnapshot(null);
        }
        fetchSnapshots(activeSceneId);
      }
    } catch (err) {
      console.error('Failed to delete snapshot:', err);
    }
  };

  // Dynamic Codex Detection
  const getDetectedCodex = () => {
    const textLower = editorText.toLowerCase();
    return codex.filter(entry => {
      if (textLower.includes(entry.name.toLowerCase())) return true;
      if (entry.aliases) {
        const aliasList = entry.aliases.split(',').map(a => a.trim().toLowerCase());
        return aliasList.some(alias => alias && textLower.includes(alias));
      }
      return false;
    });
  };

  const activeScene = elements.find(e => e.id === activeSceneId);
  const detectedCodex = getDetectedCodex();

  // Helper structure variables
  const acts = elements.filter(e => e.type === 'act').sort((a, b) => a.position - b.position);
  const getChaptersForAct = (actId: number) => 
    elements.filter(e => e.type === 'chapter' && e.parent_id === actId).sort((a, b) => a.position - b.position);
  const getScenesForChapter = (chapId: number) => 
    elements.filter(e => e.type === 'scene' && e.parent_id === chapId).sort((a, b) => a.position - b.position);

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'ai_generation': return 'rgba(129, 140, 248, 0.2)';
      case 'safety_backup': return 'rgba(234, 179, 8, 0.2)';
      case 'manual': return 'rgba(34, 197, 94, 0.2)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  };

  const getSourceBadgeTextColor = (source: string) => {
    switch (source) {
      case 'ai_generation': return 'var(--primary)';
      case 'safety_backup': return 'var(--status-review)';
      case 'manual': return 'var(--status-done)';
      default: return 'var(--text-secondary)';
    }
  };

  const getCodexIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'character': return <User size={13} style={{ color: 'var(--primary)' }} />;
      case 'location': return <MapPin size={13} style={{ color: 'var(--secondary)' }} />;
      case 'item': return <Package size={13} style={{ color: '#fbbf24' }} />;
      default: return <FileText size={13} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  const formatSprintTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }} className="animate-scale">
      
      {/* LEFT PANEL: Manuscript Tree Navigation */}
      <aside 
        style={{
          width: '240px',
          borderRight: '1px solid var(--border-light)',
          background: 'rgba(10, 10, 15, 0.95)',
          overflowY: 'auto',
          padding: '16px 8px',
          flexShrink: 0
        }}
      >
        <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', paddingLeft: '8px', marginBottom: '12px', letterSpacing: '0.05em' }}>
          Manuscript Structure
        </h3>
        
        {elements.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', paddingLeft: '8px' }}>
            No outline elements found. Build acts in the Outline tab first.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {acts.map(act => (
              <div key={act.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--secondary)', padding: '4px 8px' }}>
                  <Folder size={14} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.title}</span>
                </div>

                <div style={{ paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  {getChaptersForAct(act.id).map(chap => (
                    <div key={chap.id}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '2px 8px', fontWeight: 500 }}>
                        {chap.title}
                      </div>

                      <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                        {getScenesForChapter(chap.id).map(scene => {
                          const isActive = scene.id === activeSceneId;
                          return (
                            <button
                              key={scene.id}
                              onClick={() => handleSelectScene(scene.id)}
                              style={{
                                textAlign: 'left',
                                padding: '6px 8px',
                                border: 'none',
                                borderRadius: '4px',
                                background: isActive ? 'rgba(129, 140, 248, 0.12)' : 'transparent',
                                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                width: '100%',
                                transition: 'var(--transition-smooth)'
                              }}
                            >
                              <span className={`status-dot ${scene.status}`} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {scene.title}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* CENTER PANEL: Writing Canvas */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)', position: 'relative' }}>
        {activeScene ? (
          <>
            {/* Editor Toolbar */}
            <div 
              className="glass-header"
              style={{ 
                padding: '12px 24px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`badge badge-${activeScene.status}`}>{activeScene.status}</span>
                <h2 style={{ fontSize: '16px', color: '#ffffff' }}>{activeScene.title}</h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isSaving ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RefreshCw size={11} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} /> Autosaving...
                    </span>
                  ) : lastSaved ? (
                    <span>Saved at {lastSaved}</span>
                  ) : (
                    <span>Draft loaded</span>
                  )}
                  <span style={{ color: 'var(--primary)', opacity: 0.7, textTransform: 'uppercase', fontWeight: 600 }}>[{activeProvider}]</span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {aiLoading ? (
                    <button
                      onClick={handleStopAI}
                      className="btn"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.4)'
                      }}
                      title="Halt AI Generation"
                    >
                      <Square size={13} style={{ fill: '#f87171' }} /> Stop Generating
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleAIAction('continue')}
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      title="Generate narrative prose continuing from your draft with live streaming"
                    >
                      <Sparkles size={13} /> Continue Writing
                    </button>
                  )}

                  {selection && !aiLoading && (
                    <button 
                      onClick={() => {
                        setStreamedRewriteResult('');
                        setIsRewriteModalOpen(true);
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--primary)' }}
                    >
                      <Wand2 size={13} style={{ color: 'var(--primary)' }} /> Edit Selection
                    </button>
                  )}

                  <button
                    onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                    className="btn btn-secondary"
                    style={{ padding: '6px' }}
                    title="Toggle Sidebar"
                  >
                    {isRightSidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Main Rich text editor area with @ Mention Autocomplete Overlay */}
            <div style={{ flex: 1, padding: '40px 60px', overflowY: 'auto', display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <textarea
                ref={editorRef}
                value={editorText}
                onChange={handleEditorChange}
                onSelect={handleTextSelect}
                onKeyDown={handleKeyDown}
                placeholder="Once upon a time, in a land forgotten by cartographers... (Type @ to mention Codex characters & lore)"
                style={{
                  width: '100%',
                  maxWidth: '750px',
                  height: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.9)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '17px',
                  lineHeight: '1.8',
                  resize: 'none',
                  outline: 'none',
                  paddingBottom: '200px'
                }}
              />

              {/* Floating @ Mention Autocomplete Dropdown */}
              {mentionQuery !== null && filteredMentions.length > 0 && (
                <div
                  className="glass-panel"
                  style={{
                    position: 'absolute',
                    top: '90px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '360px',
                    maxHeight: '280px',
                    overflowY: 'auto',
                    zIndex: 50,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                    border: '1px solid var(--primary)',
                    borderRadius: '8px',
                    padding: '6px',
                    background: 'rgba(18, 18, 28, 0.98)',
                    animation: 'fadeIn 0.15s ease-out'
                  }}
                >
                  <div style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid var(--border-light)', marginBottom: '4px' }}>
                    <AtSign size={11} style={{ color: 'var(--primary)' }} />
                    <span>Mention Codex Entity (Enter to insert, Esc to close)</span>
                  </div>

                  {filteredMentions.map((item, idx) => {
                    const isSelected = idx === selectedMentionIdx;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleInsertMention(item)}
                        onMouseEnter={() => setSelectedMentionIdx(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(129, 140, 248, 0.18)' : 'transparent',
                          border: isSelected ? '1px solid rgba(129, 140, 248, 0.3)' : '1px solid transparent',
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          {getCodexIcon(item.category)}
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {item.name}
                            </span>
                            {item.aliases && (
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                Aliases: {item.aliases}
                              </span>
                            )}
                          </div>
                        </div>

                        <span 
                          style={{ 
                            fontSize: '9px', 
                            textTransform: 'uppercase', 
                            padding: '2px 5px', 
                            borderRadius: '3px', 
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            color: 'var(--text-secondary)',
                            fontWeight: 600,
                            flexShrink: 0
                          }}
                        >
                          {item.category}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Word Count & Sprint Status Footer */}
            <div 
              style={{ 
                padding: '8px 24px', 
                borderTop: '1px solid var(--border-light)', 
                fontSize: '12px', 
                color: 'var(--text-muted)', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
                background: 'rgba(0, 0, 0, 0.2)'
              }}
            >
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span>Words: {getCurrentWordCount(editorText)}</span>
                <span>Characters: {editorText.length}</span>

                {/* Sprint Timer Widget */}
                {sprintActive ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 8px', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '6px', color: '#fde047' }}>
                    <Flame size={13} className="spin" />
                    <strong>{formatSprintTimer(sprintTimeLeft)}</strong>
                    <span>(+{sprintWordsWritten} words)</span>
                    <button 
                      onClick={handleStopSprint}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}
                    >
                      Finish Sprint
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsSprintModalOpen(true)}
                    className="btn btn-secondary"
                    style={{ padding: '2px 8px', fontSize: '11px', gap: '4px' }}
                    title="Start a timed writing sprint"
                  >
                    <Timer size={12} style={{ color: 'var(--secondary)' }} /> Start Sprint
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {streamingAction && (
                  <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={12} className="spin" /> Streaming {streamingAction}...
                  </span>
                )}
                <span>Snapshots: {snapshots.length}</span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '12px' }}>
            <BookOpen size={48} style={{ color: 'var(--text-muted)' }} />
            <h3>No Active Scene Selected</h3>
            <p style={{ fontSize: '13px' }}>Select a scene from the left navigation tree to begin writing.</p>
          </div>
        )}
      </section>

      {/* RIGHT SIDEBAR PANEL: Scene Info, AI Chat, & Version History */}
      {activeScene && isRightSidebarOpen && (
        <aside
          style={{
            width: '340px',
            borderLeft: '1px solid var(--border-light)',
            background: 'rgba(10, 10, 15, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            flexShrink: 0
          }}
        >
          {/* Tabs header */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
            <button
              onClick={() => setRightTab('info')}
              style={{
                flex: 1,
                padding: '12px 6px',
                background: rightTab === 'info' ? 'rgba(255,255,255,0.03)' : 'transparent',
                border: 'none',
                color: rightTab === 'info' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                borderBottom: rightTab === 'info' ? '2px solid var(--primary)' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Info size={13} /> Info
            </button>
            <button
              onClick={() => setRightTab('ai')}
              style={{
                flex: 1,
                padding: '12px 6px',
                background: rightTab === 'ai' ? 'rgba(255,255,255,0.03)' : 'transparent',
                border: 'none',
                color: rightTab === 'ai' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                borderBottom: rightTab === 'ai' ? '2px solid var(--primary)' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <MessageSquare size={13} /> AI Co-Writer
            </button>
            <button
              onClick={() => setRightTab('history')}
              style={{
                flex: 1,
                padding: '12px 6px',
                background: rightTab === 'history' ? 'rgba(255,255,255,0.03)' : 'transparent',
                border: 'none',
                color: rightTab === 'history' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                borderBottom: rightTab === 'history' ? '2px solid var(--primary)' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <History size={13} /> History ({snapshots.length})
            </button>
          </div>

          {/* Panel body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* 1. SCENE INFO TAB */}
            {rightTab === 'info' && (
              <>
                <div>
                  <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.05em' }}>
                    Scene Plot Outline
                  </h4>
                  <div 
                    className="glass-panel" 
                    style={{ 
                      padding: '12px', 
                      fontSize: '13px', 
                      lineHeight: '1.5',
                      color: 'var(--text-primary)',
                      background: 'rgba(0,0,0,0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px'
                    }}
                  >
                    {activeScene.summary || (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No summary outline defined. Create a summary in the Planner to help the AI keep on track.
                      </span>
                    )}
                  </div>
                  {editorText && (
                    <button
                      onClick={() => handleAIAction('summarize')}
                      disabled={aiLoading}
                      className="btn btn-secondary"
                      style={{ width: '100%', fontSize: '11px', padding: '6px', marginTop: '8px' }}
                    >
                      <Wand2 size={11} /> Auto-Generate Summary from Text
                    </button>
                  )}
                </div>

                <div>
                  <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.05em' }}>
                    World Lore Detected ({detectedCodex.length})
                  </h4>
                  
                  {detectedCodex.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '6px 0' }}>
                      No codex keywords or character aliases found in this scene's text. Type <span style={{ color: 'var(--primary)' }}>@</span> to mention entities.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {detectedCodex.map(item => (
                        <div 
                          key={item.id} 
                          onClick={() => setActiveLorePreview(item)}
                          style={{
                            padding: '10px',
                            background: 'rgba(167, 139, 250, 0.06)',
                            border: '1px solid rgba(167, 139, 250, 0.15)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'var(--transition-smooth)'
                          }}
                          className="hover-card"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span style={{ fontWeight: 600, color: '#ffffff' }}>{item.name}</span>
                            <span style={{ fontSize: '9px', color: 'var(--secondary)', textTransform: 'uppercase', padding: '2px 4px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)' }}>
                              {item.category}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 2. AI CO-WRITER & CHAT TAB */}
            {rightTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '350px' }}>
                
                {/* Style Quick Settings Toggle */}
                <div style={{ marginBottom: '12px' }}>
                  <button
                    onClick={() => setShowStyleSettings(!showStyleSettings)}
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '11px', padding: '6px', justifyContent: 'space-between' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sliders size={12} /> Narrative Style Presets
                    </span>
                    <span>{showStyleSettings ? '▲ Hide' : '▼ Tweak'}</span>
                  </button>

                  {showStyleSettings && (
                    <div 
                      className="glass-panel" 
                      style={{ 
                        marginTop: '8px', 
                        padding: '10px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '8px',
                        fontSize: '11px',
                        background: 'rgba(0,0,0,0.3)'
                      }}
                    >
                      <div>
                        <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>POV</label>
                        <select 
                          value={stylePov} 
                          onChange={(e) => setStylePov(e.target.value)}
                          className="input"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                        >
                          <option value="default">Use Global Setting</option>
                          <option value="third_limited">3rd Person Limited</option>
                          <option value="first_person">1st Person</option>
                          <option value="third_omniscient">3rd Person Omniscient</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>Tense</label>
                        <select 
                          value={styleTense} 
                          onChange={(e) => setStyleTense(e.target.value)}
                          className="input"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                        >
                          <option value="default">Use Global Setting</option>
                          <option value="past">Past Tense</option>
                          <option value="present">Present Tense</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>Tone</label>
                        <select 
                          value={styleTone} 
                          onChange={(e) => setStyleTone(e.target.value)}
                          className="input"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                        >
                          <option value="default">Use Global Setting</option>
                          <option value="Balanced Narrative">Balanced Narrative</option>
                          <option value="Grimdark & Gritty">Grimdark & Gritty</option>
                          <option value="Lyrical & Atmospheric">Lyrical & Atmospheric</option>
                          <option value="Fast-Paced Action">Fast-Paced Action</option>
                          <option value="Humorous & Witty">Humorous & Witty</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {aiError && (
                  <div style={{ color: '#f87171', backgroundColor: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <AlertCircle size={14} /> {aiError}
                  </div>
                )}

                {/* Messages container */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', overflowY: 'auto', maxHeight: '350px', paddingRight: '4px' }}>
                  {chatMessages.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '30px 10px' }}>
                      Ask me anything! I know about your characters, locations, and the current manuscript outline.
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div 
                        key={idx}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          lineHeight: '1.4',
                          maxWidth: '90%',
                          alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          backgroundColor: msg.role === 'user' ? 'rgba(129, 140, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                          border: msg.role === 'user' ? '1px solid rgba(129, 140, 248, 0.3)' : '1px solid var(--border-light)'
                        }}
                      >
                        <div style={{ fontSize: '11px', color: msg.role === 'user' ? 'var(--primary)' : 'var(--secondary)', marginBottom: '3px', fontWeight: 600 }}>
                          {msg.role === 'user' ? 'Author' : 'Co-Writer'}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', color: '#ffffff' }}>
                          {msg.content || (aiLoading && idx === chatMessages.length - 1 ? '...' : '')}
                        </div>
                        {msg.role === 'assistant' && msg.content && (
                          <button
                            onClick={() => insertChatOutput(msg.content)}
                            className="btn btn-secondary"
                            style={{ 
                              padding: '2px 6px', 
                              fontSize: '10px', 
                              marginTop: '8px', 
                              width: '100%', 
                              textAlign: 'center' 
                            }}
                          >
                            Insert into Manuscript
                          </button>
                        )}
                      </div>
                    ))
                  )}
                  {aiLoading && streamingAction === 'chat' && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
                      <button 
                        onClick={handleStopAI}
                        className="btn" 
                        style={{ padding: '4px 10px', fontSize: '11px', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                      >
                        <Square size={10} style={{ fill: '#f87171' }} /> Stop Streaming
                      </button>
                    </div>
                  )}
                </div>

                {/* Chat Form */}
                <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="e.g. Brainstorm Eldrin's dialog..."
                    className="input"
                    disabled={aiLoading}
                    style={{ fontSize: '13px' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px' }} disabled={aiLoading || !chatInput.trim()}>
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}

            {/* 3. HISTORY & SNAPSHOTS TAB */}
            {rightTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={() => setIsCreateSnapshotModalOpen(true)}
                  className="btn btn-primary"
                  style={{ width: '100%', fontSize: '12px', padding: '8px' }}
                >
                  <Plus size={14} /> Take Manual Snapshot
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {snapshotLoading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '20px' }}>
                      Loading versions...
                    </div>
                  ) : snapshots.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '20px' }}>
                      No snapshots recorded yet. Manual snapshots or pre-AI snapshots will appear here.
                    </div>
                  ) : (
                    snapshots.map(snap => (
                      <div 
                        key={snap.id}
                        className="glass-panel"
                        style={{
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          border: '1px solid var(--border-light)',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontWeight: 600, fontSize: '12px', color: '#ffffff', wordBreak: 'break-word' }}>
                            {snap.label}
                          </span>
                          <span 
                            style={{ 
                              fontSize: '10px', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              backgroundColor: getSourceBadgeColor(snap.source),
                              color: getSourceBadgeTextColor(snap.source),
                              textTransform: 'uppercase',
                              fontWeight: 600,
                              flexShrink: 0
                            }}
                          >
                            {snap.source.replace('_', ' ')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                          <span>{new Date(snap.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          <span>{snap.word_count} words</span>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                          <button
                            onClick={() => handlePreviewSnapshot(snap.id)}
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '4px', fontSize: '11px' }}
                            title="Preview Content"
                          >
                            <Eye size={11} /> View
                          </button>
                          <button
                            onClick={() => handleRestoreSnapshot(snap.id)}
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '4px', fontSize: '11px', color: 'var(--status-done)', borderColor: 'rgba(34, 197, 94, 0.3)' }}
                            title="Restore this version"
                          >
                            <RotateCcw size={11} /> Restore
                          </button>
                          <button
                            onClick={() => handleDeleteSnapshot(snap.id)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 6px', fontSize: '11px', color: '#f87171' }}
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        </aside>
      )}

      {/* SPRINT CONFIGURATION MODAL */}
      {isSprintModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Timer size={18} style={{ color: 'var(--secondary)' }} />
                <h3 style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'var(--font-display)' }}>Start Writing Sprint</h3>
              </div>
              <button onClick={() => setIsSprintModalOpen(false)} className="btn btn-secondary" style={{ padding: '4px' }}>
                <X size={14} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Timed sprint mode locks distraction out and records how many words you draft within the target window.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {[15, 20, 30].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleStartSprint(mins)}
                  className="btn btn-secondary"
                  style={{ padding: '12px 6px', flexDirection: 'column', gap: '2px', borderColor: mins === 20 ? 'var(--primary)' : undefined }}
                >
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>{mins} min</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{mins === 20 ? 'Pomodoro' : 'Sprint'}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setIsSprintModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SPRINT CELEBRATION SUMMARY MODAL */}
      {sprintSummary && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(234, 179, 8, 0.2)', border: '2px solid #fde047', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flame size={28} style={{ color: '#fde047' }} />
              </div>
            </div>

            <h3 style={{ fontSize: '20px', color: '#ffffff', fontFamily: 'var(--font-display)', marginBottom: '6px' }}>
              Sprint Complete!
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Great drafting session! Here are your sprint results:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
              <div className="glass-panel" style={{ padding: '12px 6px' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#4ade80' }}>+{sprintSummary.words}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Words Written</div>
              </div>
              <div className="glass-panel" style={{ padding: '12px 6px' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>{sprintSummary.minutes}m</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Duration</div>
              </div>
              <div className="glass-panel" style={{ padding: '12px 6px' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>{sprintSummary.wpm}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Words / Min</div>
              </div>
            </div>

            <button onClick={() => setSprintSummary(null)} className="btn btn-primary" style={{ width: '100%' }}>
              Awesome, Keep Writing!
            </button>
          </div>
        </div>
      )}

      {/* QUICK LORE PREVIEW MODAL */}
      {activeLorePreview && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getCodexIcon(activeLorePreview.category)}
                <h3 style={{ fontSize: '18px', color: '#ffffff' }}>{activeLorePreview.name}</h3>
              </div>
              <span className="badge badge-primary">{activeLorePreview.category}</span>
            </div>

            {activeLorePreview.aliases && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                <strong>Aliases:</strong> {activeLorePreview.aliases}
              </div>
            )}

            <div style={{ margin: '12px 0', fontSize: '13px', lineHeight: '1.6', color: 'rgba(255,255,255,0.9)', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
              {activeLorePreview.description || 'No description provided.'}
            </div>

            {activeLorePreview.notes && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', background: 'rgba(129, 140, 248, 0.05)', padding: '8px 12px', borderRadius: '6px' }}>
                <strong>Author Notes:</strong> {activeLorePreview.notes}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  insertChatOutput(activeLorePreview.name);
                  setActiveLorePreview(null);
                }}
              >
                Insert Name
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveLorePreview(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE SNAPSHOT MODAL */}
      {isCreateSnapshotModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#ffffff', marginBottom: '12px' }}>
              Create Scene Snapshot
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>
              Record a historical point-in-time copy of your scene manuscript.
            </p>

            <form onSubmit={handleCreateSnapshot} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label">Snapshot Label / Reason</label>
                <input
                  type="text"
                  value={newSnapshotLabel}
                  onChange={(e) => setNewSnapshotLabel(e.target.value)}
                  placeholder="e.g. Before climax revision"
                  className="input"
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateSnapshotModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Snapshot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW SNAPSHOT MODAL */}
      {previewSnapshot && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', color: '#ffffff' }}>{previewSnapshot.label}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Recorded on {new Date(previewSnapshot.created_at).toLocaleString()} • {previewSnapshot.word_count} words
                </span>
              </div>
              <button 
                onClick={() => setPreviewSnapshot(null)}
                className="btn btn-secondary"
                style={{ padding: '6px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div 
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '16px', 
                backgroundColor: 'rgba(0,0,0,0.3)', 
                borderRadius: '8px', 
                border: '1px solid var(--border-light)',
                whiteSpace: 'pre-wrap',
                fontSize: '14px',
                lineHeight: '1.7',
                color: 'rgba(255,255,255,0.85)',
                margin: '12px 0'
              }}
            >
              {previewSnapshot.content || '<Empty Content>'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <button
                onClick={() => handleDeleteSnapshot(previewSnapshot.id)}
                className="btn btn-secondary"
                style={{ color: '#f87171', fontSize: '12px' }}
              >
                <Trash2 size={13} /> Delete Snapshot
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPreviewSnapshot(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleRestoreSnapshot(previewSnapshot.id)}
                >
                  <RotateCcw size={14} /> Restore to Active Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REWRITE DIALOG MODAL (Streaming) */}
      {isRewriteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', marginBottom: '14px', color: '#ffffff' }}>
              Rewrite Highlighted Selection
            </h2>
            
            <div style={{ margin: '12px 0' }}>
              <label className="label">Original Selected Text</label>
              <div 
                style={{ 
                  padding: '10px', 
                  fontSize: '13px', 
                  maxHeight: '90px', 
                  overflowY: 'auto', 
                  border: '1px solid var(--border-light)', 
                  borderRadius: '6px',
                  background: 'rgba(0,0,0,0.2)',
                  fontStyle: 'italic'
                }}
              >
                "{selection}"
              </div>
            </div>

            {streamedRewriteResult ? (
              <div style={{ margin: '12px 0' }}>
                <label className="label" style={{ color: 'var(--primary)' }}>Transformed Result (Preview)</label>
                <div 
                  style={{ 
                    padding: '12px', 
                    fontSize: '14px', 
                    lineHeight: '1.6', 
                    maxHeight: '180px', 
                    overflowY: 'auto', 
                    border: '1px solid var(--primary)', 
                    borderRadius: '6px',
                    background: 'rgba(129, 140, 248, 0.05)',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {streamedRewriteResult}
                  {aiLoading && <span className="spin"> ✍️</span>}
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleAIAction('rewrite'); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="label">Instructions for rewrite</label>
                  <input 
                    type="text" 
                    value={rewriteInstruction} 
                    onChange={(e) => setRewriteInstruction(e.target.value)} 
                    className="input" 
                    placeholder="e.g. Make it more visceral, concise, add rain atmosphere..."
                    required 
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setIsRewriteModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={aiLoading}>
                    {aiLoading ? 'Transforming...' : 'Stream Transformation'}
                  </button>
                </div>
              </form>
            )}

            {streamedRewriteResult && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                {aiLoading ? (
                  <button onClick={handleStopAI} className="btn" style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>
                    <Square size={12} style={{ fill: '#f87171' }} /> Stop Generating
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setStreamedRewriteResult('');
                      handleAIAction('rewrite');
                    }} 
                    className="btn btn-secondary"
                    style={{ fontSize: '12px' }}
                  >
                    <RefreshCw size={12} /> Regenerate
                  </button>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setIsRewriteModalOpen(false);
                      setStreamedRewriteResult('');
                    }}
                  >
                    Discard
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleApplyRewrite}
                    disabled={aiLoading}
                  >
                    <Check size={14} /> Apply to Manuscript
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
