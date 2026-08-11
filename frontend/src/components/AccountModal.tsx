import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Sliders, 
  Users, 
  Check, 
  Plus, 
  LogIn, 
  Palette, 
  Save, 
  CheckCircle2
} from 'lucide-react';
import type { ThemeType } from '../App';

export interface AuthorProfile {
  id: number;
  username: string;
  pen_name: string;
  email?: string;
  avatar_color?: string;
  bio?: string;
  is_active: number;
  created_at: string;
}

interface AccountModalProps {
  apiBase: string;
  isOpen: boolean;
  onClose: () => void;
  activeTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  onProfileUpdated?: (profile: AuthorProfile) => void;
}

const AVATAR_COLORS = [
  { name: 'Vintage Brass', hex: '#c89d54' },
  { name: 'Library Crimson', hex: '#881337' },
  { name: 'Forest Emerald', hex: '#059669' },
  { name: 'Midnight Azure', hex: '#2563eb' },
  { name: 'Dark Academia Oxblood', hex: '#991b1b' },
  { name: 'Royal Violet', hex: '#7c3aed' },
  { name: 'Tobacco Leather', hex: '#96603d' }
];

export const AccountModal: React.FC<AccountModalProps> = ({
  apiBase,
  isOpen,
  onClose,
  activeTheme,
  onThemeChange,
  onProfileUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'accounts'>('profile');
  const [currentProfile, setCurrentProfile] = useState<AuthorProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<AuthorProfile[]>([]);
  
  // Profile form state
  const [penName, setPenName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarColor, setAvatarColor] = useState('#c89d54');
  const [bio, setBio] = useState('');
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Global preferences state
  const [globalSettings, setGlobalSettings] = useState<Record<string, string>>({});
  const [prefSaveStatus, setPrefSaveStatus] = useState<string>('');

  // New Account / Sign in form state
  const [newUsername, setNewUsername] = useState('');
  const [newPenName, setNewPenName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [authError, setAuthError] = useState('');

  // Fetch active profile and all accounts
  const loadProfileData = async () => {
    try {
      const [profRes, allRes, setRes] = await Promise.all([
        fetch(`${apiBase}/account/profile`),
        fetch(`${apiBase}/account/profiles`),
        fetch(`${apiBase}/settings`)
      ]);

      if (profRes.ok) {
        const prof: AuthorProfile = await profRes.json();
        setCurrentProfile(prof);
        setPenName(prof.pen_name || '');
        setUsername(prof.username || '');
        setEmail(prof.email || '');
        setAvatarColor(prof.avatar_color || '#c89d54');
        setBio(prof.bio || '');
      }

      if (allRes.ok) {
        const list: AuthorProfile[] = await allRes.json();
        setAllProfiles(list);
      }

      if (setRes.ok) {
        const s = await setRes.json();
        setGlobalSettings(s);
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProfileData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Save current profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('Saving...');
    try {
      const res = await fetch(`${apiBase}/account/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pen_name: penName,
          username,
          email,
          avatar_color: avatarColor,
          bio
        })
      });

      if (!res.ok) throw new Error('Failed to update profile');
      const updated = await res.json();
      setCurrentProfile(updated);
      onProfileUpdated?.(updated);
      setSaveStatus('Profile updated successfully!');
      setTimeout(() => setSaveStatus(''), 2500);
      loadProfileData();
    } catch (err: any) {
      setSaveStatus(err.message || 'Error saving profile');
    }
  };

  // Save global preferences
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefSaveStatus('Saving...');
    try {
      const res = await fetch(`${apiBase}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(globalSettings)
      });
      if (!res.ok) throw new Error('Failed to save settings');
      setPrefSaveStatus('Global preferences saved!');
      setTimeout(() => setPrefSaveStatus(''), 2500);
    } catch (err: any) {
      setPrefSaveStatus(err.message || 'Error saving settings');
    }
  };

  // Switch to account
  const handleSwitchAccount = async (id: number) => {
    try {
      const res = await fetch(`${apiBase}/account/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        const prof = await res.json();
        setCurrentProfile(prof);
        onProfileUpdated?.(prof);
        loadProfileData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create new account
  const handleRegisterAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!newUsername.trim() || !newPenName.trim()) return;

    try {
      const res = await fetch(`${apiBase}/account/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          pen_name: newPenName.trim(),
          email: newEmail.trim()
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create account');
      }

      const prof = await res.json();
      setCurrentProfile(prof);
      onProfileUpdated?.(prof);
      setNewUsername('');
      setNewPenName('');
      setNewEmail('');
      loadProfileData();
      setActiveTab('profile');
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed');
    }
  };

  // Sign into existing account
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!loginUsername.trim()) return;

    try {
      const res = await fetch(`${apiBase}/account/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername.trim() })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Sign in failed');
      }

      const prof = await res.json();
      setCurrentProfile(prof);
      onProfileUpdated?.(prof);
      setLoginUsername('');
      loadProfileData();
      setActiveTab('profile');
    } catch (err: any) {
      setAuthError(err.message || 'Sign in failed');
    }
  };

  // Get author initials for avatar circle
  const initials = penName
    ? penName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AU';

  return (
    <div className="modal-overlay" style={{ zIndex: 110 }}>
      <div 
        className="modal-content animate-scale" 
        style={{ 
          maxWidth: '850px', 
          maxHeight: '90vh', 
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: '50%', 
                backgroundColor: avatarColor || 'var(--primary)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: '#ffffff', 
                fontWeight: 800,
                fontSize: '15px',
                border: '2px solid rgba(255,255,255,0.2)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              {initials}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Author Account & Global Preferences
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Signed in as <strong style={{ color: 'var(--primary)' }}>{currentProfile?.pen_name || 'Author'}</strong> ({currentProfile?.username})
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', marginBottom: '16px', gap: '4px' }}>
          <button
            onClick={() => setActiveTab('profile')}
            className="btn"
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              borderBottom: activeTab === 'profile' ? '2px solid var(--primary)' : '2px solid transparent',
              background: activeTab === 'profile' ? 'rgba(200, 157, 84, 0.12)' : 'transparent',
              color: activeTab === 'profile' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '13px'
            }}
          >
            <User size={14} /> Author Profile & Pen Name
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className="btn"
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              borderBottom: activeTab === 'preferences' ? '2px solid var(--secondary)' : '2px solid transparent',
              background: activeTab === 'preferences' ? 'rgba(150, 96, 61, 0.15)' : 'transparent',
              color: activeTab === 'preferences' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '13px'
            }}
          >
            <Sliders size={14} /> Global Studio Preferences
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className="btn"
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              borderBottom: activeTab === 'accounts' ? '2px solid #60a5fa' : '2px solid transparent',
              background: activeTab === 'accounts' ? 'rgba(96, 165, 250, 0.12)' : 'transparent',
              color: activeTab === 'accounts' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '13px'
            }}
          >
            <Users size={14} /> Switch / Sign In Account ({allProfiles.length})
          </button>
        </div>

        {/* TAB 1: AUTHOR PROFILE */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="label">Author Pen Name (Visible on Exports)</label>
                <input
                  type="text"
                  value={penName}
                  onChange={(e) => setPenName(e.target.value)}
                  className="input"
                  placeholder="e.g. Brandon Sanderson, Ursula K. Le Guin"
                  required
                />
              </div>

              <div>
                <label className="label">Account Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  placeholder="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Author Contact Email (Optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="author@example.com"
              />
            </div>

            {/* Avatar Theme Color */}
            <div>
              <label className="label">Avatar Accent Color</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setAvatarColor(c.hex)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: c.hex,
                      border: avatarColor === c.hex ? '2px solid #ffffff' : '2px solid transparent',
                      cursor: 'pointer',
                      boxShadow: avatarColor === c.hex ? '0 0 8px ' + c.hex : 'none'
                    }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="label">Author Bio / Storytelling Manifesto</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="input"
                rows={3}
                placeholder="Describe your writing focus, themes, or literary goals..."
                style={{ resize: 'vertical' }}
              />
            </div>

            {saveStatus && (
              <div style={{ fontSize: '12px', color: saveStatus.includes('Error') ? '#f87171' : 'var(--status-done)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} /> {saveStatus}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                <Save size={14} /> Save Profile Changes
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: GLOBAL PREFERENCES */}
        {activeTab === 'preferences' && (
          <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            
            {/* Default Studio Theme */}
            <div className="glass-panel" style={{ padding: '14px' }}>
              <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Palette size={14} style={{ color: 'var(--primary)' }} /> Default Author Studio Aesthetic
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  { id: 'vintage-typewriter', label: 'Vintage Typewriter', desc: 'Warm pine & typewriter paper' },
                  { id: 'antique-library', label: 'Grand Antique Library', desc: 'Mahogany & aged parchment' },
                  { id: 'dark-academia', label: 'Dark Academia Leatherbound', desc: 'Oxblood & candlelit walnut' },
                  { id: 'modern-studio', label: 'Modern Editorial Dark', desc: 'Sleek glass & obsidian' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onThemeChange(t.id as ThemeType)}
                    className="btn"
                    style={{
                      padding: '10px',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      background: activeTheme === t.id ? 'rgba(200, 157, 84, 0.18)' : 'rgba(0,0,0,0.2)',
                      borderColor: activeTheme === t.id ? 'var(--primary)' : 'var(--border-light)',
                      color: activeTheme === t.id ? '#ffffff' : 'var(--text-secondary)'
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '12px' }}>{t.label}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Global POV & Tense Defaults */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="label">Default Point of View</label>
                <select
                  value={globalSettings.writing_pov || 'third_limited'}
                  onChange={(e) => setGlobalSettings(prev => ({ ...prev, writing_pov: e.target.value }))}
                  className="input"
                >
                  <option value="third_limited">Third Person Limited (He/She/They)</option>
                  <option value="first_person">First Person (I/Me)</option>
                  <option value="third_omniscient">Third Person Omniscient</option>
                  <option value="second_person">Second Person (You)</option>
                </select>
              </div>

              <div>
                <label className="label">Default Narrative Tense</label>
                <select
                  value={globalSettings.writing_tense || 'past'}
                  onChange={(e) => setGlobalSettings(prev => ({ ...prev, writing_tense: e.target.value }))}
                  className="input"
                >
                  <option value="past">Past Tense (walked, said, felt)</option>
                  <option value="present">Present Tense (walks, says, feels)</option>
                </select>
              </div>
            </div>

            {/* Global Author Guidelines */}
            <div>
              <label className="label">Global Story Guidelines (Auto-Injected across all projects)</label>
              <textarea
                value={globalSettings.writing_custom_rules || ''}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, writing_custom_rules: e.target.value }))}
                className="input"
                rows={3}
                placeholder="e.g. Prefer punchy verbs over adverbs, emphasize atmospheric weather, maintain deep character subjectivity..."
                style={{ resize: 'vertical' }}
              />
            </div>

            {prefSaveStatus && (
              <div style={{ fontSize: '12px', color: 'var(--status-done)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} /> {prefSaveStatus}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                <Save size={14} /> Save Global Preferences
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: SWITCH / SIGN IN ACCOUNT */}
        {activeTab === 'accounts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            
            {authError && (
              <div style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
                {authError}
              </div>
            )}

            {/* Saved Pen Names / Profiles */}
            <div>
              <span className="label" style={{ marginBottom: '8px', display: 'block' }}>
                Saved Pen Names & Author Accounts ({allProfiles.length})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allProfiles.map(p => (
                  <div
                    key={p.id}
                    className="glass-panel"
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderLeft: p.id === currentProfile?.id ? '4px solid var(--primary)' : '1px solid var(--border-light)',
                      background: p.id === currentProfile?.id ? 'rgba(200, 157, 84, 0.1)' : 'rgba(0,0,0,0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div 
                        style={{ 
                          width: '30px', 
                          height: '30px', 
                          borderRadius: '50%', 
                          backgroundColor: p.avatar_color || 'var(--primary)',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: '#ffffff', 
                          fontWeight: 700,
                          fontSize: '12px'
                        }}
                      >
                        {p.pen_name ? p.pen_name[0].toUpperCase() : 'A'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#ffffff' }}>
                          {p.pen_name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          @{p.username} {p.email ? `• ${p.email}` : ''}
                        </div>
                      </div>
                    </div>

                    {p.id === currentProfile?.id ? (
                      <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={13} /> Active
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSwitchAccount(p.id)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        Switch to this Pen Name
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Create New Pen Name Form */}
            <div className="glass-panel" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '13px', color: '#ffffff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={14} style={{ color: 'var(--primary)' }} /> Create New Author Pen Name Account
              </h4>
              <form onSubmit={handleRegisterAccount} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input
                    type="text"
                    value={newPenName}
                    onChange={(e) => setNewPenName(e.target.value)}
                    placeholder="New Pen Name (e.g. M. R. James)"
                    className="input"
                    required
                  />
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Unique Username"
                    className="input"
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Contact Email (Optional)"
                    className="input"
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                    <Plus size={13} /> Create Account
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Sign In by Username */}
            <div className="glass-panel" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '13px', color: '#ffffff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LogIn size={14} style={{ color: '#60a5fa' }} /> Sign In to Existing Account
              </h4>
              <form onSubmit={handleLogin} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Enter username or pen name to sign in..."
                  className="input"
                  style={{ flex: 1 }}
                  required
                />
                <button type="submit" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                  <LogIn size={13} /> Sign In
                </button>
              </form>
            </div>

          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
