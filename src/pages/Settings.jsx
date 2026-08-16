import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const KEY = 'sqpg.settings';
const DEFAULTS = {
  defaultExport: 'pdf',      // pdf | word | image
  rowsPerPage: 50,           // audit log / paper listings
  confirmDelete: true,       // extra confirm before destructive actions
};

export function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

// Client-side preferences only. Nothing here weakens a server-side rule —
// confirmDelete affects the extra prompt, not the confirmation the RPC requires.
export default function Settings() {
  const [s, setS] = useState(DEFAULTS);
  const [msg, setMsg] = useState('');   // always a confirmation here

  useEffect(() => { setS(loadSettings()); }, []);

  function set(patch) {
    const next = { ...s, ...patch };
    setS(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    setMsg('Saved.');
  }

  function reset() {
    localStorage.removeItem(KEY);
    setS(DEFAULTS);
    setMsg('Reset to defaults.');
  }

  async function signOutEverywhere() {
    await supabase.auth.signOut({ scope: 'global' });
  }

  return (
    <div className="card wide">
      <h1>Settings</h1>
      <p className="subtitle">Stored in this browser only.</p>

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
