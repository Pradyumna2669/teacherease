import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './App.css';

function App() {
  // ---- STATE ----
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignIn, setIsSignIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [session, setSession] = useState(null);

  // ---- WHO IS LOGGED IN? ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---- SIGN UP ----
  async function handleSignUp() {
    setLoading(true);
    setMessage('');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
    } else if (!data.session) {
      setMessage('Check your email to confirm your account, then sign in.');
    } else {
      setMessage('Account created.');
    }
    setLoading(false);
  }

  // ---- SIGN IN ----
  async function handleSignIn() {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    setLoading(false);
  }

  // ---- SIGN OUT ----
  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (isSignIn) handleSignIn();
    else handleSignUp();
  }

  // ---- RENDER: logged in ----
  if (session) {
    return (
      <div className="container">
        <div className="card">
          <h1>Teacher Ease</h1>
          <p className="subtitle">Signed in as {session.user.email}</p>
          <button className="submit" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // ---- RENDER: auth form ----
  return (
    <div className="container">
      <div className="card">
        <h1>Teacher Ease</h1>
        <p className="subtitle">
          {isSignIn ? 'Sign in to your account' : 'Create an account'}
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={isSignIn ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="submit" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : isSignIn ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="toggle">
          {isSignIn ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              setIsSignIn(!isSignIn);
              setMessage('');
            }}
          >
            {isSignIn ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        {message && <p className="msg">{message}</p>}
      </div>
    </div>
  );
}

export default App;
