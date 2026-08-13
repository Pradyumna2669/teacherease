import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const EMPTY = { unit_no: 1, text: '', marks: 2, difficulty: 'medium', co_no: '', bt_level: '' };

// Step 5: unit-wise question bank for one subject.
export default function QuestionBank() {
  const { id } = useParams();
  const [subject, setSubject] = useState(null);
  const [items, setItems] = useState([]);
  const [f, setF] = useState(EMPTY);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: subj } = await supabase.from('subjects').select('*').eq('id', id).single();
    setSubject(subj);
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('subject_id', id)
      .order('unit_no')
      .order('created_at');
    setItems(data || []);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function add(e) {
    e.preventDefault();
    setMsg('');
    setBusy(true);
    const { error } = await supabase.from('questions').insert({
      subject_id: id,
      unit_no: Number(f.unit_no),
      text: f.text.trim(),
      marks: Number(f.marks),
      difficulty: f.difficulty,
      co_no: f.co_no ? Number(f.co_no) : null,
      bt_level: f.bt_level ? Number(f.bt_level) : null,
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    setF({ ...EMPTY, unit_no: f.unit_no, marks: f.marks }); // keep unit/marks for fast entry
    load();
  }

  async function toggle(q) {
    await supabase.from('questions').update({ is_active: !q.is_active }).eq('id', q.id);
    load();
  }

  async function remove(q) {
    if (!window.confirm('Delete this question?')) return;
    await supabase.from('questions').delete().eq('id', q.id);
    load();
  }

  const byUnit = items.reduce((m, q) => {
    (m[q.unit_no] ??= []).push(q);
    return m;
  }, {});

  if (!subject) return <div className="card"><p>Loading…</p></div>;

  return (
    <div className="card wide">
      <h1>Question bank</h1>
      <p className="subtitle">
        {subject.code} — {subject.name}{'  '}
        <Link to={`/subject/${id}/generate`}>→ Generate paper</Link>
      </p>

      <form onSubmit={add} className="q-form">
        <div className="row">
          <div>
            <label>Unit</label>
            <input type="number" min="1" value={f.unit_no}
              onChange={(e) => setF({ ...f, unit_no: e.target.value })} required />
          </div>
          <div>
            <label>Marks</label>
            <input type="number" min="1" value={f.marks}
              onChange={(e) => setF({ ...f, marks: e.target.value })} required />
          </div>
          <div>
            <label>Difficulty</label>
            <select value={f.difficulty}
              onChange={(e) => setF({ ...f, difficulty: e.target.value })}>
              <option>easy</option>
              <option>medium</option>
              <option>hard</option>
            </select>
          </div>
          <div>
            <label>CO</label>
            <input type="number" value={f.co_no}
              onChange={(e) => setF({ ...f, co_no: e.target.value })} />
          </div>
          <div>
            <label>Bloom</label>
            <input type="number" min="1" max="6" value={f.bt_level}
              onChange={(e) => setF({ ...f, bt_level: e.target.value })} />
          </div>
        </div>
        <label>Question text</label>
        <textarea rows="2" value={f.text}
          onChange={(e) => setF({ ...f, text: e.target.value })} required />
        <button className="submit" disabled={busy}>{busy ? 'Adding…' : 'Add question'}</button>
      </form>
      {msg && <p className="msg">{msg}</p>}

      {Object.keys(byUnit).sort((a, b) => a - b).map((u) => (
        <div key={u} className="unit-block">
          <h3>Unit {u} <span className="count">({byUnit[u].length})</span></h3>
          {byUnit[u].map((q) => (
            <div key={q.id} className={`q-row ${q.is_active ? '' : 'inactive'}`}>
              <span className="q-meta">
                {q.marks}m · {q.difficulty}{q.co_no ? ` · CO${q.co_no}` : ''}
              </span>
              <span className="q-text">{q.text}</span>
              <button className="btn-sm" onClick={() => toggle(q)}>
                {q.is_active ? 'Disable' : 'Enable'}
              </button>
              <button className="btn-sm danger" onClick={() => remove(q)}>✕</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
