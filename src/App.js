import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useProfile } from './lib/useProfile';
import Login from './pages/Login';
import Nav from './components/Nav';
import RequireRole from './components/RequireRole';
import AdminHome from './pages/AdminHome';
import AllPapers from './pages/AllPapers';
import AuditLog from './pages/AuditLog';
import TeacherHome from './pages/TeacherHome';
import QuestionBank from './pages/QuestionBank';
import GeneratePaper from './pages/GeneratePaper';
import DownloadPaper from './pages/DownloadPaper';
import './App.css';
import './pages.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  // Who is logged in?
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="container"><p>Loading…</p></div>;
  if (!session) return <Login />;

  return (
    <>
      <Nav email={session.user.email} />
      <div className="page">
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route
            path="/admin"
            element={<RequireRole role="admin"><AdminHome /></RequireRole>}
          />
          <Route
            path="/admin/papers"
            element={<RequireRole role="admin"><AllPapers /></RequireRole>}
          />
          <Route
            path="/admin/audit"
            element={<RequireRole role="admin"><AuditLog /></RequireRole>}
          />
          <Route path="/teacher" element={<TeacherHome />} />
          <Route path="/subject/:id/bank" element={<QuestionBank />} />
          <Route path="/subject/:id/generate" element={<GeneratePaper />} />
          <Route path="/papers/:id/download" element={<DownloadPaper />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}

// Send admins to /admin, teachers to /teacher.
function HomeRedirect() {
  const { profile, loading } = useProfile();
  if (loading) return <div className="card"><p>Loading…</p></div>;
  return <Navigate to={profile?.role === 'admin' ? '/admin' : '/teacher'} replace />;
}
