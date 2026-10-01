"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { trackEvent } from "@/lib/analytics";
import { highlightStrudel } from "@/lib/strudel-highlight";

type StrudelApi = {
  initStrudel: (options?: Record<string, unknown>) => Promise<unknown> | unknown;
  evaluate: (code: string, autoplay?: boolean) => Promise<unknown>;
  hush: () => void;
};

type Props = {
  day: number;
  initialCode: string;
  readOnly: boolean;
  authorMode: boolean;
  onCodeChange?: (code: string) => void;
};

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return String(err);
}

export function StrudelRepl({
  day,
  initialCode,
  readOnly,
  authorMode,
  onCodeChange,
}: Props) {
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const apiRef = useRef<StrudelApi | null>(null);
  const bootPromiseRef = useRef<Promise<StrudelApi> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    setCode(initialCode);
    setPlaying(false);
    setError(null);
    void apiRef.current?.hush();
  }, [day, initialCode]);

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const hl = highlightRef.current;
    if (!ta || !hl) return;
    hl.scrollTop = ta.scrollTop;
    hl.scrollLeft = ta.scrollLeft;
  }, []);

  const ensureApi = useCallback(async (): Promise<StrudelApi> => {
    if (apiRef.current) return apiRef.current;
    if (!bootPromiseRef.current) {
      bootPromiseRef.current = (async () => {
        const { initStrudel, evaluate, hush } = await import("@strudel/web");
        await initStrudel();
        const api = { initStrudel, evaluate, hush };
        apiRef.current = api;
        return api;
      })();
    }
    return bootPromiseRef.current;
  }, []);

  const runEvaluate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const api = await ensureApi();
      await api.evaluate(code, true);
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
  }, [code, ensureApi]);

  const runHush = useCallback(() => {
    apiRef.current?.hush();
    if (playing) trackEvent("strudel_stop", { day });
    setPlaying(false);
  }, [day, playing]);

  const persistPattern = useCallback(async () => {
    if (!authorMode) return;
    setSaveHint(null);
    try {
      const res = await fetch(`/api/day/${day}/pattern`, {
        method: "POST",
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
  }, [authorMode, code, day]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "Enter") {
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

  const highlightHtml = code
    ? highlightStrudel(code)
    : `<span class="tok-placeholder">// strudel pattern</span>`;

  return (
    <section className="repl" aria-label={`Strudel pattern day ${day}`}>
      <div className="repl-toolbar">
        <span className="repl-label">
          day {String(day).padStart(2, "0")}
          {readOnly && !authorMode ? " · listen" : ""}
        </span>
        <div className="repl-actions">
          {saveHint ? <span className="repl-hint">{saveHint}</span> : null}
          <button
            type="button"
            className="repl-btn repl-btn--primary"
            disabled={busy}
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
          readOnly={readOnly}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          onChange={(e) => {
            const next = e.target.value;
            setCode(next);
            onCodeChange?.(next);
          }}
          onScroll={syncScroll}
          onKeyDown={onKeyDown}
        />
      </div>
      {error ? <p className="repl-error">{error}</p> : null}
      {!readOnly || authorMode ? (
        <p className="repl-keys">
          ⌘/Ctrl+Enter play · ⌘/Ctrl+. stop
          {authorMode ? " · ⌘/Ctrl+S save" : ""}
        </p>
      ) : null}
    </section>
  );
}
