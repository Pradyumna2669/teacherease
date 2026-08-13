import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// Teacher landing: subjects allotted to me by admin.
export default function TeacherHome() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // RLS returns only this teacher's rows.
      const { data } = await supabase
        .from('teacher_subjects')
        .select('subject_id, subjects(id, code, name, semester)');
      setSubjects((data || []).map((r) => r.subjects).filter(Boolean));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="card"><p>Loading…</p></div>;

  return (
    <div className="card wide">
      <h1>My subjects</h1>
      {subjects.length === 0 && (
        <p className="subtitle">No subjects allotted yet. Ask the admin.</p>
      )}
      <div className="subj-grid">
        {subjects.map((s) => (
          <div key={s.id} className="subj-card">
            <b>{s.code}</b>
            <span>{s.name}</span>
            <div className="subj-links">
              <Link to={`/subject/${s.id}/bank`}>Question bank</Link>
              <Link to={`/subject/${s.id}/generate`}>Generate paper</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
