import { Link, NavLink } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useProfile } from '../lib/useProfile';

export default function Nav({ email }) {
  const { profile } = useProfile();
  const admin = profile?.role === 'admin';

  return (
    <nav className="nav">
      <Link to="/" className="brand">
        <img
          className="brand-mark"
          src={`${process.env.PUBLIC_URL}/crest.jpg`}
          alt=""
          width="28"
          height="28"
        />
        <span>Paper Generator</span>
      </Link>
      <NavLink to="/dashboard">Dashboard</NavLink>
      {admin
        ? <NavLink to="/admin">Admin</NavLink>
        : <NavLink to="/teacher">My subjects</NavLink>}
      <NavLink to="/papers">Papers</NavLink>
      <NavLink to="/profile">Profile</NavLink>
      <NavLink to="/settings">Settings</NavLink>
      <span className="nav-spacer" />
      <span className="nav-email">{email}</span>
      <button className="btn-sm" onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>
    </nav>
  );
}
