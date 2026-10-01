"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ReplTransport } from "@/components/ReplTransport";
import { StrudelCodeEditor } from "@/components/StrudelCodeEditor";
import { trackEvent } from "@/lib/analytics";
import {
  getStrudelRuntimeError,
  strudelErrorKindLabel,
} from "@/lib/strudel-runtime-errors";
import { ensureStrudelAudioReady } from "@/lib/strudel-audio";
import { registerStrudelPlaybackStop } from "@/lib/strudel-playback-control";
import { useStrudelSession } from "@/lib/strudel-session";

type Props = {
  day: number;
  publishedCode: string;
  patternLoading?: boolean;
  patternError?: string | null;
  onRetryPattern?: () => void;
  comingSoon?: boolean;
  /** Author or admin — edit canonical pattern + server save */
  canPublish: boolean;
  onPlaybackChange?: (playing: boolean, day: number) => void;
};

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return String(err);
}

export function StrudelRepl({
  day,
  publishedCode,
  patternLoading = false,
  patternError = null,
  onRetryPattern,
  comingSoon = false,
  canPublish,
  onPlaybackChange,
}: Props) {
  const {
    status,
    bootError,
    runtimeError,
    clearRuntimeError,
    ensureApi,
    evaluate,
    hush,
    hushSync,
    retryBoot,
  } = useStrudelSession();
  const [code, setCode] = useState(publishedCode);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [editorInstance, setEditorInstance] = useState(0);
  const playingRef = useRef(false);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const [prevPublished, setPrevPublished] = useState({
    publishedCode,
    canPublish,
  });
  if (
    publishedCode !== prevPublished.publishedCode ||
    canPublish !== prevPublished.canPublish
  ) {
    setPrevPublished({ publishedCode, canPublish });
    setCode(publishedCode);
    setEditorInstance((v) => v + 1);
  }

  const readOnly = !canPublish;

  const notifyPlayback = useCallback(
    (next: boolean) => {
      onPlaybackChange?.(next, day);
    },
    [day, onPlaybackChange],
  );

  const stopPlayback = useCallback(
    (opts?: { trackStop?: boolean }) => {
      const wasPlaying = playingRef.current;
      setPlaying(false);
      setBusy(false);
      notifyPlayback(false);
      clearRuntimeError();
      hushSync();
      void hush();
      if (opts?.trackStop && wasPlaying) {
        trackEvent("strudel_stop", { day });
      }
    },
    [clearRuntimeError, day, hush, hushSync, notifyPlayback],
  );

  useEffect(() => {
    return registerStrudelPlaybackStop(() => {
      stopPlayback({ trackStop: true });
    });
  }, [stopPlayback]);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  const runEvaluate = useCallback(async () => {
    if (comingSoon && !canPublish) return;
    if (patternLoading || patternError) return;
    setBusy(true);
    clearRuntimeError();
    try {
      await ensureStrudelAudioReady();
      await ensureApi();
      const result = await evaluate(code);
      if (!result.ok) {
        setPlaying(false);
        notifyPlayback(false);
        const msg =
          getStrudelRuntimeError()?.message ?? "Pattern could not be evaluated";
        trackEvent("strudel_error", { day, error: msg.slice(0, 120) });
        return;
      }
      setPlaying(true);
      notifyPlayback(true);
      trackEvent("strudel_play", { day });
    } catch (err) {
      setPlaying(false);
      notifyPlayback(false);
      trackEvent("strudel_error", {
        day,
        error: errorMessage(err).slice(0, 120),
      });
    } finally {
      setBusy(false);
    }
  }, [
    canPublish,
    clearRuntimeError,
    code,
    comingSoon,
    day,
    ensureApi,
    evaluate,
    notifyPlayback,
    patternError,
    patternLoading,
  ]);

  const runHush = useCallback(() => {
    stopPlayback({ trackStop: true });
  }, [stopPlayback]);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "s") {
        e.preventDefault();
        void persistPattern();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [persistPattern]);

  const bootLabel = patternLoading
    ? "Loading pattern…"
    : status === "loading"
      ? "Loading sounds…"
      : status === "error"
        ? (bootError ?? "Boot failed")
        : null;

  return (
    <section className="repl repl--codemirror" aria-label={`Strudel pattern day ${day}`}>
      <div className="repl-editor repl-editor--cm">
        <StrudelCodeEditor
          instanceKey={`${day}-${editorInstance}`}
          initialCode={publishedCode}
          readOnly={readOnly}
          onCodeChange={setCode}
          onEvaluate={() => void runEvaluate()}
          onStop={runHush}
        />
        <ReplTransport
          playing={playing}
          busy={busy}
          playDisabled={
            busy ||
            patternLoading ||
            Boolean(patternError) ||
            status === "loading" ||
            (comingSoon && !canPublish)
          }
          stopDisabled={!playing}
          bootLabel={bootLabel}
          saveHint={saveHint}
          onPlay={() => void runEvaluate()}
          onStop={runHush}
        />
      </div>
      {patternError ? (
        <p className="repl-error" role="alert">
          <strong>Pattern</strong>
          <span className="repl-error-msg">{patternError}</span>
          {onRetryPattern ? (
            <button type="button" className="repl-btn" onClick={onRetryPattern}>
              Retry load
            </button>
          ) : null}
        </p>
      ) : null}
      {bootError && status === "error" ? (
        <p className="repl-error" role="alert">
          <strong>{strudelErrorKindLabel("boot")}</strong>
          <span className="repl-error-msg">{bootError}</span>
          <button type="button" className="repl-btn" onClick={retryBoot}>
            Retry engine
          </button>
        </p>
      ) : null}
      {runtimeError ? (
        <div className="repl-error repl-error--runtime" role="alert">
          <div className="repl-error-head">
            <strong>{strudelErrorKindLabel(runtimeError.kind)}</strong>
            <button
              type="button"
              className="repl-error-dismiss"
              onClick={clearRuntimeError}
            >
              Dismiss
            </button>
          </div>
          <pre className="repl-error-msg">{runtimeError.message}</pre>
        </div>
      ) : null}
    </section>
  );
}
