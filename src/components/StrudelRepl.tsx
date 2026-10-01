"use client";

import { useCallback, useEffect, useState } from "react";
import { ReplTransport } from "@/components/ReplTransport";
import { StrudelCodeEditor } from "@/components/StrudelCodeEditor";
import { trackEvent } from "@/lib/analytics";
import {
  getStrudelRuntimeError,
  strudelErrorKindLabel,
} from "@/lib/strudel-runtime-errors";
import { ensureStrudelAudioReady } from "@/lib/strudel-audio";
import { useStrudelSession } from "@/lib/strudel-session";

type Props = {
  day: number;
  publishedCode: string;
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
  } = useStrudelSession();
  const [code, setCode] = useState(publishedCode);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [editorInstance, setEditorInstance] = useState(0);

  const readOnly = !canPublish;

  const notifyPlayback = useCallback(
    (next: boolean) => {
      onPlaybackChange?.(next, day);
    },
    [day, onPlaybackChange],
  );

  useEffect(() => {
    setCode(publishedCode);
    setEditorInstance((v) => v + 1);
    setPlaying(false);
    notifyPlayback(false);
    clearRuntimeError();
    void hush();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hush on day/publish change only
  }, [day, publishedCode, canPublish]);

  const runEvaluate = useCallback(async () => {
    if (comingSoon && !canPublish) return;
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
  ]);

  const runHush = useCallback(() => {
    void hush();
    if (playing) trackEvent("strudel_stop", { day });
    setPlaying(false);
    notifyPlayback(false);
  }, [day, hush, notifyPlayback, playing]);

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

  const bootLabel =
    status === "loading"
      ? "Loading sounds…"
      : status === "error"
        ? (bootError ?? "Boot failed")
        : null;

  return (
    <section className="repl repl--codemirror" aria-label={`Strudel pattern day ${day}`}>
      <ReplTransport
        playing={playing}
        busy={busy}
        playDisabled={
          busy || status === "loading" || (comingSoon && !canPublish)
        }
        stopDisabled={!playing}
        bootLabel={bootLabel}
        saveHint={saveHint}
        onPlay={() => void runEvaluate()}
        onStop={runHush}
      />
      <div className="repl-editor repl-editor--cm">
        <StrudelCodeEditor
          instanceKey={`${day}-${editorInstance}`}
          initialCode={publishedCode}
          readOnly={readOnly}
          onCodeChange={setCode}
          onEvaluate={() => void runEvaluate()}
          onStop={runHush}
        />
      </div>
      {bootError && status === "error" ? (
        <p className="repl-error" role="alert">
          <strong>{strudelErrorKindLabel("boot")}</strong>
          <span className="repl-error-msg">{bootError}</span>
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
