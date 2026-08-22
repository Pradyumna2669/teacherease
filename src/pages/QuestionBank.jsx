import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { attachImage, removeImage, signedUrls, validateImage }
  from '../lib/questionImages';
import Skeleton from '../components/Skeleton';

const EMPTY = { unit_no: 1, text: '', marks: 2, difficulty: 'medium', co_no: '', bt_level: '' };

// Step 5: unit-wise question bank for one subject.
// A question may carry one image (diagram, circuit, graph). The image is stored
// in the question-images bucket under the question's own id, so the question row
// is all you need to find it.
export default function QuestionBank() {
  const { id } = useParams();
  const [subject, setSubject] = useState(null);
  const [items, setItems] = useState([]);
  const [thumbs, setThumbs] = useState({});   // object path -> signed URL
  const [f, setF] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState(null);       // { text, ok }
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    const { data: subj } = await supabase.from('subjects').select('*').eq('id', id).single();
    setSubject(subj);
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('subject_id', id)
      .order('unit_no')
      .order('created_at');
    const list = data || [];
    setItems(list);

    try {
      setThumbs(await signedUrls(list.map((q) => q.image_url)));
    } catch {
      // Thumbnails are a convenience; a signing failure must not blank the bank.
      setThumbs({});
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  function pickFile(e) {
    const chosen = e.target.files?.[0] || null;
    if (!chosen) return setFile(null);
    const problem = validateImage(chosen);
    if (problem) {
      setMsg({ text: problem });
      e.target.value = '';
      return setFile(null);
    }
    setMsg(null);
    setFile(chosen);
  }

  async function add(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    // Insert first: the image is named after the question id, which the
    // database assigns, so the row has to exist before the upload.
    const { data: row, error } = await supabase
      .from('questions')
      .insert({
        subject_id: id,
        unit_no: Number(f.unit_no),
        text: f.text.trim(),
        marks: Number(f.marks),
        difficulty: f.difficulty,
        co_no: f.co_no ? Number(f.co_no) : null,
        bt_level: f.bt_level ? Number(f.bt_level) : null,
      })
      .select()
      .single();

    if (error) {
      setBusy(false);
      return setMsg({ text: error.message });
    }

    if (file) {
      try {
        await attachImage(row.id, file);
      } catch (err) {
        // The question is saved; only the image failed. Say so precisely.
        setBusy(false);
        setFile(null);
        if (fileRef.current) fileRef.current.value = '';
        load();
        return setMsg({ text: `Question saved, but the image failed: ${err.message}` });
      }
    }

    setBusy(false);
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    setF({ ...EMPTY, unit_no: f.unit_no, marks: f.marks }); // keep unit/marks for fast entry
    setMsg({ text: file ? 'Question with image added.' : 'Question added.', ok: true });
    load();
  }

  async function changeImage(q, e) {
    const chosen = e.target.files?.[0];
    e.target.value = '';
    if (!chosen) return;
    setMsg(null);
    try {
      await attachImage(q.id, chosen);
      setMsg({ text: 'Image attached.', ok: true });
      load();
    } catch (err) {
      setMsg({ text: err.message });
    }
  }

  async function dropImage(q) {
    if (!window.confirm('Remove the image from this question?')) return;
    try {
      await removeImage(q.id, q.image_url);
      setMsg({ text: 'Image removed.', ok: true });
      load();
    } catch (err) {
      setMsg({ text: err.message });
    }
  }

  async function toggle(q) {
    await supabase.from('questions').update({ is_active: !q.is_active }).eq('id', q.id);
    load();
  }

  async function remove(q) {
    if (!window.confirm('Delete this question?')) return;
    // Drop the image first, or it is left orphaned in the bucket.
    if (q.image_url) await removeImage(q.id, q.image_url).catch(() => {});
    await supabase.from('questions').delete().eq('id', q.id);
    load();
  }

  const byUnit = items.reduce((m, q) => {
    (m[q.unit_no] ??= []).push(q);
    return m;
  }, {});

  if (!subject) return <Skeleton rows={3} />;

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

        <label>Image (optional) — diagram, circuit or graph printed under the question</label>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={pickFile} />
        {file && <p className="subtitle">Attached: {file.name}</p>}

        <button className="submit" disabled={busy}>
          {busy ? 'Adding…' : 'Add question'}
        </button>
      </form>
      {msg && <p className={`msg ${msg.ok ? 'ok' : ''}`}>{msg.text}</p>}

      {Object.keys(byUnit).sort((a, b) => a - b).map((u) => (
        <div key={u} className="unit-block">
          <h3>Unit {u} <span className="count">({byUnit[u].length})</span></h3>
          {byUnit[u].map((q) => (
            <div key={q.id} className={`q-row ${q.is_active ? '' : 'inactive'}`}>
              <span className="q-meta">
                {q.marks}m · {q.difficulty}
                {q.bt_level ? ` · BTL${q.bt_level}` : ' · BTL—'}
                {q.co_no ? ` · CO${q.co_no}` : ' · CO—'}
              </span>
              <span className="q-text">
                {q.text}
                {q.image_url && thumbs[q.image_url] && (
                  <img className="q-thumb" src={thumbs[q.image_url]}
                    alt="Attached to this question" />
                )}
              </span>
              {q.image_url ? (
                <button className="btn-sm" onClick={() => dropImage(q)}>Remove image</button>
              ) : (
                <label className="btn-sm">
                  Add image
                  <input type="file" hidden
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(e) => changeImage(q, e)} />
                </label>
              )}
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
