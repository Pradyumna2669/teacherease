import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

// Confirmation dialog for deleting a subject.
//
// The typed-code check here is a courtesy, not the safeguard — delete_subject()
// re-checks the code and the admin role server-side, so calling the RPC
// directly from the API without them fails exactly the same way.
export default function DeleteSubjectDialog({ subject, onClose, onDeleted }) {
  const [preview, setPreview] = useState(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Ask the database what this delete would destroy, counted live.
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('subject_delete_preview', {
        p_subject_id: subject.id,
      });
      if (error) setErr(error.message);
      else setPreview(data);
    })();
  }, [subject.id]);

  const armed = typed.trim() === subject.code;

  async function confirmDelete() {
    setBusy(true);
    setErr('');
    const { data, error } = await supabase.rpc('delete_subject', {
      p_subject_id: subject.id,
      p_confirm_code: typed.trim(),
    });
    setBusy(false);
    if (error) return setErr(error.message);
    onDeleted(subject, data);
  }

  const n = (k) => Number(preview?.[k] ?? 0);

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Delete {subject.code}?</h3>
        <p className="subtitle">{subject.name}</p>

        {err && <p className="msg">{err}</p>}
        {!preview && !err && <p className="subtitle">Counting what will be lost…</p>}

        {preview && (
          <>
            <p className="warn-box">
              This cannot be undone. Deleting this subject also permanently removes:
            </p>
            <ul className="impact">
              <li><b>{n('questions')}</b> questions from the bank</li>
              <li><b>{n('papers')}</b> generated papers (and their contents)</li>
              <li><b>{n('cycles')}</b> exam cycles</li>
              <li><b>{n('allotments')}</b> teacher allotments</li>
              <li><b>{n('formats')}</b> subject-specific paper formats</li>
            </ul>
            <p className="subtitle">
              Shared formats (used by other subjects) are not touched. The deletion
              is recorded in the audit log with these counts.
            </p>

            <label>Type <b>{subject.code}</b> to confirm</label>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={subject.code}
            />

            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn-sm" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button
                type="button"
                className="submit compact danger-btn"
                disabled={!armed || busy}
                onClick={confirmDelete}
              >
                {busy ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
