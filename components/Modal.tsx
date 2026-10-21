"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, Loader2, AlertTriangle } from "lucide-react";

// In-app dialogs. Replaces window.prompt/confirm, which can't be styled, can't
// hold more than one field, and are blocked outright by some mobile browsers —
// the ones most teachers use.

/* ===== Android Back handling ===== */

// In the installed app there is no browser chrome, so Back is the only "close"
// gesture a teacher has. Without a history entry of its own, an open sheet
// ignores Back and the press leaves /builder instead — taking every edit since
// the last autosave with it. Each overlay parks one entry while it is open.
interface Overlay {
  close: () => void;
}

const overlays: Overlay[] = [];
// Pops we caused ourselves by calling history.back() when a sheet was dismissed
// by tapping. Without this count, unwinding the top sheet would also close the
// one underneath it.
let selfPops = 0;
let listening = false;

function onPopState() {
  if (selfPops > 0) {
    selfPops -= 1;
    return;
  }
  overlays.pop()?.close();
}

export function useModalHistory(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    if (!listening) {
      window.addEventListener("popstate", onPopState);
      listening = true;
    }

    const entry: Overlay = { close: () => closeRef.current() };
    overlays.push(entry);
    // Keep the router's own state object — Next.js reads it back on popstate,
    // and replacing it wholesale breaks ordinary Back navigation.
    window.history.pushState({ ...window.history.state, pgOverlay: true }, "");

    return () => {
      const i = overlays.indexOf(entry);
      if (i === -1) return; // Back already popped it, and the entry with it.
      overlays.splice(i, 1);
      // Dismissed by a tap: drop the entry we added so Back doesn't have to be
      // pressed twice to leave the builder. Skipped if the app navigated away
      // in the meantime, since the entry is no longer ours to pop.
      if (!window.history.state?.pgOverlay) return;
      selfPops += 1;
      window.history.back();
    };
  }, [open]);
}

interface ShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  tone?: "default" | "danger";
}

export function Modal({ title, subtitle, onClose, children, footer, tone = "default" }: ShellProps) {
  // Mounted only while open, so the dialog itself is the "open" flag.
  useModalHistory(true, onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    // Lock the page behind the dialog. Without this, a swipe that starts on the
    // backdrop scrolls the page underneath on mobile, so the teacher loses their
    // place in a long question list every time they open a dialog.
    const { overflow, paddingRight } = document.body.style;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gutter > 0) document.body.style.paddingRight = `${gutter}px`;

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-ink/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90dvh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-rule">
          <div className="flex items-start gap-2.5">
            {tone === "danger" && (
              <AlertTriangle size={18} className="text-red-600 mt-0.5 shrink-0" />
            )}
            <div>
              <h2 className="font-display text-lg font-semibold text-ink leading-tight">
                {title}
              </h2>
              {subtitle && <p className="text-xs text-graphite mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -m-1.5 text-graphite hover:text-ink rounded-lg shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        <div className="px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-rule flex items-center justify-end gap-2">
          {footer}
        </div>
      </div>
    </div>
  );
}

export interface PromptField {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
}

// A small form in a dialog — the multi-field replacement for chained prompt()s.
export function PromptModal({
  title,
  subtitle,
  fields,
  submitLabel = "Save",
  onCancel,
  onSubmit,
}: {
  title: string;
  subtitle?: string;
  fields: PromptField[];
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (values: Record<string, string>) => Promise<void> | void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, ""]))
  );
  const [busy, setBusy] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  const complete = fields.every((f) => !f.required || values[f.name]?.trim());

  async function submit() {
    if (!complete || busy) return;
    setBusy(true);
    try {
      await onSubmit(values);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onCancel}
      footer={
        <>
          <button
            onClick={onCancel}
            className="px-4 py-3 lg:py-2 min-h-[44px] lg:min-h-0 text-sm text-graphite hover:text-ink rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!complete || busy}
            className="inline-flex items-center justify-center gap-2 bg-pen text-white px-5 py-3 lg:py-2 min-h-[44px] lg:min-h-0 rounded-lg font-semibold text-sm hover:bg-ink transition-colors disabled:opacity-50"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {submitLabel}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {fields.map((f, i) => (
          <label key={f.name} className="block">
            <span className="text-xs font-medium text-graphite">
              {f.label}
              {!f.required && <span className="font-normal"> (optional)</span>}
            </span>
            <input
              ref={i === 0 ? firstRef : undefined}
              value={values[f.name] ?? ""}
              placeholder={f.placeholder}
              onChange={(e) =>
                setValues((v) => ({ ...v, [f.name]: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              className="w-full mt-1 px-3 py-2 text-sm border border-rule rounded-lg focus:ring-2 focus:ring-pen/20 focus:border-pen outline-none"
            />
          </label>
        ))}
      </div>
    </Modal>
  );
}

export function ConfirmModal({
  title,
  body,
  confirmLabel = "Delete",
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={title}
      tone="danger"
      onClose={onCancel}
      footer={
        <>
          <button
            onClick={onCancel}
            className="px-4 py-3 lg:py-2 min-h-[44px] lg:min-h-0 text-sm text-graphite hover:text-ink rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 bg-red-600 text-white px-5 py-3 lg:py-2 min-h-[44px] lg:min-h-0 rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-graphite leading-relaxed">{body}</p>
    </Modal>
  );
}
