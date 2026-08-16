import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

// User profile management: display name, plus a password change.
// Email and role are read-only here — role changes belong to the admin panel.
export default function Profile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [pw, setPw] = useState({ next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  // { text, ok } — ok drives the green confirmation style instead of the alert one.
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      if (!u) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', u.id)
        .single();
      setProfile(data);
      setName(data?.full_name || '');
    })();
  }, []);

  async function saveName(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name.trim() })
      .eq('id', user.id);
    setBusy(false);
    setMsg(error ? { text: error.message } : { text: 'Name updated.', ok: true });
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pw.next.length < 6) {
      return setMsg({ text: 'Password must be at least 6 characters.' });
    }
    if (pw.next !== pw.confirm) return setMsg({ text: 'Passwords do not match.' });
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setBusy(false);
    setPw({ next: '', confirm: '' });
    setMsg(error ? { text: error.message } : { text: 'Password changed.', ok: true });
  }

  if (!user) return <div className="card"><p>Loading…</p></div>;

  return (
    <div className="card wide">
      <h1>User profile</h1>

      <h3>Account</h3>
      <div className="q-row">
        <span className="q-meta">Email</span>
        <span className="q-text">{user.email}</span>
      </div>
      <div className="q-row">
        <span className="q-meta">Role</span>
        <span className="q-text">{profile?.role || 'teacher'}</span>
      </div>
      <div className="q-row">
        <span className="q-meta">User ID</span>
        <span className="q-text">{user.id}</span>
      </div>

      <h3>Display name</h3>
      <form onSubmit={saveName}>
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Full name" />
        <button className="submit compact" disabled={busy}>Save name</button>
      </form>

      <h3>Change password</h3>
      <form onSubmit={changePassword}>
        <input type="password" value={pw.next}
          onChange={(e) => setPw({ ...pw, next: e.target.value })}
          placeholder="New password" />
        <input type="password" value={pw.confirm}
          onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
          placeholder="Confirm new password" />
        <button className="submit compact" disabled={busy}>Change password</button>
      </form>

      {msg && <p className={`msg ${msg.ok ? 'ok' : ''}`}>{msg.text}</p>}
    </div>
  );
}
