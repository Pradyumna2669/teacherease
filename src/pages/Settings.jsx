import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const KEY = 'sqpg.settings';
const DEFAULTS = {
  theme: 'register',         // register | midnight | indigo
  defaultExport: 'pdf',      // pdf | word | image
  rowsPerPage: 50,           // audit log / paper listings
  confirmDelete: true,       // extra confirm before destructive actions
};

// Swatches mirror the actual token values, so the card previews the theme
// rather than merely naming it.
const THEMES = [
  {
    id: 'register',
    name: 'Register',
    note: 'Warm paper, ink navy, seal red. The printed exam paper.',
    swatch: ['#FBFAF6', '#141F35', '#8E1B2E', '#E5E1D6'],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    note: 'Dark ink for long evenings of question entry.',
    swatch: ['#0E1420', '#141B29', '#E4586E', '#27324A'],
  },
  {
    id: 'indigo',
    name: 'Indigo',
    note: 'Bright and saturated, with an indigo accent.',
    swatch: ['#F6F7FD', '#FFFFFF', '#4F46E5', '#E1E6F5'],
  },
];

export function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

// Themes are token sets on <html data-theme>. index.html applies the stored
// one before React mounts, so a reload never flashes the default palette.
export function applyTheme(theme) {
  const root = document.documentElement;
  if (!theme || theme === 'register') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

// Client-side preferences only. Nothing here weakens a server-side rule —
// confirmDelete affects the extra prompt, not the confirmation the RPC requires.
export default function Settings() {
  const [s, setS] = useState(DEFAULTS);
  const [msg, setMsg] = useState('');   // always a confirmation here

  useEffect(() => {
    const loaded = loadSettings();
    setS(loaded);
    applyTheme(loaded.theme);
  }, []);

  function set(patch) {
    const next = { ...s, ...patch };
    setS(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    if (patch.theme) applyTheme(patch.theme);
    setMsg('Saved.');
  }

  function reset() {
    localStorage.removeItem(KEY);
    setS(DEFAULTS);
    applyTheme(DEFAULTS.theme);
    setMsg('Reset to defaults.');
  }

  async function signOutEverywhere() {
    await supabase.auth.signOut({ scope: 'global' });
  }

  return (
    <div className="card wide">
      <h1>Settings</h1>
      <p className="subtitle">Stored in this browser only.</p>

      <h3>Theme</h3>
      <div className="theme-grid">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`theme-card ${s.theme === t.id ? 'sel' : ''}`}
            onClick={() => set({ theme: t.id })}
            aria-pressed={s.theme === t.id}
          >
            <span className="theme-swatch">
              {t.swatch.map((c) => (
                <i key={c} style={{ background: c }} />
              ))}
            </span>
            <span className="theme-name">
              {t.name}{s.theme === t.id ? ' · in use' : ''}
            </span>
            <span className="theme-note">{t.note}</span>
          </button>
        ))}
      </div>

      <h3>Default download format</h3>
      <select value={s.defaultExport}
        onChange={(e) => set({ defaultExport: e.target.value })}>
        <option value="pdf">PDF</option>
        <option value="word">Word (.doc)</option>
        <option value="image">Image (.png)</option>
      </select>

      <h3>Rows per page</h3>
      <select value={s.rowsPerPage}
        onChange={(e) => set({ rowsPerPage: Number(e.target.value) })}>
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>

      <h3>Safety</h3>
      <label>
        <input type="checkbox" checked={s.confirmDelete}
          onChange={(e) => set({ confirmDelete: e.target.checked })} />
        {' '}Ask for confirmation before deleting a question
      </label>

      <h3>Session</h3>
      <button type="button" className="btn-sm" onClick={signOutEverywhere}>
        Sign out of all devices
      </button>
      {' '}
      <button type="button" className="btn-sm" onClick={reset}>
        Reset settings
      </button>

      {msg && <p className="msg ok">{msg}</p>}
    </div>
  );
}
