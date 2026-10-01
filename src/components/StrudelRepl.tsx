"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { trackEvent } from "@/lib/analytics";
import { clearRemix, loadRemix, saveRemix } from "@/lib/remix-storage";
import { useStrudelSession } from "@/lib/strudel-session";
import { highlightStrudel } from "@/lib/strudel-highlight";

type Props = {
  day: number;
  publishedCode: string;
  comingSoon?: boolean;
  /** Author or admin — edit canonical pattern + server save */
  canPublish: boolean;
  /** Unlocked public visitor — local remix in sessionStorage */
  remixMode: boolean;
};

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return String(err);
}

function initialEditorCode(
  day: number,
  publishedCode: string,
  canPublish: boolean,
  remixMode: boolean,
): string {
  if (canPublish) return publishedCode;
  if (remixMode) return loadRemix(day) ?? publishedCode;
  return publishedCode;
}

export function StrudelRepl({
  day,
  publishedCode,
  comingSoon = false,
  canPublish,
  remixMode,
}: Props) {
  const { status, bootError, ensureApi, evaluate, hush } = useStrudelSession();
  const [code, setCode] = useState(() =>
    initialEditorCode(day, publishedCode, canPublish, remixMode),
  );
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLPreElement | null>(null);

  const readOnly = comingSoon && !canPublish;
  const editable = canPublish || remixMode;

  useEffect(() => {
    const next = initialEditorCode(day, publishedCode, canPublish, remixMode);
    setCode(next);
    setPlaying(false);
    setError(null);
    void hush();
  }, [day, publishedCode, canPublish, remixMode, hush]);

  useEffect(() => {
    if (!remixMode || canPublish) return;
    saveRemix(day, code);
  }, [code, day, remixMode, canPublish]);

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const hl = highlightRef.current;
    if (!ta || !hl) return;
    hl.scrollTop = ta.scrollTop;
    hl.scrollLeft = ta.scrollLeft;
  }, []);

  const runEvaluate = useCallback(async () => {
    if (comingSoon && !canPublish) return;
    setBusy(true);
    setError(null);
    try {
      await ensureApi();
      await evaluate(code);
      setPlaying(true);
      trackEvent("strudel_play", { day });
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg);
      setPlaying(false);
      trackEvent("strudel_error", { day, error: msg.slice(0, 120) });
    } finally {
      setBusy(false);
    }
  }, [canPublish, code, comingSoon, day, ensureApi, evaluate]);

  const runHush = useCallback(() => {
    void hush();
    if (playing) trackEvent("strudel_stop", { day });
    setPlaying(false);
  }, [day, hush, playing]);

  const persistPattern = useCallback(async () => {
    if (!canPublish) return;
    setSaveHint(null);
    try {
      const res = await fetch(`/api/day/${day}/pattern`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? res.statusText);
      }
      setSaveHint("Saved");
      window.setTimeout(() => setSaveHint(null), 2000);
    } catch (err) {
      setSaveHint(errorMessage(err));
    }
  }, [canPublish, code, day]);

  const resetRemix = useCallback(() => {
    clearRemix(day);
    setCode(publishedCode);
    setError(null);
    void hush();
    setPlaying(false);
  }, [day, hush, publishedCode]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void runEvaluate();
    }
    if (mod && e.shiftKey && e.key === "Enter") {
      e.preventDefault();
      void runEvaluate();
    }
    if (mod && e.key === ".") {
      e.preventDefault();
      runHush();
    }
    if (mod && e.key === "s") {
      e.preventDefault();
      void persistPattern();
    }
  };

  const remixDirty =
    remixMode && !canPublish && code.trim() !== publishedCode.trim();

  const highlightHtml = code
    ? highlightStrudel(code)
    : `<span class="tok-placeholder">// strudel pattern</span>`;

  const bootLabel =
    status === "loading"
      ? "Loading sounds…"
      : status === "error"
        ? (bootError ?? "Boot failed")
        : null;

  return (
    <section className="repl" aria-label={`Strudel pattern day ${day}`}>
      <div className="repl-toolbar">
        <span className="repl-label">
          day {String(day).padStart(2, "0")}
          {comingSoon && !canPublish
            ? " · coming soon"
            : canPublish
              ? " · author"
              : remixMode
                ? remixDirty
                  ? " · local remix"
                  : " · remix"
                : ""}
        </span>
        <div className="repl-actions">
          {bootLabel ? (
            <span className="repl-hint repl-hint--boot">{bootLabel}</span>
          ) : null}
          {saveHint ? <span className="repl-hint">{saveHint}</span> : null}
          {remixDirty ? (
            <button
              type="button"
              className="repl-btn"
              onClick={resetRemix}
            >
              Reset
            </button>
          ) : null}
          <button
            type="button"
            className="repl-btn repl-btn--primary"
            disabled={
              busy || status === "loading" || (comingSoon && !canPublish)
            }
            onClick={() => void runEvaluate()}
          >
            {busy ? "…" : "Play"}
          </button>
          <button
            type="button"
            className="repl-btn"
            disabled={!playing}
            onClick={runHush}
          >
            Stop
          </button>
        </div>
      </div>
      <div className="repl-editor">
        <pre
          ref={highlightRef}
          className="repl-highlight"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: highlightHtml }}
        />
        <textarea
          ref={textareaRef}
          className="repl-textarea"
          value={code}
          readOnly={readOnly || !editable}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          onChange={(e) => setCode(e.target.value)}
          onScroll={syncScroll}
          onKeyDown={onKeyDown}
        />
      </div>
      {error ? <p className="repl-error">{error}</p> : null}
      {editable ? (
        <p className="repl-keys">
          ⌘/Ctrl+Enter play · ⌘/Ctrl+Shift+Enter play · ⌘/Ctrl+. stop
          {canPublish ? " · ⌘/Ctrl+S save (login at /admin in production)" : ""}
          {remixMode && !canPublish
            ? " · edits stay in this browser only"
            : ""}
        </p>
      ) : null}
    </section>
  );
}
