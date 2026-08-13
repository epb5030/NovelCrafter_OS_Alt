import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Plus, 
  Sparkles, 
  Trash2, 
  Edit3, 
  User, 
  BookOpen, 
  Layers, 
  Filter, 
  Search, 
  Check, 
  X, 
  Milestone, 
  RefreshCw,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export type TimelineTrack = 'main_story' | 'character_backstory' | 'world_history' | 'subplot';
export type TimelineImportance = 'major' | 'turning_point' | 'normal' | 'minor';

export interface TimelineEvent {
  id: number;
  project_id: number;
  track: TimelineTrack;
  title: string;
  date_label: string;
  order_index: number;
  description?: string;
  importance: TimelineImportance;
  scene_id?: number;
  scene_title?: string;
  character_id?: number;
  character_name?: string;
  color?: string;
  created_at: string;
}

interface OutlineSceneOption {
  id: number;
  title: string;
  position: number;
}

interface CharacterOption {
  id: number;
  name: string;
}

interface TimelineStudioProps {
  projectId: number;
  apiBase: string;
  onNavigateToScene?: (sceneId: number) => void;
}

const TRACK_CONFIGS: Record<TimelineTrack, { label: string; icon: any; color: string; bg: string; border: string }> = {
  main_story: {
    label: 'Main Story Arc',
    icon: BookOpen,
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.1)',
    border: 'rgba(251, 191, 36, 0.3)'
  },
  character_backstory: {
    label: 'Character Backstories & Lifelines',
    icon: User,
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.1)',
    border: 'rgba(56, 189, 248, 0.3)'
  },
  world_history: {
    label: 'World Lore & Historical Eras',
    icon: Layers,
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.1)',
    border: 'rgba(167, 139, 250, 0.3)'
  },
  subplot: {
    label: 'Subplots & Secret Threads',
    icon: Milestone,
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.1)',
    border: 'rgba(52, 211, 153, 0.3)'
  }
};

