// Landing page. Role-aware entry points with stats overview.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useProfile } from '../lib/useProfile';
import Skeleton from '../components/Skeleton';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { profile, loading } = useProfile();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      const count = async (table) => {
        const { count: n } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        return n ?? 0;
      };
      try {
        const [subjects, questions, papers] = await Promise.all([
          count('subjects'),
          count('questions'),
          count('papers'),
        ]);
        setStats({ subjects, questions, papers });
      } catch (e) {
        console.error(e);
        setStats({ subjects: 0, questions: 0, papers: 0 });
      }
    })();
  }, []);

  if (loading) return <Skeleton rows={3} />;

  const admin = profile?.role === 'admin';
  const name = profile?.full_name || 'User';

  const adminCards = [
    { title: 'Control Panel', to: '/admin', icon: '🎛️', desc: 'Manage subjects, allotments and system settings.' },
    { title: 'All Papers', to: '/admin/papers', icon: '📄', desc: 'View every generated question paper.' },
    { title: 'Audit Log', to: '/admin/audit', icon: '🔍', desc: 'Track all system activity and changes.' },
    { title: 'Dashboard', to: '/dashboard', icon: '📊', desc: 'Institute-wide analytics and charts.' },
  ];

  const teacherCards = [
    { title: 'My Subjects', to: '/teacher', icon: '📚', desc: 'Access your assigned subjects and question banks.' },
    { title: 'Dashboard', to: '/dashboard', icon: '📊', desc: 'Your personal statistics and activity.' },
    { title: 'Profile', to: '/profile', icon: '👤', desc: 'Update your display name and password.' },
    { title: 'Settings', to: '/settings', icon: '⚙️', desc: 'Theme, export format and preferences.' },
  ];

  const quickCards = admin ? adminCards : teacherCards;

  return (
    <div className="card wide">
      {/* Hero Section */}
      <div className="hero">
        <h1>
          <span className="greeting">{getGreeting()}, {name}</span>
        </h1>
        <span className={`role-badge ${admin ? 'admin' : 'teacher'}`}>
          {admin ? 'Administrator' : 'Teacher'}
        </span>
        <p className="subtitle" style={{ marginTop: 12 }}>
          Welcome to the Smart Question Paper Generator.
        </p>
      </div>

      {/* Stats Summary Strip */}
      <h3>At a glance</h3>
      <div className="subj-grid">
        <div className="subj-card stat">
          <span className="stat-icon">📚</span>
          <b>{stats?.subjects ?? '—'}</b>
          <span>Subjects</span>
        </div>
        <div className="subj-card stat">
          <span className="stat-icon">❓</span>
          <b>{stats?.questions ?? '—'}</b>
          <span>Questions in bank</span>
        </div>
        <div className="subj-card stat">
          <span className="stat-icon">📄</span>
          <b>{stats?.papers ?? '—'}</b>
          <span>Papers generated</span>
        </div>
      </div>

      {/* Quick Access Cards */}
      <h3>Quick access</h3>
      <div className="quick-grid">
        {quickCards.map((c, i) => (
          <Link to={c.to} key={i} className="quick-card">
            <span className="qc-icon">{c.icon}</span>
            <span className="qc-title">{c.title}</span>
            <span className="qc-desc">{c.desc}</span>
          </Link>
        ))}
      </div>

      {/* How it works */}
      <h3>How a paper is produced</h3>
      <div className="steps-grid">
        <div className="step-card">
          <span className="step-num">1</span>
          <span className="step-icon">📝</span>
          <div className="step-title">Maintain Bank</div>
          <div className="step-desc">
            Build your unit-wise question bank with marks, Bloom's level and course outcomes.
          </div>
        </div>
        <div className="step-card">
          <span className="step-num">2</span>
          <span className="step-icon">📋</span>
          <div className="step-title">Pick Format</div>
          <div className="step-desc">
            Choose a paper format, exam cycle, and variant — normal or backlog.
          </div>
        </div>
        <div className="step-card">
          <span className="step-num">3</span>
          <span className="step-icon">⚙️</span>
          <div className="step-title">Auto Generate</div>
          <div className="step-desc">
            The system selects questions intelligently and stores the paper securely.
          </div>
        </div>
        <div className="step-card">
          <span className="step-num">4</span>
          <span className="step-icon">📥</span>
          <div className="step-title">Download</div>
          <div className="step-desc">
            Export as Word, PDF or image. Questions are never shown on screen.
          </div>
        </div>
      </div>

      <div className="info-note">
        <strong>Note:</strong> Questions issued in an exam cycle are excluded from later
        papers in the same cycle, so the backlog paper can never repeat the normal paper.
      </div>
    </div>
  );
}
