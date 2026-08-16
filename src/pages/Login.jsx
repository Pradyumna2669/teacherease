import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignIn, setIsSignIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSignUp() {
    setLoading(true);
    setMessage('');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) setMessage(error.message);
    else if (!data.session) setMessage('Check your email to confirm, then sign in.');
    else setMessage('Account created.');
    setLoading(false);
  }

  async function handleSignIn() {
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    setLoading(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (isSignIn) handleSignIn();
    else handleSignUp();
  }

  return (
    <div className="container">
      <div className="card">
        {/* PUBLIC_URL, not a relative path — Login renders at whatever route the
            signed-out user landed on, including nested ones like /subject/x/bank. */}
        <img
          className="crest"
          src={`${process.env.PUBLIC_URL}/crest.jpg`}
          alt="P. R. Pote Patil College of Engineering & Management, Amravati"
          width="96"
          height="96"
        />
        <p className="eyebrow">Department of Computer Science &amp; Engineering</p>
        <h1>Smart Question Paper Generator</h1>
        <p className="subtitle">
          {isSignIn
            ? 'Sign in to reach your subjects and question bank.'
            : 'Create an account. An admin will allot your subjects.'}
        </p>

        <form onSubmit={handleSubmit}>
          {!isSignIn && (
            <>
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </>
          )}

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
