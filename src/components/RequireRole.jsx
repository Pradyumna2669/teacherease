import { useProfile } from '../lib/useProfile';

// Gate a route behind a role. Renders children only for the matching role.
export default function RequireRole({ role, children }) {
  const { profile, loading } = useProfile();
  if (loading) return <div className="card"><p>Loading…</p></div>;
  if (profile?.role !== role) {
    return (
      <div className="card">
        <p className="msg">Access denied — requires {role} role.</p>
      </div>
    );
  }
  return children;
}
