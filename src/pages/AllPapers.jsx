import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useProfile } from '../lib/useProfile';
import Skeleton from '../components/Skeleton';

const fmtDate = (s) =>
  s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

// Unified papers list for both Administrators and Teachers.
// Role-aware: Admins see institute-wide papers with creator names;
// Teachers see all papers generated for their allotted subjects.
export default function AllPapers() {
  const { profile, loading: pLoading } = useProfile();
  const [papers, setPapers] = useState([]);
  const [cycles, setCycles] = useState({});
  const [people, setPeople] = useState({});
  const [subjectId, setSubjectId] = useState('');
  const [variant, setVariant] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      let query = supabase
        .from('papers')
        .select('*, subjects(code, name)')
        .order('created_at', { ascending: false });

      // If teacher, filter by created_by or RLS already handles it
      if (profile && profile.role !== 'admin') {
        query = query.eq('created_by', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPapers(data || []);

      const { data: cyc } = await supabase.from('exam_cycles').select('id, name');
      setCycles(Object.fromEntries((cyc || []).map((c) => [c.id, c.name])));

      if (profile?.role === 'admin') {
        const { data: pr } = await supabase.from('profiles').select('id, full_name');
        setPeople(Object.fromEntries((pr || []).map((p) => [p.id, p.full_name])));
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!pLoading) load();
  }, [pLoading, load]);

  // Subject list for the dropdown filter
  const subjects = useMemo(() => {
    const m = new Map();
    papers.forEach((p) => {
      if (p.subject_id && !m.has(p.subject_id)) {
        m.set(p.subject_id, `${p.subjects?.code || ''} ${p.subjects?.name ? '— ' + p.subjects.name : ''}`.trim() || p.subject_id.slice(0, 8));
      }
    });
    return [...m.entries()];
  }, [papers]);

  // Filtered papers based on Subject, Variant, and Search term
  const shown = useMemo(() => {
    return papers.filter((p) => {
      if (subjectId && p.subject_id !== subjectId) return false;
      if (variant && p.variant !== variant) return false;
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesTitle = p.title?.toLowerCase().includes(s);
        const matchesCode = p.subjects?.code?.toLowerCase().includes(s);
        const matchesCycle = cycles[p.cycle_id]?.toLowerCase().includes(s);
        if (!matchesTitle && !matchesCode && !matchesCycle) return false;
      }
      return true;
    });
  }, [papers, subjectId, variant, searchTerm, cycles]);

  if (pLoading) return <Skeleton rows={3} />;

  return (
    <div className="card wide">
      <h1>{isAdmin ? 'All generated papers' : 'My generated papers'}</h1>
      <p className="subtitle">
        {papers.length} paper(s) found ·{' '}
        {isAdmin ? (
          <>
            <Link to="/admin">← Admin control panel</Link> ·{' '}
            <Link to="/admin/audit">Audit log →</Link>
          </>
        ) : (
          <>
            <Link to="/teacher">← My subjects</Link> ·{' '}
            <Link to="/dashboard">Dashboard</Link>
          </>
        )}
      </p>

      {/* Filter and Search Bar */}
      <div className="row" style={{ marginBottom: 18, gap: 12 }}>
        <input
          type="text"
          placeholder="🔍 Search title or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 2, minWidth: 200, marginBottom: 0 }}
        />
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          style={{ flex: 1.5, minWidth: 160, marginBottom: 0 }}
        >
          <option value="">All subjects</option>
          {subjects.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <select
          value={variant}
          onChange={(e) => setVariant(e.target.value)}
          style={{ flex: 1, minWidth: 120, marginBottom: 0 }}
        >
          <option value="">Both variants</option>
          <option value="normal">Normal</option>
          <option value="backlog">Backlog</option>
        </select>
        <button type="button" className="btn-sm" onClick={load}>
          Refresh
        </button>
      </div>

      {err && <p className="msg">{err}</p>}
      {loading && <p className="subtitle">Loading papers…</p>}

      {!loading && shown.length === 0 && (
        <div className="empty">
          <p>No question papers found matching your criteria.</p>
          {!isAdmin && (
            <p className="subtitle" style={{ margin: '8px 0 0' }}>
              Generate your first paper under <Link to="/teacher">My subjects</Link>.
            </p>
          )}
        </div>
      )}

      {shown.length > 0 && (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Generated</th>
                <th>Subject</th>
                <th>Title</th>
                <th>Cycle</th>
                <th>Variant</th>
                <th>Marks</th>
                {isAdmin && <th>By</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id}>
                  <td className="nowrap">{fmtDate(p.created_at)}</td>
                  <td className="nowrap">
                    <b>{p.subjects?.code || '—'}</b>
                  </td>
                  <td>{p.title}</td>
                  <td>{cycles[p.cycle_id] || '—'}</td>
                  <td>
                    <span className={`pill ${p.variant === 'backlog' ? 'warn' : 'ok'}`}>
                      {p.variant}
                    </span>
                  </td>
                  <td className="nowrap">{p.total_marks}m</td>
                  {isAdmin && <td>{people[p.created_by] || p.created_by?.slice(0, 8) || '—'}</td>}
                  <td>
                    <Link className="btn-sm" to={`/papers/${p.id}/download`}>
                      📥 Download
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
