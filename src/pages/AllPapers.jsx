import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const fmtDate = (s) =>
  s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

// Admin: every paper ever generated, across all subjects and teachers.
// Visible because of the papers_admin_select RLS policy (admin_audit.sql).
// Question text is NOT loaded here — the download page is the only place a
// paper's contents are ever materialised.
export default function AllPapers() {
  const [papers, setPapers] = useState([]);
  const [cycles, setCycles] = useState({});
  const [people, setPeople] = useState({});
  const [subjectId, setSubjectId] = useState('');
  const [variant, setVariant] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('papers')
      .select('*, subjects(code, name)')
      .order('created_at', { ascending: false });
    if (error) setErr(error.message);
    setPapers(data || []);

    // Cycle names and teacher names fetched separately and mapped by id —
    // avoids depending on PostgREST embed names for those relations.
    const { data: cyc } = await supabase.from('exam_cycles').select('id, name');
    setCycles(Object.fromEntries((cyc || []).map((c) => [c.id, c.name])));

    const { data: pr } = await supabase.from('profiles').select('id, full_name');
    setPeople(Object.fromEntries((pr || []).map((p) => [p.id, p.full_name])));

    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Subject list for the filter, derived from what actually has papers.
  const subjects = useMemo(() => {
    const m = new Map();
    papers.forEach((p) => {
      if (p.subject_id && !m.has(p.subject_id)) {
        m.set(p.subject_id, p.subjects?.code || p.subject_id.slice(0, 8));
      }
    });
    return [...m.entries()];
  }, [papers]);

  const shown = papers.filter(
    (p) =>
      (!subjectId || p.subject_id === subjectId) &&
      (!variant || p.variant === variant)
  );

  return (
    <div className="card wide">
      <h1>All generated papers</h1>
      <p className="subtitle">
        {papers.length} total · <Link to="/admin">← Admin</Link> ·{' '}
        <Link to="/admin/audit">Audit log →</Link>
      </p>

      <div className="row" style={{ marginBottom: 16 }}>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">All subjects</option>
          {subjects.map(([id, code]) => (
            <option key={id} value={id}>{code}</option>
          ))}
        </select>
        <select value={variant} onChange={(e) => setVariant(e.target.value)}>
          <option value="">Both variants</option>
          <option value="normal">Normal</option>
          <option value="backlog">Backlog</option>
        </select>
        <button type="button" className="btn-sm" onClick={load}>Refresh</button>
      </div>

      {err && <p className="msg">{err}</p>}
      {loading && <p className="subtitle">Loading…</p>}
      {!loading && shown.length === 0 && (
        <p className="empty">No papers match these filters.</p>
      )}

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
              <th>By</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id}>
                <td className="nowrap">{fmtDate(p.created_at)}</td>
                <td className="nowrap">{p.subjects?.code || '—'}</td>
                <td>{p.title}</td>
                <td>{cycles[p.cycle_id] || '—'}</td>
                <td>
                  <span className={`pill ${p.variant === 'backlog' ? 'warn' : ''}`}>
                    {p.variant}
                  </span>
                </td>
                <td className="nowrap">{p.total_marks}</td>
                <td>{people[p.created_by] || '—'}</td>
                <td>
                  <Link className="btn-sm" to={`/papers/${p.id}/download`}>Download</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
