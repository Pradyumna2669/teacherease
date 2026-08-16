import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import DeleteSubjectDialog from '../components/DeleteSubjectDialog';

// Admin: create subjects, allot subjects to teachers, delete subjects.
export default function AdminHome() {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [allot, setAllot] = useState([]);
  const [nsub, setNsub] = useState({ code: '', name: '', semester: '' });
  const [asg, setAsg] = useState({ teacher_id: '', subject_id: '' });
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);       // green vs alert styling
  const [toDelete, setToDelete] = useState(null); // subject pending confirmation

  const load = useCallback(async () => {
    const { data: s } = await supabase.from('subjects').select('*').order('code');
    setSubjects(s || []);
    const { data: t } = await supabase
      .from('profiles').select('id, full_name, role').eq('role', 'teacher');
    setTeachers(t || []);
    const { data: a } = await supabase
      .from('teacher_subjects')
      .select('teacher_id, subject_id, subjects(code, name)');
    setAllot(a || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const teacherName = (id) =>
    teachers.find((t) => t.id === id)?.full_name || id.slice(0, 8);

  async function addSubject(e) {
    e.preventDefault();
    setMsg('');
    setMsgOk(false);
    const { error } = await supabase.from('subjects').insert({
      code: nsub.code.trim(),
      name: nsub.name.trim(),
      semester: nsub.semester ? Number(nsub.semester) : null,
    });
    if (error) return setMsg(error.message);
    setNsub({ code: '', name: '', semester: '' });
    load();
  }

  async function assign(e) {
    e.preventDefault();
    setMsg('');
    setMsgOk(false);
    if (!asg.teacher_id || !asg.subject_id) return setMsg('Pick teacher and subject.');
    const { error } = await supabase.from('teacher_subjects').insert(asg);
    if (error) return setMsg(error.message);
    setAsg({ teacher_id: '', subject_id: '' });
    load();
  }

  async function unassign(r) {
    await supabase
      .from('teacher_subjects')
      .delete()
      .eq('teacher_id', r.teacher_id)
      .eq('subject_id', r.subject_id);
    load();
  }

  // Called after delete_subject() succeeds. `counts` is what the DB destroyed.
  function afterDelete(subject, counts) {
    setToDelete(null);
    setMsg(
      `Deleted ${subject.code} — ${counts?.questions ?? 0} questions and ` +
      `${counts?.papers ?? 0} papers removed. Recorded in the audit log.`
    );
    setMsgOk(true);
    load();
  }

  return (
    <div className="card wide">
      <h1>Admin</h1>
      <p className="subtitle">
        <Link to="/admin/papers">All generated papers →</Link> ·{' '}
        <Link to="/admin/audit">Audit log →</Link>
      </p>

      <h3>Add subject</h3>
      <form onSubmit={addSubject} className="row">
        <input placeholder="Code" value={nsub.code}
          onChange={(e) => setNsub({ ...nsub, code: e.target.value })} required />
        <input placeholder="Name" value={nsub.name}
          onChange={(e) => setNsub({ ...nsub, name: e.target.value })} required />
        <input placeholder="Sem" type="number" value={nsub.semester}
          onChange={(e) => setNsub({ ...nsub, semester: e.target.value })} />
        <button className="submit compact">Add</button>
      </form>

      <h3>Allot subject to teacher</h3>
      <form onSubmit={assign} className="row">
        <select value={asg.teacher_id}
          onChange={(e) => setAsg({ ...asg, teacher_id: e.target.value })}>
          <option value="">— teacher —</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.full_name || t.id.slice(0, 8)}</option>
          ))}
        </select>
        <select value={asg.subject_id}
          onChange={(e) => setAsg({ ...asg, subject_id: e.target.value })}>
          <option value="">— subject —</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.code} {s.name}</option>
          ))}
        </select>
        <button className="submit compact">Assign</button>
      </form>
      {msg && <p className={`msg ${msgOk ? 'ok' : ''}`}>{msg}</p>}

      <h3>Current allotments</h3>
      {allot.length === 0 && <p className="subtitle">None yet.</p>}
      {allot.map((r, i) => (
        <div key={i} className="q-row">
          <span className="q-text">
            {r.subjects?.code} {r.subjects?.name} → {teacherName(r.teacher_id)}
          </span>
          <button className="btn-sm danger" onClick={() => unassign(r)}>✕</button>
        </div>
      ))}

      <h3>Subjects <span className="count">({subjects.length})</span></h3>
      {subjects.length === 0 && <p className="subtitle">None yet.</p>}
      {subjects.map((s) => (
        <div key={s.id} className="q-row">
          <span className="q-meta">{s.code}</span>
          <span className="q-text">
            {s.name}{s.semester ? ` · Sem ${s.semester}` : ''}
          </span>
          <Link className="btn-sm" to={`/subject/${s.id}/bank`}>Bank</Link>
          <button className="btn-sm danger" onClick={() => setToDelete(s)}>
            Delete
          </button>
        </div>
      ))}

      {toDelete && (
        <DeleteSubjectDialog
          subject={toDelete}
          onClose={() => setToDelete(null)}
          onDeleted={afterDelete}
        />
      )}
    </div>
  );
}
