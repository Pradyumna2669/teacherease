// Role-aware summary. Admin sees institute-wide totals, teacher sees their own.
// All counts use head:true so no rows are transferred, only the count.
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, Legend,
} from 'recharts';
import { supabase } from '../supabaseClient';
import { useProfile } from '../lib/useProfile';
import Skeleton from '../components/Skeleton';

const CHART_COLORS = ['#1E5C8F', '#0F6B57', '#9A5B00', '#8E1B2E', '#5B3A8E', '#0E6E7A'];

const fmt = (s) =>
  s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

export default function Dashboard() {
  const { profile, loading: pLoading } = useProfile();
  const [stats, setStats] = useState(null);
  const [subjectData, setSubjectData] = useState([]);
  const [variantData, setVariantData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
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

        // ── Stat counts ──
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

        // ── Questions per subject (bar chart) ──
        const { data: subs } = await supabase.from('subjects').select('id, code, name');
        if (subs) {
          const subjCounts = [];
          for (const s of subs) {
            const { count: c } = await supabase
              .from('questions')
              .select('*', { count: 'exact', head: true })
              .eq('subject_id', s.id);
            if (c > 0) {
              subjCounts.push({ name: s.code || s.name, questions: c });
            }
          }
          setSubjectData(subjCounts.sort((a, b) => b.questions - a.questions).slice(0, 8));
        }

        // ── Recent papers + variant pie + timeline area ──
        const { data: allPapers } = await supabase
          .from('papers')
          .select('id, title, variant, created_at, subjects(code)')
          .order('created_at', { ascending: false })
          .limit(50);

        if (allPapers) {
          setRecent(allPapers.slice(0, 5));

          // Variant distribution
          let norm = 0, back = 0;
          allPapers.forEach((p) => {
            if (p.variant === 'backlog') back++;
            else norm++;
          });
          setVariantData(
            [
              { name: 'Normal', value: norm },
              { name: 'Backlog', value: back },
            ].filter((v) => v.value > 0)
          );

          // Timeline: group by date
          const grouped = {};
          allPapers.forEach((p) => {
            const d = new Date(p.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            if (!grouped[key]) grouped[key] = { label, papers: 0 };
            grouped[key].papers++;
          });
          setTimelineData(
            Object.keys(grouped)
              .sort()
              .map((k) => ({ date: grouped[k].label, papers: grouped[k].papers }))
          );
        }
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, [pLoading, profile, count]);

  if (pLoading || (!stats && !err)) return <Skeleton rows={4} />;

  const admin = profile?.role === 'admin';

  return (
    <div className="card wide">
      <h1>Dashboard</h1>
      <p className="subtitle">
        {admin ? 'Institute-wide totals and analytics' : 'Your subjects, papers, and activity'}
      </p>
      {err && <p className="msg">{err}</p>}

      {/* ── Stat cards ── */}
      <div className="subj-grid">
        <div className="subj-card stat">
          <span className="stat-icon">📚</span>
          <b>{stats?.subjects ?? 0}</b>
          <span>{admin ? 'Subjects' : 'Subjects allotted'}</span>
        </div>
        <div className="subj-card stat">
          <span className="stat-icon">❓</span>
          <b>{stats?.questions ?? 0}</b>
          <span>Questions in bank</span>
        </div>
        <div className="subj-card stat">
          <span className="stat-icon">📄</span>
          <b>{stats?.papers ?? 0}</b>
          <span>Papers generated</span>
        </div>
        {admin && (
          <div className="subj-card stat">
            <span className="stat-icon">🛡️</span>
            <b>{stats?.audit ?? 0}</b>
            <span>Audit entries</span>
          </div>
        )}
      </div>

      {/* ── Charts row ── */}
      <h3>Analytics</h3>
      <div className="chart-row">
        {/* Area chart — generation activity */}
        <div className="chart-card">
          <h4>Generation activity</h4>
          <p className="chart-subtitle">Papers generated over time</p>
          <div style={{ width: '100%', height: 260 }}>
            {timelineData.length > 0 ? (
              <ResponsiveContainer>
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="papers"
                    name="Papers"
                    stroke={CHART_COLORS[0]}
                    fill={CHART_COLORS[0]}
                    fillOpacity={0.18}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="subtitle" style={{ textAlign: 'center', paddingTop: 80 }}>
                No activity data yet.
              </p>
            )}
          </div>
        </div>

        {/* Bar chart — questions per subject */}
        <div className="chart-card">
          <h4>Questions per subject</h4>
          <p className="chart-subtitle">Top subjects by question bank size</p>
          <div style={{ width: '100%', height: 260 }}>
            {subjectData.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={subjectData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="questions" name="Questions" radius={[4, 4, 0, 0]}>
                    {subjectData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="subtitle" style={{ textAlign: 'center', paddingTop: 80 }}>
                No questions yet.
              </p>
            )}
          </div>
        </div>

        {/* Pie chart — variant distribution */}
        <div className="chart-card">
          <h4>Paper variants</h4>
          <p className="chart-subtitle">Normal vs backlog distribution</p>
          <div style={{ width: '100%', height: 260 }}>
            {variantData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={variantData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                  >
                    {variantData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="subtitle" style={{ textAlign: 'center', paddingTop: 80 }}>
                No papers generated yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent papers ── */}
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

      {/* ── Quick actions ── */}
      <h3>Quick actions</h3>
      <div className="action-grid">
        {admin ? (
          <>
            <Link to="/admin" className="action-card">
              <span className="action-icon">🎛️</span> Control panel
            </Link>
            <Link to="/admin/papers" className="action-card">
              <span className="action-icon">📄</span> All papers
            </Link>
            <Link to="/admin/audit" className="action-card">
              <span className="action-icon">🔍</span> Audit log
            </Link>
          </>
        ) : (
          <>
            <Link to="/teacher" className="action-card">
              <span className="action-icon">📚</span> My subjects
            </Link>
            <Link to="/profile" className="action-card">
              <span className="action-icon">👤</span> Profile
            </Link>
            <Link to="/settings" className="action-card">
              <span className="action-icon">⚙️</span> Settings
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
