import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// Step 6: choose a format + cycle + variant, call generate_paper RPC, redirect
// to the download page. Questions are NEVER rendered here.
export default function GeneratePaper() {
  const { id } = useParams(); // subject_id
  const nav = useNavigate();

  const [subject, setSubject] = useState(null);
  const [formats, setFormats] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [formatId, setFormatId] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [newCycle, setNewCycle] = useState('');
  const [variant, setVariant] = useState('normal');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data: subj } = await supabase.from('subjects').select('*').eq('id', id).single();
      setSubject(subj);

      // formats specific to this subject OR global (subject_id IS NULL)
      const { data: fmts } = await supabase
        .from('paper_formats')
        .select('*')
        .or(`subject_id.eq.${id},subject_id.is.null`)
        .eq('is_active', true);
      setFormats(fmts || []);
      if (fmts?.length) setFormatId(fmts[0].id);

      const { data: cyc } = await supabase
        .from('exam_cycles')
        .select('*')
        .eq('subject_id', id)
        .order('created_at', { ascending: false });
      setCycles(cyc || []);
    })();
  }, [id]);

  async function handleGenerate(e) {
    e.preventDefault();
    setMsg('');
    setBusy(true);
    try {
      // Resolve cycle: new name wins, else the selected existing cycle.
      let useCycleId = cycleId;
      if (newCycle.trim()) {
        const { data: c, error } = await supabase
          .from('exam_cycles')
          .insert({ subject_id: id, name: newCycle.trim() })
          .select()
          .single();
        if (error) throw error;
        useCycleId = c.id;
      }
      if (!useCycleId) throw new Error('Pick an existing cycle or enter a new cycle name.');

      const fmt = formats.find((x) => x.id === formatId);
      if (!fmt) throw new Error('Choose a format.');

      const { data: paperId, error } = await supabase.rpc('generate_paper', {
        p_subject_id: id,
        p_cycle_id: useCycleId,
        p_variant: variant,
        p_title: title.trim() || `${subject?.code} ${variant}`,
        p_blueprint: fmt.blueprint,
      });
      if (error) throw error; // e.g. "Unit 1 (2 marks): need 3, only 1 available"

      nav(`/papers/${paperId}/download`);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!subject) return <div className="card"><p>Loading…</p></div>;

  return (
    <div className="card wide">
      <h1>Generate paper</h1>
      <p className="subtitle">{subject.code} — {subject.name}</p>

      <form onSubmit={handleGenerate}>
        <label>Format</label>
        {formats.length === 0 && (
          <p className="msg">No formats defined. Seed the paper_formats table first.</p>
        )}
        <div className="fmt-grid">
          {formats.map((fmt) => (
            <label key={fmt.id} className={`fmt-card ${formatId === fmt.id ? 'sel' : ''}`}>
              <input type="radio" name="fmt" value={fmt.id}
                checked={formatId === fmt.id}
                onChange={() => setFormatId(fmt.id)} />
              <b>{fmt.name}</b>
              <span>{fmt.total_marks} marks</span>
            </label>
          ))}
        </div>

        <label>Exam cycle — Normal & Backlog must share the SAME cycle</label>
        <select value={cycleId} onChange={(e) => setCycleId(e.target.value)}>
          <option value="">— pick existing cycle —</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input placeholder="…or new cycle name (e.g. End Sem May 2026)"
          value={newCycle} onChange={(e) => setNewCycle(e.target.value)} />

        <label>Variant</label>
        <select value={variant} onChange={(e) => setVariant(e.target.value)}>
          <option value="normal">Normal</option>
          <option value="backlog">Backlog</option>
        </select>

        <label>Title (optional)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Question paper title" />

        <button className="submit" disabled={busy}>
          {busy ? 'Generating…' : 'Generate & download'}
        </button>
      </form>
      {msg && <p className="msg">{msg}</p>}
    </div>
  );
}
