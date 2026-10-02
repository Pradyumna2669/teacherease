import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { attachImage, removeImage, signedUrls, validateImage }
  from '../lib/questionImages';
import { parseQuestionFile, validateImportedQuestionRows, formatImportSummary }
  from '../lib/questionImport';
import Skeleton from '../components/Skeleton';
import * as XLSX from 'xlsx';

// Generate and download a sample Excel template so teachers know the format.
function downloadTemplate() {
  const header = ['unit_no', 'marks', 'difficulty', 'co_no', 'bt_level', 'question_text'];
  const sample = [
    [1, 2, 'easy',   1, 1, 'Define the term "algorithm" and give an example.'],
    [1, 5, 'medium', 1, 3, 'Explain the difference between stack and queue with a diagram.'],
    [2, 10, 'hard',  2, 5, 'Design a solution using dynamic programming for the knapsack problem.'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([header, ...sample]);

  ws['!cols'] = [
    { wch: 8 },   // unit_no
    { wch: 6 },   // marks
    { wch: 10 },  // difficulty
    { wch: 6 },   // co_no
    { wch: 8 },   // bt_level
    { wch: 70 },  // question_text
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Questions');
  XLSX.writeFile(wb, 'question_import_template.xlsx');
}

// Export the entire question bank for this subject to Excel
function exportBankToExcel(subjectCode, questions) {
  if (!questions || questions.length === 0) {
    alert('No questions available to export.');
    return;
  }
  const header = ['unit_no', 'marks', 'difficulty', 'co_no', 'bt_level', 'question_text', 'status'];
  const rows = questions.map((q) => [
    q.unit_no,
    q.marks,
    q.difficulty,
    q.co_no ?? '',
    q.bt_level ?? '',
    q.text,
    q.is_active ? 'active' : 'inactive',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

  ws['!cols'] = [
    { wch: 8 },   // unit_no
    { wch: 6 },   // marks
    { wch: 10 },  // difficulty
    { wch: 6 },   // co_no
    { wch: 8 },   // bt_level
    { wch: 70 },  // question_text
    { wch: 10 },  // status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'QuestionBank');
  const filename = `${subjectCode || 'Subject'}_Question_Bank_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

const EMPTY = { unit_no: 1, text: '', marks: 2, difficulty: 'medium', co_no: '', bt_level: '' };

// Step 5: unit-wise question bank for one subject.
export default function QuestionBank() {
  const { id } = useParams();
  const [subject, setSubject] = useState(null);
  const [items, setItems] = useState([]);
  const [thumbs, setThumbs] = useState({});   // object path -> signed URL
  const [f, setF] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState(null);       // { text, ok }
  const [busy, setBusy] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [readingImport, setReadingImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);
  const importFileRef = useRef(null);

  // Search and Multi-Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterBtLevel, setFilterBtLevel] = useState('');
  const [filterCoNo, setFilterCoNo] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  const load = useCallback(async () => {
    const { data: subj, error: subjectError } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', id)
      .single();
    if (subjectError) {
      setMsg({ text: `Could not load the subject: ${subjectError.message}` });
      return;
    }
    setSubject(subj);
    const { data, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('subject_id', id)
      .order('unit_no')
      .order('created_at');
    if (questionsError) {
      setMsg({ text: `Could not load questions: ${questionsError.message}` });
      return;
    }
    const list = data || [];
    setItems(list);

    try {
      setThumbs(await signedUrls(list.map((q) => q.image_url)));
    } catch {
      setThumbs({});
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Derived filtered items based on search and multi-filters
  const filteredItems = useMemo(() => {
    return items.filter((q) => {
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        if (!q.text.toLowerCase().includes(s)) return false;
      }
      if (filterUnit && String(q.unit_no) !== String(filterUnit)) return false;
      if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
      if (filterBtLevel && String(q.bt_level) !== String(filterBtLevel)) return false;
      if (filterCoNo && String(q.co_no) !== String(filterCoNo)) return false;
      return true;
    });
  }, [items, searchTerm, filterUnit, filterDifficulty, filterBtLevel, filterCoNo]);

  // Units present in this subject
  const availableUnits = useMemo(() => {
    const set = new Set(items.map((q) => q.unit_no).filter(Boolean));
    return Array.from(set).sort((a, b) => a - b);
  }, [items]);

  // NBA / OBE Analytics Metrics
  const analytics = useMemo(() => {
    const total = items.length;
    if (total === 0) return null;

    const bloomLevels = [
      { level: 1, name: 'L1: Remember' },
      { level: 2, name: 'L2: Understand' },
      { level: 3, name: 'L3: Apply' },
      { level: 4, name: 'L4: Analyze' },
      { level: 5, name: 'L5: Evaluate' },
      { level: 6, name: 'L6: Create' },
    ].map((b) => {
      const count = items.filter((q) => q.bt_level === b.level).length;
      return { ...b, count, pct: Math.round((count / total) * 100) };
    });

    const coCounts = [1, 2, 3, 4, 5, 6].map((co) => {
      const count = items.filter((q) => q.co_no === co).length;
      return { co: `CO${co}`, count, pct: Math.round((count / total) * 100) };
    });

    const difficulties = [
      { key: 'easy', label: 'Easy', color: 'var(--ok, #14603F)' },
      { key: 'medium', label: 'Medium', color: 'var(--c3, #9A5B00)' },
      { key: 'hard', label: 'Hard', color: 'var(--seal, #8E1B2E)' },
    ].map((d) => {
      const count = items.filter((q) => q.difficulty === d.key).length;
      return { ...d, count, pct: Math.round((count / total) * 100) };
    });

    const totalMarks = items.reduce((sum, q) => sum + (q.marks || 0), 0);

    return { bloomLevels, coCounts, difficulties, totalMarks, total };
  }, [items]);

  function resetFilters() {
    setSearchTerm('');
    setFilterUnit('');
    setFilterDifficulty('');
    setFilterBtLevel('');
    setFilterCoNo('');
  }

  const hasActiveFilters = Boolean(
    searchTerm || filterUnit || filterDifficulty || filterBtLevel || filterCoNo
  );

  function pickFile(e) {
    const chosen = e.target.files?.[0] || null;
    if (!chosen) return setFile(null);
    const extension = chosen.name.toLowerCase().split('.').pop();
    if (['csv', 'xlsx', 'xls'].includes(extension)) {
      setMsg({ text: 'Spreadsheet detected. Use the "Choose CSV / Excel file" button above to import questions.' });
      e.target.value = '';
      return setFile(null);
    }
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
    setF({ ...EMPTY, unit_no: f.unit_no, marks: f.marks });
    setMsg({ text: file ? 'Question with image added.' : 'Question added.', ok: true });
    load();
  }

  async function handleImportFileChange(e) {
    const chosen = e.target.files?.[0] || null;
    if (!chosen) return;
    e.target.value = '';

    setReadingImport(true);
    try {
      setMsg(null);
      const rows = await parseQuestionFile(chosen);
      const result = validateImportedQuestionRows(rows);

      setImportPreview({
        fileName: chosen.name,
        validRows: result.validRows,
        invalidRows: result.invalidRows,
        summary: result.summary,
        allRows: rows,
      });

      if (result.validRows.length === 0) {
        setMsg({ text: 'No valid question rows were found in the uploaded file.' });
      }
    } catch (err) {
      setImportPreview(null);
      setMsg({ text: `Could not read ${chosen.name}: ${err.message}` });
    } finally {
      setReadingImport(false);
    }
  }

  async function importSelectedQuestions() {
    if (!importPreview || importPreview.validRows.length === 0) return;

    setImporting(true);
    setMsg(null);

    try {
      const payload = importPreview.validRows.map((row) => ({
        subject_id: id,
        unit_no: Number(row.unit_no),
        text: row.text.trim(),
        marks: Number(row.marks),
        difficulty: row.difficulty,
        co_no: row.co_no != null ? Number(row.co_no) : null,
        bt_level: row.bt_level != null ? Number(row.bt_level) : null,
        is_active: true,
      }));

      const { error } = await supabase.from('questions').insert(payload);
      if (error) throw error;

      setMsg({ text: `Imported ${payload.length} question(s).`, ok: true });
      setImportPreview(null);
      if (importFileRef.current) importFileRef.current.value = '';
      await load();
    } catch (err) {
      setMsg({ text: err.message });
    } finally {
      setImporting(false);
    }
  }

  function cancelImportPreview() {
    setImportPreview(null);
    if (importFileRef.current) importFileRef.current.value = '';
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
    if (q.image_url) await removeImage(q.id, q.image_url).catch(() => {});
    await supabase.from('questions').delete().eq('id', q.id);
    load();
  }

  // Group filtered questions by unit
  const byUnit = filteredItems.reduce((m, q) => {
    (m[q.unit_no] ??= []).push(q);
    return m;
  }, {});

  if (!subject) return <Skeleton rows={3} />;

  return (
    <div className="card wide">
      <h1>Question bank</h1>
      <p className="subtitle">
        {subject.code} — {subject.name}{' · '}
        <Link to={`/subject/${id}/generate`}>→ Generate paper</Link>
      </p>

      {/* Toolbar: Import / Template / Export / Analytics */}
      <div className="import-toolbar">
        <button
          type="button"
          className="submit compact import-control"
          disabled={readingImport}
          onClick={() => importFileRef.current?.click()}
        >
          {readingImport ? 'Reading file...' : '📥 Choose CSV / Excel'}
        </button>
        <input
          ref={importFileRef}
          id="import-question-file"
          data-role="import-question-file"
          type="file"
          hidden
          accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleImportFileChange}
          aria-label="Import questions from CSV or Excel"
        />
        <button type="button" className="btn-sm" onClick={downloadTemplate}>
          📄 Download Template
        </button>
        <button
          type="button"
          className="btn-sm"
          onClick={() => exportBankToExcel(subject.code, items)}
          disabled={items.length === 0}
        >
          📤 Export Bank (.xlsx)
        </button>
        <button
          type="button"
          className={`btn-sm ${showAnalytics ? 'active' : ''}`}
          onClick={() => setShowAnalytics(!showAnalytics)}
        >
          📊 {showAnalytics ? 'Hide OBE Analytics' : 'NBA / OBE Analytics'}
        </button>
      </div>

      {/* NBA / OBE Analytics Widget */}
      {showAnalytics && analytics && (
        <div className="analytics-section">
          <div className="analytics-header">
            <h3 style={{ margin: 0 }}>NBA / NAAC Outcome-Based Analytics</h3>
            <span className="mono">Total questions: {analytics.total} · Total marks: {analytics.totalMarks}m</span>
          </div>

          <div className="analytics-grid">
            {/* Bloom's Taxonomy Distribution */}
            <div className="analytics-subcard">
              <h5>Bloom's Taxonomy Levels</h5>
              <div className="progress-list">
                {analytics.bloomLevels.map((b) => (
                  <div key={b.level} className="progress-item">
                    <span className="progress-label" title={b.name}>{b.name.split(':')[0]}</span>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${b.pct}%`,
                          background: 'linear-gradient(90deg, var(--c1) 0%, var(--seal) 100%)',
                        }}
                      />
                    </div>
                    <span className="progress-val">{b.count} ({b.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Course Outcomes Coverage */}
            <div className="analytics-subcard">
              <h5>Course Outcome (CO) Coverage</h5>
              <div className="progress-list">
                {analytics.coCounts.map((co) => (
                  <div key={co.co} className="progress-item">
                    <span className="progress-label">{co.co}</span>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${co.pct}%`,
                          background: 'var(--c2, #0F6B57)',
                        }}
                      />
                    </div>
                    <span className="progress-val">{co.count} ({co.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulty Breakdown */}
            <div className="analytics-subcard">
              <h5>Difficulty Ratio</h5>
              <div className="progress-list">
                {analytics.difficulties.map((d) => (
                  <div key={d.key} className="progress-item">
                    <span className="progress-label">{d.label}</span>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${d.pct}%`, background: d.color }}
                      />
                    </div>
                    <span className="progress-val">{d.count} ({d.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Question Form */}
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
              onChange={(e) => setF({ ...f, co_no: e.target.value })} placeholder="e.g. 1" />
          </div>
          <div>
            <label>Bloom (1-6)</label>
            <input type="number" min="1" max="6" value={f.bt_level}
              onChange={(e) => setF({ ...f, bt_level: e.target.value })} placeholder="1..6" />
          </div>
        </div>

        <label>Question text</label>
        <textarea rows="2" value={f.text}
          onChange={(e) => setF({ ...f, text: e.target.value })} required />

        <label>Question image (optional) — PNG, JPG, WEBP or GIF only</label>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={pickFile} />
        {file && <p className="subtitle">Attached: {file.name}</p>}

        <button className="submit" disabled={busy}>
          {busy ? 'Adding…' : 'Add question'}
        </button>
      </form>
      {msg && <p className={`msg ${msg.ok ? 'ok' : ''}`}>{msg.text}</p>}

      {/* Search & Multi-Filter Bar */}
      <div className="bank-filter-bar">
        <input
          type="text"
          className="bank-search-input"
          placeholder="🔍 Search question text..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="bank-filter-select"
          value={filterUnit}
          onChange={(e) => setFilterUnit(e.target.value)}
        >
          <option value="">All Units</option>
          {availableUnits.map((u) => (
            <option key={u} value={u}>Unit {u}</option>
          ))}
        </select>

        <select
          className="bank-filter-select"
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <select
          className="bank-filter-select"
          value={filterBtLevel}
          onChange={(e) => setFilterBtLevel(e.target.value)}
        >
          <option value="">All BTL</option>
          {[1, 2, 3, 4, 5, 6].map((l) => (
            <option key={l} value={l}>BTL {l}</option>
          ))}
        </select>

        <select
          className="bank-filter-select"
          value={filterCoNo}
          onChange={(e) => setFilterCoNo(e.target.value)}
        >
          <option value="">All COs</option>
          {[1, 2, 3, 4, 5, 6].map((co) => (
            <option key={co} value={co}>CO {co}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button type="button" className="btn-sm" onClick={resetFilters}>
            ✕ Clear
          </button>
        )}

        <div className="bank-filter-meta">
          <span>
            Showing <b>{filteredItems.length}</b> of {items.length} questions
            {hasActiveFilters && ' (filtered)'}
          </span>
          {hasActiveFilters && (
            <span className="mono">Active filters applied</span>
          )}
        </div>
      </div>

      {/* Import Preview Modal */}
      {importPreview && (
        <div className="modal-back">
          <div className="modal">
            <h2>Import review</h2>
            <p className="subtitle">File: {importPreview.fileName}</p>
            <div className="preview-meta">
              <span className="pill ok">{formatImportSummary(importPreview.summary)}</span>
              {importPreview.invalidRows.length > 0 && (
                <span className="pill bad">{importPreview.invalidRows.length} invalid row(s)</span>
              )}
            </div>

            {importPreview.invalidRows.length > 0 && (
              <div className="warn-box">
                These rows are excluded from the import until they are corrected.
              </div>
            )}

            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Marks</th>
                    <th>Difficulty</th>
                    <th>CO</th>
                    <th>Bloom</th>
                    <th>Question</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.validRows.map((row, index) => (
                    <tr key={`valid-${index}`}>
                      <td>{row.unit_no}</td>
                      <td>{row.marks}</td>
                      <td>{row.difficulty}</td>
                      <td>{row.co_no ?? '—'}</td>
                      <td>{row.bt_level ?? '—'}</td>
                      <td>{row.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importPreview.invalidRows.length > 0 && (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.invalidRows.map((row, index) => (
                      <tr key={`invalid-${index}`} className="row-bad">
                        <td>{row.rowNumber}</td>
                        <td>{row.errors.join(' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="row import-actions">
              <button
                type="button"
                className="submit compact"
                disabled={importing || importPreview.validRows.length === 0}
                onClick={importSelectedQuestions}
              >
                {importing ? 'Importing…' : 'Import questions'}
              </button>
              <button type="button" className="btn-sm" onClick={cancelImportPreview}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No questions matching search/filter empty state */}
      {filteredItems.length === 0 && (
        <div className="empty" style={{ margin: '20px 0' }}>
          {items.length === 0 ? (
            <p>No questions in this subject yet. Add questions using the form above or import an Excel/CSV file.</p>
          ) : (
            <div>
              <p>No questions match your current search or filter criteria.</p>
              <button type="button" className="btn-sm" onClick={resetFilters}>
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Unit Blocks */}
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
