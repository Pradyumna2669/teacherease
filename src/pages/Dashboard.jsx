import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useProfile } from '../lib/useProfile';
import Skeleton from '../components/Skeleton';

const fmt = (s) =>
  s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

// Role-aware summary. Admin sees institute-wide totals, teacher sees their own.
// All counts use head:true so no rows are transferred, only the count.
export default function Dashboard() {
  const { profile, loading: pLoading } = useProfile();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [err, setErr] = useState('');

  const count = useCallback(async (table, filter) => {
    let q = supabase.from(table).select('*', { count: 'exact', head: true });
    if (filter) q = filter(q);
    const { count: n, error } = await q;
    if (error) throw error;
    return n ?? 0;
  }, []);

  useEffect(() => {
    if (pLoading) return;
    (async () => {
      try {
        const admin = profile?.role === 'admin';
        const next = {};
        if (admin) {
          next.subjects = await count('subjects');
          next.questions = await count('questions');
          next.papers = await count('papers');
          next.audit = await count('audit_logs');
        } else {
          // RLS already scopes these to the signed-in teacher.
          next.subjects = await count('teacher_subjects');
          next.questions = await count('questions');
          next.papers = await count('papers');
        }
        setStats(next);

        const { data } = await supabase
          .from('papers')
          .select('id, title, variant, created_at, subjects(code)')
          .order('created_at', { ascending: false })
          .limit(5);
        setRecent(data || []);
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, [pLoading, profile, count]);

  if (pLoading || (!stats && !err)) return <Skeleton rows={2} />;

  const admin = profile?.role === 'admin';

  return (
    <div className="card wide">
      <h1>Dashboard</h1>
      <p className="subtitle">
        {admin ? 'Institute-wide totals' : 'Your subjects and papers'}
      </p>
      {err && <p className="msg">{err}</p>}

      <div className="subj-grid">
        <div className="subj-card stat">
          <b>{stats?.subjects ?? 0}</b>
          <span>{admin ? 'Subjects' : 'Subjects allotted'}</span>
        </div>
        <div className="subj-card stat">
          <b>{stats?.questions ?? 0}</b>
          <span>Questions in bank</span>
        </div>
        <div className="subj-card stat">
          <b>{stats?.papers ?? 0}</b>
          <span>Papers generated</span>
        </div>
        {admin && (
          <div className="subj-card stat">
            <b>{stats?.audit ?? 0}</b>
            <span>Audit entries</span>
          </div>
        )}
      </div>

      <h3>Recent papers</h3>
      {recent.length === 0 && <p className="subtitle">None yet.</p>}
      {recent.map((p) => (
        <div key={p.id} className="q-row">
          <span className="q-meta">{fmt(p.created_at)}</span>
          <span className="q-text">
            {p.subjects?.code || '—'} · {p.title} ({p.variant})
          </span>
          <Link className="btn-sm" to={`/papers/${p.id}/download`}>Download</Link>
        </div>
      ))}

      <h3>Shortcuts</h3>
      <p className="subtitle">
        {admin ? (
          <>
            <Link to="/admin">Control panel</Link> ·{' '}
            <Link to="/admin/papers">All papers</Link> ·{' '}
            <Link to="/admin/audit">Audit log</Link>
          </>
        ) : (
          <Link to="/teacher">My subjects</Link>
        )}
      </p>
    </div>
  );
}
