"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { PaperLanguage } from "@/lib/types";
import { itcOf } from "@/lib/languages";

// ===== Devanagari phonetic input =====
//
// Teachers who can't type Hindi/Marathi type in Roman letters and get
// Devanagari as they go: press SPACE after a word and the word before the caret
// is transliterated (namaskar -> नमस्कार). A small popover offers alternates.
//
// TranslitInput / TranslitTextarea are drop-in replacements for <input> /
// <textarea> — same value / onChange / className / placeholder props. They only
// activate when the surrounding TranslitProvider says the paper language is
// Hindi or Marathi AND the teacher hasn't turned auto-convert off; otherwise
// they behave like a plain field.

type Ctx = { lang: PaperLanguage; enabled: boolean };
const TranslitCtx = createContext<Ctx>({ lang: "english", enabled: false });

export function TranslitProvider({
  lang,
  enabled,
  children,
}: Ctx & { children: React.ReactNode }) {
  return (
    <TranslitCtx.Provider value={{ lang, enabled }}>
      {children}
    </TranslitCtx.Provider>
  );
}

export function useTranslitContext() {
  return useContext(TranslitCtx);
}

// Word-level suggestion cache — the same word never hits the network twice.
const cache = new Map<string, string[]>();
// One request per word in flight: on a 4G school link the same word can be
// finished twice before the first answer lands.
const inflight = new Map<string, Promise<string[]>>();

const keyOf = (word: string, lang: PaperLanguage) => lang + ":" + word.toLowerCase();

function cached(word: string, lang: PaperLanguage): string[] | undefined {
  return cache.get(keyOf(word, lang));
}

async function transliterate(word: string, lang: PaperLanguage): Promise<string[]> {
  if (itcOf(lang) == null) return [];
  const key = keyOf(word, lang);
  const hit = cache.get(key);
  if (hit) return hit;
  const pending = inflight.get(key);
  if (pending) return pending;
  const req = (async () => {
    try {
      const res = await fetch("/api/translit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: word, lang }),
      });
      const data = await res.json();
      const s: string[] = Array.isArray(data?.suggestions) ? data.suggestions : [];
      // A dropped round trip must not be remembered as "this word has no
      // Devanagari" — that would block the word for the rest of the session.
      if (data?.ok !== false) cache.set(key, s);
      return s;
    } catch {
      return [];
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, req);
  return req;
}

// Split the word immediately before the caret into leading punctuation, the
// Roman "core" to convert, and trailing punctuation — so "(namaskar," converts
// the core and keeps the brackets/commas around it.
function analyze(val: string, caret: number) {
  let start = caret;
  while (start > 0 && !/\s/.test(val[start - 1])) start--;
  const raw = val.slice(start, caret);
  const pre = (raw.match(/^[^A-Za-z]*/) || [""])[0];
  const post = (raw.match(/[^A-Za-z]*$/) || [""])[0];
  const core = raw.slice(pre.length, raw.length - post.length);
  // Convert only if there are Roman letters and the word isn't already in a
  // non-Latin script (Devanagari, Bengali, Tamil, Arabic/Urdu, etc.).
  const romanizable =
    core.length > 0 && /[A-Za-z]/.test(core) && !/[؀-￿]/.test(raw);
  return { start, pre, post, core, romanizable };
}

// Edits that add text the teacher meant to type. Anything else (backspace,
// undo, paste, drag) must not trigger a conversion. Android WebViews that
// report no inputType at all fall through to the separator check instead.
const TYPED_IN = new Set([
  "insertText",
  "insertCompositionText",
  "insertFromComposition",
  "insertReplacementText",
  "insertLineBreak",
  "insertParagraph",
]);

type Anchor = { top: number; bottom: number; left: number };

function anchorOf(el: HTMLElement): Anchor {
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left };
}

const POPOVER_W = 320;

// A field in the lower half of the screen has the on-screen keyboard under it,
// so the alternates open upwards there. Anchoring the flipped case by `bottom`
// means we never have to measure the popover before placing it.
function placement(a: Anchor) {
  const vv = window.visualViewport;
  const vh = vv ? vv.height : window.innerHeight;
  const vw = document.documentElement.clientWidth;
  const width = Math.min(POPOVER_W, vw - 16);
  const left = Math.max(8, Math.min(a.left, vw - width - 8));
  return a.bottom > vh * 0.55
    ? { left, width, bottom: window.innerHeight - a.top + 2 }
    : { left, width, top: a.bottom + 2 };
}

type FieldProps = {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
  multiline?: boolean;
  /** Grow the textarea to fit its content instead of scrolling inside a fixed
   *  box. Lets a question hold a manual line break without looking like a
   *  form field that has run out of room. */
  autoGrow?: boolean;
};

type Field = HTMLInputElement | HTMLTextAreaElement;
type Sugg = { items: string[]; start: number; len: number; anchor: Anchor };

