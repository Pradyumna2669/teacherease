import { Link } from 'react-router-dom';
import { useProfile } from '../lib/useProfile';
import Skeleton from '../components/Skeleton';

// Landing page. Role-aware list of entry points — no data fetching of its own.
export default function Home() {
  const { profile, loading } = useProfile();
  if (loading) return <Skeleton rows={2} />;

  const admin = profile?.role === 'admin';

  return (
    <div className="card wide">
      <h1>Smart Question Paper Generator</h1>
      <p className="subtitle">
        Signed in as {profile?.full_name || 'user'} ({profile?.role || 'teacher'})
      </p>

      <h3>Go to</h3>
      <ul>
        <li><Link to="/dashboard">Dashboard</Link> — counts and recent activity</li>
        {admin ? (
          <>
            <li><Link to="/admin">Administrator Control Panel</Link> — subjects, allotments, deletion</li>
            <li><Link to="/admin/papers">All generated papers</Link></li>
            <li><Link to="/admin/audit">Audit log viewer</Link></li>
          </>
        ) : (
          <li><Link to="/teacher">My subjects</Link> — question bank and paper generation</li>
        )}
        <li><Link to="/profile">User profile</Link></li>
        <li><Link to="/settings">Settings</Link></li>
      </ul>

      <h3>How a paper is produced</h3>
      <ol>
        <li>Maintain the unit-wise question bank for a subject.</li>
        <li>Pick a paper format, an exam cycle and the variant (normal or backlog).</li>
        <li>The database selects the questions and stores the paper.</li>
        <li>Download it as Word, PDF or image.</li>
      </ol>
      <p className="subtitle">
        Questions issued in an exam cycle are excluded from later papers in the same
        cycle, so the backlog paper can never repeat the normal paper.
      </p>
    </div>
  );
}