export const TimelineStudio: React.FC<TimelineStudioProps> = ({
  projectId,
  apiBase,
  onNavigateToScene
}) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [scenes, setScenes] = useState<OutlineSceneOption[]>([]);
  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleTracks, setVisibleTracks] = useState<Record<TimelineTrack, boolean>>({
    main_story: true,
    character_backstory: true,
    world_history: true,
    subplot: true
  });

  // Event Modal Form
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [formTrack, setFormTrack] = useState<TimelineTrack>('main_story');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDateLabel, setFormDateLabel] = useState<string>('');
  const [formOrderIndex, setFormOrderIndex] = useState<number>(100);
  const [formDescription, setFormDescription] = useState<string>('');
  const [formImportance, setFormImportance] = useState<TimelineImportance>('normal');
  const [formSceneId, setFormSceneId] = useState<number | undefined>(undefined);
  const [formCharacterId, setFormCharacterId] = useState<number | undefined>(undefined);
  const [formColor, setFormColor] = useState<string>('#c89d54');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Fetch Timeline Data
  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/projects/${projectId}/timeline`);
      if (!res.ok) throw new Error('Failed to load timeline');
      const data = await res.json();
      setEvents(data.events || []);
      setScenes(data.scenes || []);
      setCharacters(data.characters || []);
    } catch (err) {
      console.error('Error fetching timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelineData();
  }, [projectId]);

  // Open Create Modal
  const handleOpenCreateModal = (track: TimelineTrack = 'main_story') => {
    setEditingEvent(null);
    setFormTrack(track);
    setFormTitle('');
    setFormDateLabel('Day 1');
    const maxIdx = events.length > 0 ? Math.max(...events.map(e => e.order_index)) : 0;
    setFormOrderIndex(maxIdx + 10);
    setFormDescription('');
    setFormImportance('normal');
    setFormSceneId(undefined);
    setFormCharacterId(undefined);
    setFormColor(TRACK_CONFIGS[track].color);
    setIsEventModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (event: TimelineEvent) => {
    setEditingEvent(event);
    setFormTrack(event.track);
    setFormTitle(event.title);
    setFormDateLabel(event.date_label);
    setFormOrderIndex(event.order_index);
    setFormDescription(event.description || '');
    setFormImportance(event.importance);
    setFormSceneId(event.scene_id);
    setFormCharacterId(event.character_id);
    setFormColor(event.color || TRACK_CONFIGS[event.track].color);
    setIsEventModalOpen(true);
  };

  // Save Event (Create or Update)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setIsSaving(true);

    const payload = {
      track: formTrack,
      title: formTitle.trim(),
      dateLabel: formDateLabel.trim(),
      orderIndex: Number(formOrderIndex),
      description: formDescription.trim(),
      importance: formImportance,
      sceneId: formSceneId || null,
      characterId: formCharacterId || null,
      color: formColor
    };

    try {
      if (editingEvent) {
        const res = await fetch(`${apiBase}/projects/${projectId}/timeline/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const updated = await res.json();
          setEvents(prev => prev.map(ev => ev.id === editingEvent.id ? updated : ev));
          setIsEventModalOpen(false);
        }
      } else {
        const res = await fetch(`${apiBase}/projects/${projectId}/timeline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const created = await res.json();
          setEvents(prev => [...prev, created].sort((a, b) => a.order_index - b.order_index));
          setIsEventModalOpen(false);
        }
      }
    } catch (err) {
      console.error('Error saving timeline event:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Event
  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this timeline event?')) return;
    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/timeline/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setEvents(prev => prev.filter(ev => ev.id !== id));
      }
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const handleReorderTimelineEvent = async (eventId: number, direction: 'left' | 'right', currentTrack: TimelineTrack) => {
    const trackEvents = eventsByTrack[currentTrack];
    const idx = trackEvents.findIndex(e => e.id === eventId);
    if (idx === -1) return;

    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= trackEvents.length) return;

    const currentEvt = trackEvents[idx];
    const otherEvt = trackEvents[targetIdx];

    const reordered = [
      { id: currentEvt.id, orderIndex: otherEvt.order_index, track: currentTrack },
      { id: otherEvt.id, orderIndex: currentEvt.order_index, track: currentTrack }
    ];

    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/timeline/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: reordered })
      });
      if (res.ok) {
        fetchTimelineData();
      }
    } catch (err) {
      console.error('Failed to reorder timeline event:', err);
    }
  };

  const handleTransferTrack = async (eventId: number, newTrack: TimelineTrack) => {
    const evt = events.find(e => e.id === eventId);
    if (!evt || evt.track === newTrack) return;

    const targetTrackEvents = eventsByTrack[newTrack];
    const newOrderIdx = targetTrackEvents.length > 0 ? targetTrackEvents[targetTrackEvents.length - 1].order_index + 1 : 1;

    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/timeline/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [{ id: eventId, track: newTrack, orderIndex: newOrderIdx }]
        })
      });
      if (res.ok) {
        fetchTimelineData();
      }
    } catch (err) {
      console.error('Failed to transfer timeline event track:', err);
    }
  };

  // Auto-Generate Timeline
  const handleAutoGenerate = async () => {
    setIsGenerating(true);
    setStatusMessage('');
    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/timeline/auto-generate`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setStatusMessage(data.message || 'Timeline generated successfully!');
        await fetchTimelineData();
        setTimeout(() => setStatusMessage(''), 4000);
      }
    } catch (err) {
      setStatusMessage('Failed to generate timeline.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (!visibleTracks[e.track]) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchDate = e.date_label.toLowerCase().includes(q);
        const matchDesc = e.description && e.description.toLowerCase().includes(q);
        const matchChar = e.character_name && e.character_name.toLowerCase().includes(q);
        const matchScene = e.scene_title && e.scene_title.toLowerCase().includes(q);
        return matchTitle || matchDate || matchDesc || matchChar || matchScene;
      }
      return true;
    });
  }, [events, visibleTracks, searchQuery]);

  // Group events by tracks
  const eventsByTrack = useMemo(() => {
    const map: Record<TimelineTrack, TimelineEvent[]> = {
      main_story: [],
      character_backstory: [],
      world_history: [],
      subplot: []
    };
    filteredEvents.forEach(e => {
      if (map[e.track]) map[e.track].push(e);
    });
    return map;
  }, [filteredEvents]);

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={24} className="spin" style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 12px auto' }} />
        <p>Loading Multi-Track Chronology Studio...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
      
      {/* Top Header & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={22} style={{ color: 'var(--primary)' }} /> Interactive Multi-Track Story Timeline
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Plot parallel chronologies across Main Story events, Character Backstories, World Lore, and Subplots.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Search Filter */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search timeline events..."
              className="input"
              style={{ paddingLeft: '30px', fontSize: '12px', width: '200px' }}
            />
          </div>

          {/* Auto-Generate Button */}
          <button
            type="button"
            onClick={handleAutoGenerate}
            disabled={isGenerating}
            className="btn btn-secondary"
            style={{ fontSize: '12px', gap: '6px' }}
            title="Auto-extract events from outline scenes and Codex world lore"
          >
            {isGenerating ? (
              <RefreshCw size={13} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Sparkles size={13} style={{ color: 'var(--primary)' }} />
            )}
            {isGenerating ? 'Generating...' : 'Auto-Generate Timeline'}
          </button>

          {/* Add Event Button */}
          <button
            type="button"
            onClick={() => handleOpenCreateModal('main_story')}
            className="btn btn-primary"
            style={{ fontSize: '12px', gap: '6px' }}
          >
            <Plus size={14} /> Add Timeline Event
          </button>
        </div>
      </div>

      {statusMessage && (
        <div style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={14} /> {statusMessage}
        </div>
      )}

      {/* Track Visibility Filter Bar */}
      <div className="glass-panel" style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <Filter size={14} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 600, color: '#ffffff' }}>Visible Tracks:</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {(Object.keys(TRACK_CONFIGS) as TimelineTrack[]).map(trackKey => {
            const cfg = TRACK_CONFIGS[trackKey];
            const isVis = visibleTracks[trackKey];
            const count = eventsByTrack[trackKey].length;

            return (
              <button
                key={trackKey}
                type="button"
                onClick={() => setVisibleTracks(prev => ({ ...prev, [trackKey]: !prev[trackKey] }))}
                className="btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  borderRadius: '16px',
                  background: isVis ? cfg.bg : 'rgba(0,0,0,0.3)',
                  borderColor: isVis ? cfg.border : 'var(--border-light)',
                  color: isVis ? cfg.color : 'var(--text-muted)',
                  gap: '6px'
                }}
              >
                {isVis ? <Eye size={12} /> : <EyeOff size={12} />}
                <span>{cfg.label} ({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Multi-Track Horizontal Scroll Canvas */}
      <div 
        style={{ 
          flex: 1, 
          overflow: 'auto', 
          backgroundColor: 'rgba(0,0,0,0.25)', 
          border: '1px solid var(--border-light)', 
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Clock size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
            <h3 style={{ color: '#ffffff', fontSize: '16px', marginBottom: '6px' }}>No Timeline Events Plotted Yet</h3>
            <p style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto 16px auto' }}>
              Create custom events or click "Auto-Generate Timeline" to extract chronological markers from your scenes and Codex lore.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button onClick={handleAutoGenerate} className="btn btn-primary" style={{ fontSize: '12px' }}>
                <Sparkles size={14} /> Auto-Generate from Manuscript
              </button>
              <button onClick={() => handleOpenCreateModal('main_story')} className="btn btn-secondary" style={{ fontSize: '12px' }}>
                <Plus size={14} /> Add First Event
              </button>
            </div>
          </div>
        ) : (
          (Object.keys(TRACK_CONFIGS) as TimelineTrack[]).map(trackKey => {
            if (!visibleTracks[trackKey]) return null;
            const cfg = TRACK_CONFIGS[trackKey];
            const trackEvents = eventsByTrack[trackKey];
            const TrackIcon = cfg.icon;

            return (
              <div 
                key={trackKey} 
                className="glass-panel" 
                style={{ 
                  padding: '14px 16px', 
                  borderRadius: 'var(--radius-md)', 
                  borderLeft: `4px solid ${cfg.color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Track Title Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrackIcon size={16} style={{ color: cfg.color }} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      ({trackEvents.length} events)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenCreateModal(trackKey)}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '11px', gap: '4px' }}
                  >
                    <Plus size={12} /> Add to Track
                  </button>
                </div>

                {/* Horizontal Scrollable Timeline Ribbon */}
                <div 
                  style={{ 
                    display: 'flex', 
                    gap: '14px', 
                    overflowX: 'auto', 
                    paddingBottom: '8px',
                    minHeight: '120px',
                    alignItems: 'stretch'
                  }}
                >
                  {trackEvents.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px 0' }}>
                      No events in this track yet. Click "Add to Track" to place a chronological beat.
                    </div>
                  ) : (
                    trackEvents.map(event => {
                      let badgeBg = 'rgba(255,255,255,0.06)';
                      let badgeColor = 'var(--text-secondary)';
                      let borderStyle = '1px solid var(--border-light)';

                      if (event.importance === 'major') {
                        badgeBg = 'rgba(239, 68, 68, 0.15)';
                        badgeColor = '#ef4444';
                        borderStyle = '1px solid rgba(239, 68, 68, 0.4)';
                      } else if (event.importance === 'turning_point') {
                        badgeBg = 'rgba(251, 191, 36, 0.15)';
                        badgeColor = '#fbbf24';
                        borderStyle = '1px solid rgba(251, 191, 36, 0.4)';
                      }

                      return (
                        <div
                          key={event.id}
                          style={{
                            minWidth: '220px',
                            maxWidth: '260px',
                            backgroundColor: 'rgba(0,0,0,0.35)',
                            border: borderStyle,
                            borderRadius: 'var(--radius-sm)',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '8px',
                            position: 'relative',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                          }}
                        >
                          {/* Card Top: Date & Importance Badge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                            <span 
                              style={{ 
                                fontSize: '10px', 
                                fontWeight: 700, 
                                color: cfg.color, 
                                backgroundColor: 'rgba(0,0,0,0.4)', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                textTransform: 'uppercase'
                              }}
                            >
                              📅 {event.date_label}
                            </span>

                            {event.importance !== 'normal' && (
                              <span 
                                style={{ 
                                  fontSize: '9px', 
                                  fontWeight: 700, 
                                  color: badgeColor, 
                                  backgroundColor: badgeBg, 
                                  padding: '1px 5px', 
                                  borderRadius: '3px',
                                  textTransform: 'uppercase'
                                }}
                              >
                                {event.importance === 'major' ? '🔥 Climax' : event.importance === 'turning_point' ? '⚡ Turning Point' : 'Minor'}
                              </span>
                            )}
                          </div>

                          {/* Event Title & Description */}
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
                              {event.title}
                            </div>
                            {event.description && (
                              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {event.description}
                              </p>
                            )}
                          </div>

                          {/* Linked Metadata Tags */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                            {event.character_name && (
                              <span style={{ fontSize: '10px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 5px', borderRadius: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <User size={10} /> {event.character_name}
                              </span>
                            )}
                            {event.scene_title && (
                              <span 
                                onClick={() => event.scene_id && onNavigateToScene?.(event.scene_id)}
                                style={{ 
                                  fontSize: '10px', 
                                  color: '#fbbf24', 
                                  background: 'rgba(251, 191, 36, 0.12)', 
                                  padding: '2px 5px', 
                                  borderRadius: '3px', 
                                  cursor: onNavigateToScene ? 'pointer' : 'default',
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '3px' 
                                }}
                                title={`Open "${event.scene_title}" in manuscript editor`}
                              >
                                <BookOpen size={10} /> {event.scene_title}
                              </span>
                            )}
                          </div>

                          {/* Actions Bottom Bar */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px', marginTop: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <button
                                type="button"
                                onClick={() => handleReorderTimelineEvent(event.id, 'left', trackKey)}
                                title="Shift Left in Track"
                                className="btn btn-secondary"
                                style={{ padding: '2px 5px', fontSize: '10px' }}
                              >
                                <ChevronLeft size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReorderTimelineEvent(event.id, 'right', trackKey)}
                                title="Shift Right in Track"
                                className="btn btn-secondary"
                                style={{ padding: '2px 5px', fontSize: '10px' }}
                              >
                                <ChevronRight size={11} />
                              </button>
                            </div>

                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <select
                                value={event.track}
                                onChange={(e) => handleTransferTrack(event.id, e.target.value as TimelineTrack)}
                                title="Move to another track"
                                style={{ fontSize: '9px', padding: '2px 4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: 'var(--text-muted)', borderRadius: '3px' }}
                              >
                                <option value="main_story">Main Story</option>
                                <option value="character_backstory">Backstory</option>
                                <option value="world_history">World History</option>
                                <option value="subplot">Subplot</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(event)}
                                className="btn btn-secondary"
                                style={{ padding: '2px 5px', fontSize: '10px' }}
                                title="Edit Timeline Event"
                              >
                                <Edit3 size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEvent(event.id)}
                                className="btn btn-secondary"
                                style={{ padding: '2px 5px', fontSize: '10px', color: '#f87171' }}
                                title="Delete Event"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* EVENT CREATOR & EDITOR MODAL */}
      {isEventModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 120 }}>
          <div 
            className="modal-content animate-scale" 
            style={{ 
              maxWidth: '520px', 
              padding: '24px', 
              background: 'var(--bg-panel)', 
              border: '1px solid var(--border-light)', 
              boxShadow: 'var(--shadow-premium)' 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ color: '#ffffff', fontSize: '16px' }}>
                  {editingEvent ? 'Edit Timeline Event' : 'Create Timeline Event'}
                </h3>
              </div>
              <button onClick={() => setIsEventModalOpen(false)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Track Selection */}
              <div>
                <label className="label">Timeline Track</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {(Object.keys(TRACK_CONFIGS) as TimelineTrack[]).map(trackKey => {
                    const cfg = TRACK_CONFIGS[trackKey];
                    const TrackIcon = cfg.icon;
                    return (
                      <button
                        key={trackKey}
                        type="button"
                        onClick={() => setFormTrack(trackKey)}
                        className="btn"
                        style={{
                          padding: '8px',
                          fontSize: '11px',
                          background: formTrack === trackKey ? cfg.bg : 'rgba(0,0,0,0.2)',
                          borderColor: formTrack === trackKey ? cfg.color : 'var(--border-light)',
                          color: formTrack === trackKey ? '#ffffff' : 'var(--text-secondary)',
                          justifyContent: 'flex-start',
                          gap: '6px'
                        }}
                      >
                        <TrackIcon size={13} style={{ color: cfg.color }} />
                        <span>{cfg.label.split('&')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Event Title */}
              <div>
                <label className="label">Event Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. The Siege of Ironhold, Eldrin discovers the rune..."
                  className="input"
                  required
                />
              </div>

              {/* Date Label & Chronological Order Index */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
                <div>
                  <label className="label">Chronological Date / Era Label</label>
                  <input
                    type="text"
                    value={formDateLabel}
                    onChange={(e) => setFormDateLabel(e.target.value)}
                    placeholder="e.g. Year 842, Day 3 Dusk, Age of Fire"
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Sort Position Index</label>
                  <input
                    type="number"
                    value={formOrderIndex}
                    onChange={(e) => setFormOrderIndex(parseFloat(e.target.value) || 0)}
                    placeholder="100"
                    className="input"
                  />
                </div>
              </div>

              {/* Importance Level */}
              <div>
                <label className="label">Dramatic Significance / Importance</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'major', label: 'Climax', color: '#ef4444' },
                    { id: 'turning_point', label: 'Turning Point', color: '#fbbf24' },
                    { id: 'normal', label: 'Standard', color: '#60a5fa' },
                    { id: 'minor', label: 'Minor Beat', color: '#9ca3af' }
                  ].map(imp => (
                    <button
                      key={imp.id}
                      type="button"
                      onClick={() => setFormImportance(imp.id as TimelineImportance)}
                      className="btn"
                      style={{
                        padding: '6px',
                        fontSize: '11px',
                        background: formImportance === imp.id ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)',
                        borderColor: formImportance === imp.id ? imp.color : 'var(--border-light)',
                        color: formImportance === imp.id ? '#ffffff' : 'var(--text-muted)'
                      }}
                    >
                      {imp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Linked Scene and Character Dropdowns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="label">Linked Outline Scene (Optional)</label>
                  <select
                    value={formSceneId || ''}
                    onChange={(e) => setFormSceneId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="input"
                  >
                    <option value="">-- No Scene Link --</option>
                    {scenes.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Linked Character (Optional)</label>
                  <select
                    value={formCharacterId || ''}
                    onChange={(e) => setFormCharacterId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="input"
                  >
                    <option value="">-- No Character Link --</option>
                    {characters.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="label">Event Summary & Narrative Notes</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe what occurred, who was affected, and the lingering consequences..."
                  className="input"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsEventModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="btn btn-primary">
                  <Check size={14} /> {editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
