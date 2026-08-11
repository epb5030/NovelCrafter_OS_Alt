import React, { useState, useEffect, useRef } from 'react';
import { 
  Map, 
  MapPin, 
  Compass, 
  Shield, 
  Trees, 
  Sparkles, 
  Flame, 
  Trash2, 
  Navigation, 
  Wand2, 
  X, 
  Check, 
  Footprints
} from 'lucide-react';
import type { CodexEntry } from './CodexManager';

export interface MapPinData {
  id: number;
  project_id: number;
  codex_location_id?: number;
  title: string;
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
  pin_type: 'city' | 'fortress' | 'wilderness' | 'landmark' | 'dungeon' | 'portal';
  notes?: string;
  codex_name?: string;
  codex_description?: string;
}

export interface MapJourneyData {
  id: number;
  project_id: number;
  character_id: number;
  character_name?: string;
  path_waypoints: number[]; // Array of pin IDs
  color: string;
  notes?: string;
}

interface WorldMapStudioProps {
  projectId: number;
  apiBase: string;
}

export const WorldMapStudio: React.FC<WorldMapStudioProps> = ({ projectId, apiBase }) => {
  const [pins, setPins] = useState<MapPinData[]>([]);
  const [journeys, setJourneys] = useState<MapJourneyData[]>([]);
  const [codexLocations, setCodexLocations] = useState<CodexEntry[]>([]);
  const [codexCharacters, setCodexCharacters] = useState<CodexEntry[]>([]);

  // Active Pin Selection / Editing
  const [selectedPin, setSelectedPin] = useState<MapPinData | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  
  // Pin Creation Form
  const [newPinX, setNewPinX] = useState<number>(50);
  const [newPinY, setNewPinY] = useState<number>(50);
  const [pinTitle, setPinTitle] = useState<string>('');
  const [pinType, setPinType] = useState<MapPinData['pin_type']>('city');
  const [pinCodexId, setPinCodexId] = useState<number | null>(null);
  const [pinNotes, setPinNotes] = useState<string>('');

  // Dragging Pin state
  const [draggedPinId, setDraggedPinId] = useState<number | null>(null);
  const mapCanvasRef = useRef<HTMLDivElement>(null);

  // Travel Calculator States
  const [calcStartPinId, setCalcStartPinId] = useState<number | null>(null);
  const [calcEndPinId, setCalcEndPinId] = useState<number | null>(null);
  const [travelMode, setTravelMode] = useState<'foot' | 'horse' | 'carriage' | 'ship' | 'flight' | 'portal'>('horse');

  // Journey Builder State
  const [activeJourneyCharId, setActiveJourneyCharId] = useState<number | null>(null);
  const [journeyWaypoints, setJourneyWaypoints] = useState<number[]>([]);
  const [journeyColor, setJourneyColor] = useState<string>('#c89d54');

  // Fetch Cartography Data
  const fetchMapData = async () => {
    try {
      const [pinsRes, journeysRes, codexRes] = await Promise.all([
        fetch(`${apiBase}/projects/${projectId}/map/pins`),
        fetch(`${apiBase}/projects/${projectId}/map/journeys`),
        fetch(`${apiBase}/projects/${projectId}/codex`)
      ]);

      if (pinsRes.ok) setPins(await pinsRes.json());
      if (journeysRes.ok) setJourneys(await journeysRes.json());
      if (codexRes.ok) {
        const codexData: CodexEntry[] = await codexRes.json();
        setCodexLocations(codexData.filter(e => e.category === 'location'));
        setCodexCharacters(codexData.filter(e => e.category === 'character'));
      }
    } catch (err) {
      console.error('Failed to load map data:', err);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, [projectId]);

  // Click on canvas to create pin
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedPinId !== null || !mapCanvasRef.current) return;
    const rect = mapCanvasRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    setSelectedPin(null);
    setNewPinX(x);
    setNewPinY(y);
    setPinTitle('');
    setPinType('city');
    setPinCodexId(null);
    setPinNotes('');
    setIsPinModalOpen(true);
  };

  // Dragging pin across canvas
  const handlePinMouseDown = (e: React.MouseEvent, pin: MapPinData) => {
    e.stopPropagation();
    setDraggedPinId(pin.id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedPinId === null || !mapCanvasRef.current) return;
    const rect = mapCanvasRef.current.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(2, Math.min(98, Math.round(((e.clientY - rect.top) / rect.height) * 100)));

    setPins(prev => prev.map(p => p.id === draggedPinId ? { ...p, x, y } : p));
  };

  const handleMouseUp = async () => {
    if (draggedPinId !== null) {
      const pin = pins.find(p => p.id === draggedPinId);
      if (pin) {
        try {
          await fetch(`${apiBase}/projects/${projectId}/map/pins/${pin.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: pin.x, y: pin.y })
          });
        } catch (err) {
          console.error('Failed to update pin position:', err);
        }
      }
      setDraggedPinId(null);
    }
  };

  // Submit Pin Form (Create or Edit)
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinTitle.trim()) return;

    try {
      if (selectedPin) {
        // Edit existing pin
        const res = await fetch(`${apiBase}/projects/${projectId}/map/pins/${selectedPin.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: pinTitle.trim(),
            pinType,
            codexLocationId: pinCodexId,
            notes: pinNotes
          })
        });
        if (res.ok) {
          fetchMapData();
          setIsPinModalOpen(false);
        }
      } else {
        // Create new pin
        const res = await fetch(`${apiBase}/projects/${projectId}/map/pins`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: pinTitle.trim(),
            x: newPinX,
            y: newPinY,
            pinType,
            codexLocationId: pinCodexId,
            notes: pinNotes
          })
        });
        if (res.ok) {
          fetchMapData();
          setIsPinModalOpen(false);
        }
      }
    } catch (err) {
      console.error('Failed to save map pin:', err);
    }
  };

  // Delete Pin
  const handleDeletePin = async (pinId: number) => {
    if (!confirm('Are you sure you want to remove this location pin?')) return;
    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/map/pins/${pinId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchMapData();
        setIsPinModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to delete pin:', err);
    }
  };

  // Auto-populate pins from Codex
  const handleAutoPopulate = async () => {
    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/map/auto-populate`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        fetchMapData();
      }
    } catch (err) {
      console.error('Failed to auto populate pins:', err);
    }
  };

  // Open Edit Modal for Pin
  const handleOpenEditPin = (pin: MapPinData) => {
    setSelectedPin(pin);
    setPinTitle(pin.title);
    setPinType(pin.pin_type);
    setPinCodexId(pin.codex_location_id || null);
    setPinNotes(pin.notes || '');
    setIsPinModalOpen(true);
  };

  // Handle Journey Waypoint click
  const handlePinClickForJourney = (pinId: number) => {
    if (!activeJourneyCharId) return;
    if (journeyWaypoints.includes(pinId)) {
      setJourneyWaypoints(journeyWaypoints.filter(id => id !== pinId));
    } else {
      setJourneyWaypoints([...journeyWaypoints, pinId]);
    }
  };

  // Save Journey Path
  const handleSaveJourney = async () => {
    if (!activeJourneyCharId || journeyWaypoints.length < 2) {
      alert('Select at least 2 location waypoints to define a character journey path.');
      return;
    }

    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/map/journeys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: activeJourneyCharId,
          pathWaypoints: journeyWaypoints,
          color: journeyColor
        })
      });
      if (res.ok) {
        fetchMapData();
        setJourneyWaypoints([]);
        setActiveJourneyCharId(null);
      }
    } catch (err) {
      console.error('Failed to save journey:', err);
    }
  };

  // Travel Distance & Pace Calculator
  const getCalculatedTravel = () => {
    if (!calcStartPinId || !calcEndPinId) return null;
    const p1 = pins.find(p => p.id === calcStartPinId);
    const p2 = pins.find(p => p.id === calcEndPinId);
    if (!p1 || !p2) return null;

    // Relative Euclidean distance (0-100 scale)
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const rawDist = Math.sqrt(dx * dx + dy * dy);

    // Map scaling: 1 canvas unit = 5 miles (approx 1.6 leagues)
    const miles = Math.round(rawDist * 5);
    const leagues = Math.round(miles / 3);

    // Speed in miles/day
    const speeds: Record<string, number> = {
      foot: 20,
      horse: 40,
      carriage: 30,
      ship: 60,
      flight: 120,
      portal: 0
    };

    const speed = speeds[travelMode] || 40;
    const durationDays = speed > 0 ? (miles / speed).toFixed(1) : 'Instant';

    return { miles, leagues, durationDays, startName: p1.title, endName: p2.title };
  };

  const travelCalc = getCalculatedTravel();

  // Helper icon for pin types
  const getPinIcon = (type: MapPinData['pin_type']) => {
    switch (type) {
      case 'city': return <MapPin size={16} style={{ color: '#c89d54' }} />;
      case 'fortress': return <Shield size={16} style={{ color: '#ef4444' }} />;
      case 'wilderness': return <Trees size={16} style={{ color: '#10b981' }} />;
      case 'landmark': return <Compass size={16} style={{ color: '#a855f7' }} />;
      case 'dungeon': return <Flame size={16} style={{ color: '#f59e0b' }} />;
      case 'portal': return <Sparkles size={16} style={{ color: '#06b6d4' }} />;
    }
  };

  const getPinColor = (type: MapPinData['pin_type']) => {
    switch (type) {
      case 'city': return '#c89d54';
      case 'fortress': return '#ef4444';
      case 'wilderness': return '#10b981';
      case 'landmark': return '#a855f7';
      case 'dungeon': return '#f59e0b';
      case 'portal': return '#06b6d4';
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Studio Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Map size={24} style={{ color: 'var(--primary)' }} /> World Cartography & Story Map Studio
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Place location pins, trace character journey paths across chapters, and calculate spatial travel distances.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handleAutoPopulate}
            className="btn btn-secondary"
            style={{ fontSize: '12px', gap: '6px' }}
          >
            <Wand2 size={14} style={{ color: 'var(--primary)' }} /> Auto-Map Codex Locations
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        
        {/* LEFT: CARTOGRAPHY MAP CANVAS */}
        <div 
          className="glass-panel" 
          style={{ 
            position: 'relative', 
            height: '620px', 
            borderRadius: 'var(--radius-lg)', 
            overflow: 'hidden', 
            border: '1px solid var(--border-light)',
            background: 'radial-gradient(circle at center, #1a1a2e 0%, #0d0d15 100%)',
            userSelect: 'none'
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Cartography Background Grid Texture */}
          <div 
            style={{ 
              position: 'absolute', 
              inset: 0, 
              opacity: 0.15,
              backgroundImage: `
                linear-gradient(to right, rgba(200,157,84,0.3) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(200,157,84,0.3) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
              pointerEvents: 'none'
            }} 
          />

          {/* Decorative Compass Rose Accent */}
          <div style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.25, pointerEvents: 'none', color: 'var(--primary)' }}>
            <Compass size={80} />
          </div>

          {/* Interactive Map Canvas Container */}
          <div 
            ref={mapCanvasRef}
            onClick={handleCanvasClick}
            style={{ position: 'absolute', inset: 0, cursor: activeJourneyCharId ? 'crosshair' : 'pointer' }}
          >
            {/* SVG OVERLAY FOR CHARACTER JOURNEY PATHS */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              {journeys.map(j => {
                const waypoints = j.path_waypoints
                  .map(pinId => pins.find(p => p.id === pinId))
                  .filter(Boolean) as MapPinData[];

                if (waypoints.length < 2) return null;
                const pathPoints = waypoints.map(w => `${w.x}%,${w.y}%`).join(' ');

                return (
                  <g key={j.id}>
                    <polyline
                      points={pathPoints}
                      fill="none"
                      stroke={j.color || '#c89d54'}
                      strokeWidth="3"
                      strokeDasharray="6 4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.85"
                    />
                  </g>
                );
              })}

              {/* Active Journey In-Progress Line */}
              {activeJourneyCharId && journeyWaypoints.length >= 2 && (
                <polyline
                  points={journeyWaypoints.map(id => {
                    const p = pins.find(pin => pin.id === id);
                    return p ? `${p.x}%,${p.y}%` : '';
                  }).filter(Boolean).join(' ')}
                  fill="none"
                  stroke={journeyColor}
                  strokeWidth="4"
                  strokeDasharray="4 4"
                  opacity="1"
                />
              )}
            </svg>

            {/* LOCATION PINS */}
            {pins.map(pin => {
              const isSelected = selectedPin?.id === pin.id;
              const isInActiveJourney = journeyWaypoints.includes(pin.id);

              return (
                <div
                  key={pin.id}
                  onMouseDown={(e) => handlePinMouseDown(e, pin)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeJourneyCharId) {
                      handlePinClickForJourney(pin.id);
                    } else {
                      handleOpenEditPin(pin);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                    transform: 'translate(-50%, -100%)',
                    zIndex: isSelected ? 20 : 10,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  {/* Pin Icon Bubble */}
                  <div
                    style={{
                      padding: '6px',
                      borderRadius: '50%',
                      background: 'rgba(15, 15, 23, 0.95)',
                      border: `2px solid ${isInActiveJourney ? '#38bdf8' : getPinColor(pin.pin_type)}`,
                      boxShadow: isSelected ? '0 0 15px rgba(200,157,84,0.8)' : '0 4px 10px rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    {getPinIcon(pin.pin_type)}
                  </div>

                  {/* Pin Label Tag */}
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#ffffff',
                      background: 'rgba(0,0,0,0.75)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-light)',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                    }}
                  >
                    {pin.title}
                  </span>
                </div>
              );
            })}

            {/* Instruction Overlay */}
            {pins.length === 0 && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: 'var(--text-muted)' }}>
                <MapPin size={36} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                <h3 style={{ color: '#ffffff', marginBottom: '4px' }}>Click Anywhere on Map to Place Pin</h3>
                <p style={{ fontSize: '12px' }}>Or click "Auto-Map Codex Locations" to convert Codex lore entries into map pins.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR: TRAVEL CALCULATOR & JOURNEY MANAGER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* TRAVEL CALCULATOR PANEL */}
          <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              <Navigation size={16} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '14px', color: '#ffffff', fontWeight: 600 }}>
                Spatial Travel Calculator
              </h3>
            </div>

            <div>
              <label className="label" style={{ fontSize: '11px' }}>Origin Pin</label>
              <select
                value={calcStartPinId || ''}
                onChange={(e) => setCalcStartPinId(Number(e.target.value))}
                className="input"
                style={{ fontSize: '12px', padding: '6px 8px' }}
              >
                <option value="">-- Select Origin Location --</option>
                {pins.map(p => (
                  <option key={p.id} value={p.id}>{p.title} ({p.pin_type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" style={{ fontSize: '11px' }}>Destination Pin</label>
              <select
                value={calcEndPinId || ''}
                onChange={(e) => setCalcEndPinId(Number(e.target.value))}
                className="input"
                style={{ fontSize: '12px', padding: '6px 8px' }}
              >
                <option value="">-- Select Destination Location --</option>
                {pins.map(p => (
                  <option key={p.id} value={p.id}>{p.title} ({p.pin_type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" style={{ fontSize: '11px' }}>Mode of Travel</label>
              <select
                value={travelMode}
                onChange={(e) => setTravelMode(e.target.value as any)}
                className="input"
                style={{ fontSize: '12px', padding: '6px 8px' }}
              >
                <option value="foot">Foot / Marching (20 mi/day)</option>
                <option value="horse">Horseback (40 mi/day)</option>
                <option value="carriage">Royal Carriage (30 mi/day)</option>
                <option value="ship">Sailing Galley (60 mi/day)</option>
                <option value="flight">Wyvern / Airship (120 mi/day)</option>
                <option value="portal">Magical Portal (Instant)</option>
              </select>
            </div>

            {travelCalc && (
              <div style={{ background: 'rgba(200, 157, 84, 0.1)', border: '1px solid rgba(200, 157, 84, 0.3)', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#ffffff' }}>
                <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                  {travelCalc.startName} → {travelCalc.endName}
                </div>
                <div>Distance: <strong>{travelCalc.miles} miles</strong> ({travelCalc.leagues} leagues)</div>
                <div>Duration: <strong>{travelCalc.durationDays} days</strong></div>
              </div>
            )}
          </div>

          {/* CHARACTER JOURNEYS MANAGER */}
          <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
              <Footprints size={16} style={{ color: '#38bdf8' }} />
              <h3 style={{ fontSize: '14px', color: '#ffffff', fontWeight: 600 }}>
                Character Journey Paths
              </h3>
            </div>

            {/* Existing Journeys List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {journeys.length === 0 ? (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No character journeys defined yet.</span>
              ) : (
                journeys.map(j => (
                  <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '4px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: j.color }} />
                      <strong style={{ color: '#ffffff' }}>{j.character_name}</strong>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{j.path_waypoints.length} waypoints</span>
                  </div>
                ))
              )}
            </div>

            {/* Define New Journey */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="label" style={{ fontSize: '11px' }}>Trace Character Journey Path</label>
              
              <select
                value={activeJourneyCharId || ''}
                onChange={(e) => {
                  setActiveJourneyCharId(Number(e.target.value));
                  setJourneyWaypoints([]);
                }}
                className="input"
                style={{ fontSize: '12px', padding: '6px 8px' }}
              >
                <option value="">-- Pick Character to Trace --</option>
                {codexCharacters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {activeJourneyCharId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                  <span className="label" style={{ margin: 0, fontSize: '11px' }}>Path Color:</span>
                  <input
                    type="color"
                    value={journeyColor}
                    onChange={(e) => setJourneyColor(e.target.value)}
                    style={{ width: '32px', height: '24px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </div>
              )}

              {activeJourneyCharId && (
                <div style={{ fontSize: '11px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '8px', borderRadius: '4px' }}>
                  💡 Click location pins in sequential order to add waypoints to this path ({journeyWaypoints.length} selected).
                </div>
              )}

              {activeJourneyCharId && (
                <button
                  type="button"
                  onClick={handleSaveJourney}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 12px', marginTop: '4px' }}
                >
                  <Check size={13} /> Save Journey Path
                </button>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* CREATE / EDIT PIN MODAL */}
      {isPinModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal-content animate-scale" style={{ maxWidth: '480px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', color: '#ffffff', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} style={{ color: 'var(--primary)' }} />
                {selectedPin ? `Edit Pin: ${selectedPin.title}` : 'Place Location Pin'}
              </h3>
              <button onClick={() => setIsPinModalOpen(false)} className="btn btn-secondary" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div>
                <label className="label">Location Name</label>
                <input
                  type="text"
                  value={pinTitle}
                  onChange={(e) => setPinTitle(e.target.value)}
                  placeholder="e.g. Ironwood Citadel, Shadow Pass"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Pin Category / Type</label>
                <select
                  value={pinType}
                  onChange={(e) => setPinType(e.target.value as any)}
                  className="input"
                >
                  <option value="city">🏙️ City / Town</option>
                  <option value="fortress">🏰 Fortress / Castle</option>
                  <option value="wilderness">🌲 Wilderness / Mountain</option>
                  <option value="landmark">🧭 Landmark / Monument</option>
                  <option value="dungeon">🔥 Dungeon / Ruins</option>
                  <option value="portal">✨ Portal / Magical Gateway</option>
                </select>
              </div>

              <div>
                <label className="label">Link to Codex Location Entry (Optional)</label>
                <select
                  value={pinCodexId || ''}
                  onChange={(e) => setPinCodexId(e.target.value ? Number(e.target.value) : null)}
                  className="input"
                >
                  <option value="">-- No Codex Link --</option>
                  {codexLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Cartographer Notes</label>
                <textarea
                  value={pinNotes}
                  onChange={(e) => setPinNotes(e.target.value)}
                  placeholder="Geographical details, climate, controlling faction..."
                  className="input"
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                {selectedPin ? (
                  <button
                    type="button"
                    onClick={() => handleDeletePin(selectedPin.id)}
                    className="btn btn-secondary"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={14} /> Remove Pin
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => setIsPinModalOpen(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Location Pin
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
