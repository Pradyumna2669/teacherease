import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const PAGE = 50;

// Full timestamp — an audit log with a vague "2 days ago" is not an audit log.
const fmtStamp = (s) =>
  new Date(s).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const ACTIONS = [
  ['', 'All actions'],
  ['subject.create', 'Subject created'],
  ['subject.delete', 'Subject deleted'],
  ['paper.generate', 'Paper generated'],
  ['question.delete', 'Question deleted'],
  ['allotment.grant', 'Subject alloted'],
  ['allotment.revoke', 'Allotment revoked'],
];

const TONE = {
  'subject.delete': 'bad',
  'question.delete': 'bad',
  'allotment.revoke': 'warn',
  'paper.generate': 'ok',
};

// Admin: append-only activity trail. Rows are written by database triggers and
// SECURITY DEFINER functions, never by this app — so nothing here can be
// forged, edited or skipped from the client. There is no delete button by
// design; audit_logs has no UPDATE or DELETE policy at all.
export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [action, setAction] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(null); // row id whose JSON details are expanded

  const load = useCallback(async (pageNo, replace) => {
    let qry = supabase
      .from('audit_logs')
      .select('*')
      .order('at', { ascending: false })
      .range(pageNo * PAGE, pageNo * PAGE + PAGE - 1);
    if (action) qry = qry.eq('action', action);
    if (q.trim()) qry = qry.ilike('summary', `%${q.trim()}%`);

    const { data, error } = await qry;
    if (error) return setErr(error.message);
    setErr('');
    setDone((data || []).length < PAGE);
    setRows((prev) => (replace ? data || [] : [...prev, ...(data || [])]));
  }, [action, q]);

  // Filter change resets to page 0.
  useEffect(() => { setPage(0); load(0, true); }, [load]);

  function more() {
    const next = page + 1;
    setPage(next);
    load(next, false);
  }

  return (
    <div className="card wide">
      <h1>Audit log</h1>
      <p className="subtitle">
        Append-only. Every entry is written by the database itself.{' '}
        <Link to="/admin">← Admin</Link> · <Link to="/admin/papers">All papers →</Link>
      </p>

      <div className="row" style={{ marginBottom: 16 }}>
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          {ACTIONS.map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        <input
          placeholder="Search description…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="btn-sm" onClick={() => load(0, true)}>
          Refresh
        </button>
      </div>

      {err && <p className="msg">{err}</p>}
      {rows.length === 0 && !err && <p className="subtitle">No entries.</p>}

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Who</th>
              <th>Action</th>
              <th>What happened</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={TONE[r.action] === 'bad' ? 'row-bad' : ''}>
                <td className="nowrap mono">{fmtStamp(r.at)}</td>
                <td>
                  {r.actor_email || 'system'}
                  {r.actor_role && <span className="q-meta"> ({r.actor_role})</span>}
                </td>
                <td className="nowrap">
                  <span className={`pill ${TONE[r.action] || ''}`}>{r.action}</span>
                </td>
                <td>{r.summary}</td>
                <td>
                  {r.details && (
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={() => setOpen(open === r.id ? null : r.id)}
                    >
                      {open === r.id ? 'Hide' : 'Details'}
                    </button>
                  )}
                  {open === r.id && (
                    <pre className="json">{JSON.stringify(r.details, null, 2)}</pre>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!done && rows.length > 0 && (
        <button type="button" className="submit" onClick={more}>
          Load older entries
        </button>
      )}
    </div>
  );
}
