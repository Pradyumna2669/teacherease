import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// Helper to extract slot requirements from various blueprint structures
function extractBlueprintRequirements(blueprint) {
  if (!blueprint) return [];
  let rawSlots = [];

  if (Array.isArray(blueprint)) {
    rawSlots = blueprint;
  } else if (Array.isArray(blueprint.slots)) {
    rawSlots = blueprint.slots;
  } else if (Array.isArray(blueprint.groups)) {
    blueprint.groups.forEach((g) => {
      ['A', 'B', 'questions', 'items'].forEach((key) => {
        if (Array.isArray(g[key])) {
          g[key].forEach((sub) => {
            rawSlots.push({
              unit_no: sub.unit_no ?? sub.unit ?? g.unit ?? 1,
              marks: sub.marks ?? sub.mark ?? 2,
              count: sub.count ?? 1,
            });
          });
        }
      });
    });
  }

  // Aggregate by unit_no and marks
  const aggregated = {};
  rawSlots.forEach((slot) => {
    const unit = slot.unit_no ?? slot.unit ?? 1;
    const marks = slot.marks ?? slot.mark ?? 2;
    const count = Number(slot.count ?? slot.needed ?? slot.qty ?? 1);
    const key = `U${unit}_${marks}m`;
    if (!aggregated[key]) {
      aggregated[key] = { unit, marks, needed: 0 };
    }
    aggregated[key].needed += count;
  });

  return Object.values(aggregated);
}

// Step 6: choose a format + cycle + variant, call generate_paper RPC, redirect
// to the download page. Questions are NEVER rendered here.
export default function GeneratePaper() {
  const { id } = useParams(); // subject_id
  const nav = useNavigate();

  const [subject, setSubject] = useState(null);
  const [formats, setFormats] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [issuedIds, setIssuedIds] = useState(new Set());
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

      // Fetch active questions in the bank for sufficiency checking
      const { data: qs } = await supabase
        .from('questions')
        .select('id, unit_no, marks, is_active')
        .eq('subject_id', id)
        .eq('is_active', true);
      setBankQuestions(qs || []);
    })();
  }, [id]);

  // When cycleId changes, load already issued question IDs for this cycle (to account for backlog)
  useEffect(() => {
    if (!cycleId) {
      setIssuedIds(new Set());
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('paper_questions')
        .select('question_id, papers!inner(cycle_id)')
        .eq('papers.cycle_id', cycleId);
      const set = new Set((data || []).map((r) => r.question_id));
      setIssuedIds(set);
    })();
  }, [cycleId]);

  const selectedFormat = formats.find((x) => x.id === formatId);

  // Compute Blueprint Readiness Analysis
  const readiness = useMemo(() => {
    if (!selectedFormat) return null;
    const reqs = extractBlueprintRequirements(selectedFormat.blueprint);
    if (reqs.length === 0) {
      // Fallback if blueprint structure cannot be parsed directly
      return {
        hasSpecificSlots: false,
        totalActive: bankQuestions.length,
        isSufficient: bankQuestions.length >= 10,
        slots: [],
      };
    }

    // Available pool: active questions not already issued in this cycle (if backlog)
    const eligiblePool = bankQuestions.filter((q) => {
      if (variant === 'backlog' && issuedIds.has(q.id)) return false;
      return true;
    });

    const slots = reqs.map((req) => {
      const available = eligiblePool.filter(
        (q) => q.unit_no === req.unit,
      ).filter(
        (q) => Number(q.marks) === Number(req.marks),
      ).length;
      return {
        unit: req.unit,
        marks: req.marks,
        needed: req.needed,
        available,
        ok: available >= req.needed,
      };
    });

    const isSufficient = slots.every((s) => s.ok);
    return {
      hasSpecificSlots: true,
      totalActive: bankQuestions.length,
      isSufficient,
      slots,
    };
  }, [selectedFormat, bankQuestions, issuedIds, variant]);

  async function handleGenerate(e) {
    e.preventDefault();
    setMsg('');
    setBusy(true);
    try {
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
      if (error) throw error;

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
      <p className="subtitle">
        {subject.code} — {subject.name}{' · '}
        <Link to={`/subject/${id}/bank`}>← Back to Question Bank</Link>
      </p>

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

        {/* Blueprint Readiness Indicator */}
        {readiness && (
          <div className={`readiness-card ${readiness.isSufficient ? 'ready' : 'deficient'}`}>
            <div className="readiness-header">
              <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                {readiness.isSufficient
                  ? '✅ Blueprint Readiness: Question Bank is ready for generation'
                  : '⚠️ Blueprint Readiness Warning: Insufficient questions in bank'}
              </span>
              <span className="mono">
                {bankQuestions.length} active questions in bank
              </span>
            </div>

            {readiness.hasSpecificSlots && (
              <div className="readiness-slot-grid">
                {readiness.slots.map((s, i) => (
                  <div key={i} className={`readiness-slot-item ${s.ok ? 'ok' : 'bad'}`}>
                    <span>
                      <b>Unit {s.unit}</b> ({s.marks}m)
                    </span>
                    <span className="mono">
                      {s.available} / {s.needed} {s.ok ? '✓' : '⚠️ Need ' + (s.needed - s.available)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!readiness.isSufficient && (
              <p className="msg" style={{ margin: '12px 0 0', fontSize: '0.84rem' }}>
                Notice: The question bank does not have enough questions for one or more slots.
                Generating now may trigger a database sufficiency exception.
                Add more questions in <Link to={`/subject/${id}/bank`}>Question Bank</Link> if needed.
              </p>
            )}
          </div>
        )}

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
          <option value="backlog">Backlog (excludes questions used in normal paper)</option>
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