function TranslitField({
  value,
  onChange,
  className,
  placeholder,
  rows,
  multiline,
  autoGrow,
}: FieldProps) {
  const { lang, enabled } = useTranslitContext();
  const active = enabled && itcOf(lang) != null;

  const elRef = useRef<Field | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const caretRef = useRef<number | null>(null);
  const composingRef = useRef(false);
  const inputTypeRef = useRef<string | null>(null);
  const deferredRef = useRef<(() => void)[]>([]);
  const [sugg, setSugg] = useState<Sugg | null>(null);
  const popOpen = sugg !== null;

  // Restore the caret after a programmatic value change (only while focused, so
  // a blur-time conversion never yanks focus back).
  useLayoutEffect(() => {
    if (
      caretRef.current != null &&
      elRef.current &&
      document.activeElement === elRef.current
    ) {
      const p = caretRef.current;
      try {
        elRef.current.setSelectionRange(p, p);
      } catch {
        /* noop */
      }
    }
    caretRef.current = null;
  });

  // Outside interaction closes the popover; a moving viewport only moves it.
  // The app sets interactiveWidget: "resizes-content", so opening the keyboard
  // fires resize — closing there would dismiss the alternates the teacher just
  // asked for, at the exact moment she asked for them.
  useEffect(() => {
    if (!popOpen) return;
    const onDown = (ev: PointerEvent) => {
      if (popRef.current && !popRef.current.contains(ev.target as Node)) setSugg(null);
    };
    const reposition = () => {
      const el = elRef.current;
      if (!el) return;
      const a = anchorOf(el);
      const vh = window.visualViewport?.height ?? window.innerHeight;
      if (a.bottom < 0 || a.top > vh) {
        setSugg(null); // field scrolled out of sight — nothing left to point at
        return;
      }
      setSugg((s) =>
        s &&
        (s.anchor.top !== a.top ||
          s.anchor.bottom !== a.bottom ||
          s.anchor.left !== a.left)
          ? { ...s, anchor: a }
          : s
      );
    };
    const vv = window.visualViewport;
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    vv?.addEventListener("resize", reposition);
    vv?.addEventListener("scroll", reposition);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      vv?.removeEventListener("resize", reposition);
      vv?.removeEventListener("scroll", reposition);
    };
  }, [popOpen]);

  // Put the converted word back where the Roman one still sits in the LIVE
  // field: the teacher kept typing while the request was out, so any snapshot
  // taken when we sent it is already stale.
  const splice = useCallback(
    (el: Field, start: number, raw: string, replacement: string) => {
      const run = (): boolean => {
        // Rewriting the field while the IME holds a composing word makes Gboard
        // re-insert that word against the new text, so a late answer waits.
        if (composingRef.current) {
          deferredRef.current.push(() => {
            run();
          });
          return false;
        }
        const val = el.value;
        // The field may have been deleted, or edited ahead of the word, while
        // the answer was in flight — in either case leave the Roman text alone.
        if (!el.isConnected) return false;
        if (val.slice(start, start + raw.length) !== raw) return false;
        const nv = val.slice(0, start) + replacement + val.slice(start + raw.length);
        const caret = el.selectionStart ?? val.length;
        const delta = replacement.length - raw.length;
        const next = caret >= start + raw.length ? caret + delta : caret;
        // Write through to the element, not just to React: two answers can land
        // in the same tick and the second must see the first, which React's
        // state has not delivered to the DOM yet.
        el.value = nv;
        caretRef.current = next;
        if (document.activeElement === el) {
          try {
            el.setSelectionRange(next, next);
          } catch {
            /* noop */
          }
        }
        onChange({ target: { value: nv } });
        return true;
      };
      return run();
    },
    [onChange]
  );

  const commit = useCallback(
    (el: Field, end: number, showPop: boolean) => {
      const a = analyze(el.value, end);
      if (!a.romanizable) return;
      const start = a.start;
      const raw = el.value.slice(start, end);
      const done = (items: string[]) => {
        const best = items[0];
        if (!best) return;
        if (!splice(el, start, raw, a.pre + best + a.post)) return;
        if (showPop && items.length > 1 && document.activeElement === el) {
          setSugg({
            items,
            start: start + a.pre.length,
            len: best.length,
            anchor: anchorOf(el),
          });
        }
      };
      const hit = cached(a.core, lang);
      if (hit) {
        done(hit); // seen this word before: convert in the same frame
        return;
      }
      void transliterate(a.core, lang).then(done);
    },
    [lang, splice]
  );

  // A separator sitting in the text is the signal that the word before it is
  // finished. Reading that out of the value — instead of intercepting the space
  // key — is the whole fix: Gboard reports keystrokes as keyCode 229 /
  // "Unidentified", and preventDefault on keydown does not stop it inserting.
  const commitBehindCaret = useCallback(
    (el: Field) => {
      const caret = el.selectionStart ?? el.value.length;
      if (caret !== (el.selectionEnd ?? caret)) return; // active selection
      if (caret <= 0 || !/[ \t\n]/.test(el.value[caret - 1])) return;
      commit(el, caret - 1, true);
    },
    [commit]
  );

  const handleNativeChange = useCallback(
    (e: React.ChangeEvent<Field>) => {
      const el = e.currentTarget;
      onChange({ target: { value: el.value } });
      if (!active) return;
      setSugg(null);
      const it = inputTypeRef.current;
      inputTypeRef.current = null;
      if (composingRef.current) return; // mid-word: wait for compositionend
      if (it != null && !TYPED_IN.has(it)) return;
      commitBehindCaret(el);
    },
    [active, onChange, commitBehindCaret]
  );

  // React's synthetic onBeforeInput is a legacy polyfill and carries no
  // inputType, so the one event that tells us what kind of edit this is has to
  // be read natively.
  useEffect(() => {
    const el = elRef.current;
    if (!el || !active) return;
    const onBefore = (ev: Event) => {
      inputTypeRef.current = (ev as InputEvent).inputType ?? null;
    };
    el.addEventListener("beforeinput", onBefore);
    return () => el.removeEventListener("beforeinput", onBefore);
  }, [active]);

  const onCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);

  const onCompositionEnd = useCallback(
    (e: React.CompositionEvent<Field>) => {
      composingRef.current = false;
      const el = e.currentTarget;
      // The IME wrote straight into the DOM; make sure React's value agrees
      // before anything reads it back.
      onChange({ target: { value: el.value } });
      const held = deferredRef.current;
      deferredRef.current = [];
      held.forEach((f) => f());
      commitBehindCaret(el);
    },
    [onChange, commitBehindCaret]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<Field>) => {
      if (e.key === "Escape") {
        if (sugg) {
          e.preventDefault();
          setSugg(null);
        }
        return;
      }
      // Enter in a single-line field changes nothing, so no input event ever
      // arrives to say the word is done.
      if (e.key === "Enter" && !multiline) {
        const el = e.currentTarget;
        commit(el, el.selectionStart ?? el.value.length, true);
      }
    },
    [sugg, multiline, commit]
  );

  const onBlur = useCallback(
    (e: React.FocusEvent<Field>) => {
      const el = e.currentTarget;
      commit(el, el.selectionStart ?? el.value.length, false);
    },
    [commit]
  );

  const pick = useCallback(
    (s: string) => {
      const el = elRef.current;
      if (!el || !sugg) return;
      const val = el.value;
      const nv = val.slice(0, sugg.start) + s + val.slice(sugg.start + sugg.len);
      caretRef.current = sugg.start + s.length;
      onChange({ target: { value: nv } });
      setSugg((sg) => (sg ? { ...sg, len: s.length } : null));
      el.focus();
    },
    [sugg, onChange]
  );

  // Grow to fit the text. Re-runs on every value change, including the ones
  // transliteration writes after the network answers, so the box never lags
  // behind what is inside it.
  useEffect(() => {
    if (!multiline || !autoGrow) return;
    const el = elRef.current as HTMLTextAreaElement | null;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, multiline, autoGrow]);

  const setRef = (el: Field | null) => {
    elRef.current = el;
  };

  const popover =
    active && sugg && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={popRef}
            style={{
              position: "fixed",
              zIndex: 9999,
              ...placement(sugg.anchor),
            }}
            className="flex flex-wrap gap-1 bg-white border border-rule rounded-lg shadow-lg p-1"
          >
            {sugg.items.slice(0, 6).map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => pick(s)}
                className="min-h-[44px] px-3 inline-flex items-center justify-center text-base rounded hover:bg-ink/10 active:bg-ink/10 text-ink"
              >
                {s}
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {multiline ? (
        <textarea
          ref={setRef}
          value={value}
          onChange={handleNativeChange}
          onCompositionStart={active ? onCompositionStart : undefined}
          onCompositionEnd={active ? onCompositionEnd : undefined}
          onKeyDown={active ? onKeyDown : undefined}
          onBlur={active ? onBlur : undefined}
          rows={rows}
          placeholder={placeholder}
          className={`min-w-0 ${className ?? ""}`}
          style={autoGrow ? { overflow: "hidden", resize: "none" } : undefined}
        />
      ) : (
        <input
          ref={setRef}
          type="text"
          value={value}
          onChange={handleNativeChange}
          onCompositionStart={active ? onCompositionStart : undefined}
          onCompositionEnd={active ? onCompositionEnd : undefined}
          onKeyDown={active ? onKeyDown : undefined}
          onBlur={active ? onBlur : undefined}
          placeholder={placeholder}
          className={`min-w-0 ${className ?? ""}`}
        />
      )}
      {popover}
    </>
  );
}

export function TranslitInput(props: Omit<FieldProps, "multiline">) {
  return <TranslitField {...props} multiline={false} />;
}

export function TranslitTextarea(props: Omit<FieldProps, "multiline">) {
  return <TranslitField {...props} multiline={true} />;
}
