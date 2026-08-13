import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Nav({ email }) {
  return (
    <nav className="nav">
      <Link to="/" className="brand">📄 Paper Generator</Link>
      <span className="nav-spacer" />
      <span className="nav-email">{email}</span>
      <button className="btn-sm" onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>
    </nav>
  );
}
