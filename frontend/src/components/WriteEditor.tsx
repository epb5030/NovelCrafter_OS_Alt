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
  AlertCircle
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

export const WriteEditor: React.FC<WriteEditorProps> = ({ projectId, apiBase, activeProvider }) => {
  const [elements, setElements] = useState<OutlineElement[]>([]);
  const [codex, setCodex] = useState<CodexEntry[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<number | null>(null);
  
  // Editor States
  const [editorText, setEditorText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('');
  
  // Right Sidebar States
  const [rightTab, setRightTab] = useState<'info' | 'ai'>('info');
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  
  // AI Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  
  // Selection Rewrite states
  const [selection, setSelection] = useState('');
  const [rewriteInstruction, setRewriteInstruction] = useState('');
  const [isRewriteModalOpen, setIsRewriteModalOpen] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const autosaveTimeoutRef = useRef<any>(null);

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

        // Select first scene if none selected
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
    // Clear chat on project change
    setChatMessages([]);
  }, [projectId]);

  const handleSelectScene = async (sceneId: number) => {
    // Save current active scene first if exists
    if (activeSceneId !== null) {
      await saveSceneContent(activeSceneId, editorText);
    }

    setActiveSceneId(sceneId);
    setEditorText('');
    setLastSaved('');
    
    try {
      const res = await fetch(`${apiBase}/scenes/${sceneId}/content`);
      if (res.ok) {
        const data = await res.json();
        setEditorText(data.content || '');
        if (data.last_saved_at) {
          setLastSaved(new Date(data.last_saved_at).toLocaleTimeString());
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Autosave content
  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEditorText(value);

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    if (activeSceneId) {
      setIsSaving(true);
      autosaveTimeoutRef.current = setTimeout(() => {
        saveSceneContent(activeSceneId, value);
      }, 1500); // Autosave after 1.5s pause
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

  // AI ACTIONS
  const handleAIAction = async (action: 'continue' | 'rewrite' | 'summarize') => {
    if (!activeSceneId) return;
    setAiLoading(true);
    setAiError('');

    try {
      let payload: any = {
        sceneId: activeSceneId,
        action
      };

      if (action === 'rewrite') {
        if (!selection) {
          alert('Please highlight a block of text in your editor to rewrite.');
          setAiLoading(false);
          return;
        }
        payload.selection = selection;
        payload.prompt = rewriteInstruction;
      } else if (action === 'summarize') {
        payload.selection = selection || editorText;
      }

      const res = await fetch(`${apiBase}/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'AI request failed');
      }

      const data = await res.json();
      const generated = data.text;

      if (action === 'continue') {
        // Append generated text
        const space = editorText.endsWith(' ') || editorText.endsWith('\n') ? '' : ' ';
        const newText = editorText + space + generated;
        setEditorText(newText);
        saveSceneContent(activeSceneId, newText);
      } else if (action === 'rewrite') {
        // Replace selection
        if (editorRef.current) {
          const start = editorRef.current.selectionStart;
          const end = editorRef.current.selectionEnd;
          const newText = editorText.substring(0, start) + generated + editorText.substring(end);
          setEditorText(newText);
          saveSceneContent(activeSceneId, newText);
          setIsRewriteModalOpen(false);
          setRewriteInstruction('');
        }
      } else if (action === 'summarize') {
        const activeScene = elements.find(el => el.id === activeSceneId);
        if (!activeScene) throw new Error('Active scene not found in index');

        // Save summary back to outline
        await fetch(`${apiBase}/projects/${projectId}/outline/${activeSceneId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: activeScene.title,
            position: activeScene.position,
            summary: generated,
            status: activeScene.status,
            metadata: activeScene.metadata
          })
        });
        await fetchStructure();
        alert('Scene summary updated using manuscript!');
      }
    } catch (err: any) {
      setAiError(err.message || 'Error running AI action');
    } finally {
      setAiLoading(false);
    }
  };

  // AI Chat Submit
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeSceneId) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setAiLoading(true);
    setAiError('');

    try {
      const res = await fetch(`${apiBase}/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: activeSceneId,
          action: 'chat',
          prompt: userMessage.content,
          history: chatMessages
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'AI chat failed');
      }

      const data = await res.json();
      const assistantMessage: ChatMessage = { role: 'assistant', content: data.text };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setAiError(err.message || 'Error calling chatbot');
    } finally {
      setAiLoading(false);
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

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }} className="animate-scale">
      
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
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)' }}>
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
                  <button 
                    onClick={() => handleAIAction('continue')}
                    disabled={aiLoading}
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    title="Generate narrative prose continuing from your cursor"
                  >
                    <Sparkles size={13} /> Continue Writing
                  </button>

                  {selection && (
                    <button 
                      onClick={() => setIsRewriteModalOpen(true)}
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
                  >
                    {isRightSidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Main Rich text editor area */}
            <div style={{ flex: 1, padding: '40px 60px', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
              <textarea
                ref={editorRef}
                value={editorText}
                onChange={handleEditorChange}
                onSelect={handleTextSelect}
                placeholder="Once upon a time, in a land forgotten by cartographers..."
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
            </div>

            {/* Word Count Footer */}
            <div 
              style={{ 
                padding: '8px 24px', 
                borderTop: '1px solid var(--border-light)', 
                fontSize: '12px', 
                color: 'var(--text-muted)', 
                display: 'flex', 
                justifyContent: 'space-between',
                flexShrink: 0,
                background: 'rgba(0, 0, 0, 0.2)'
              }}
            >
              <span>Words: {editorText ? editorText.trim().split(/\s+/).length : 0}</span>
              <span>Characters: {editorText.length}</span>
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

      {/* RIGHT SIDEBAR PANEL: Scene Info & AI Chat Context */}
      {activeScene && isRightSidebarOpen && (
        <aside
          style={{
            width: '320px',
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
                padding: '14px',
                background: rightTab === 'info' ? 'rgba(255,255,255,0.03)' : 'transparent',
                border: 'none',
                color: rightTab === 'info' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                borderBottom: rightTab === 'info' ? '2px solid var(--primary)' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Info size={14} /> Scene Info
            </button>
            <button
              onClick={() => setRightTab('ai')}
              style={{
                flex: 1,
                padding: '14px',
                background: rightTab === 'ai' ? 'rgba(255,255,255,0.03)' : 'transparent',
                border: 'none',
                color: rightTab === 'ai' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                borderBottom: rightTab === 'ai' ? '2px solid var(--primary)' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <MessageSquare size={14} /> AI Assistant
            </button>
          </div>

          {/* Panel body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {rightTab === 'info' ? (
              <>
                {/* Scene summary element */}
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

                {/* Detected Codex elements in current text */}
                <div>
                  <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.05em' }}>
                    World Lore Detected ({detectedCodex.length})
                  </h4>
                  
                  {detectedCodex.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '6px 0' }}>
                      No codex keywords or character aliases found in this scene's text.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {detectedCodex.map(item => (
                        <div 
                          key={item.id}
                          style={{
                            padding: '10px',
                            background: 'rgba(167, 139, 250, 0.06)',
                            border: '1px solid rgba(167, 139, 250, 0.15)',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                        >
                          <div style={{ fontWeight: 600, color: '#ffffff', marginBottom: '2px' }}>
                            {item.name} <span style={{ fontSize: '10px', color: 'var(--secondary)', textTransform: 'uppercase' }}>({item.category})</span>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{item.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* AI CHAT VIEW */
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '350px' }}>
                
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
                        <div style={{ whiteSpace: 'pre-wrap', color: '#ffffff' }}>{msg.content}</div>
                        {msg.role === 'assistant' && (
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
                  {aiLoading && (
                    <div style={{ alignSelf: 'flex-start', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Co-Writer is thinking...
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
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px' }} disabled={aiLoading}>
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}

          </div>
        </aside>
      )}

      {/* REWRITE DIALOG MODAL */}
      {isRewriteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', marginBottom: '14px', color: '#ffffff' }}>
              Rewrite Highlighted Selection
            </h2>
            
            <div style={{ margin: '12px 0' }}>
              <label className="label">Your Selected Text</label>
              <div 
                style={{ 
                  padding: '10px', 
                  fontSize: '13px', 
                  maxHeight: '100px', 
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

            <form onSubmit={(e) => { e.preventDefault(); handleAIAction('rewrite'); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label">Instructions for rewrite</label>
                <input 
                  type="text" 
                  value={rewriteInstruction} 
                  onChange={(e) => setRewriteInstruction(e.target.value)} 
                  className="input" 
                  placeholder="e.g. Make it more gothic, make it concise, add description of rain..."
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
                  {aiLoading ? 'Rewriting...' : 'Transform Text'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
