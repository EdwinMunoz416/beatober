"use client";

import type { EditorView } from "@codemirror/view";
import { useEffect, useRef } from "react";

type Props = {
  /** Remount when day / reset / published seed changes */
  instanceKey: string;
  initialCode: string;
  readOnly: boolean;
  onCodeChange: (code: string) => void;
  onEvaluate: () => void;
  onStop: () => void;
};

export function StrudelCodeEditor({
  instanceKey,
  initialCode,
  readOnly,
  onCodeChange,
  onEvaluate,
  onStop,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onCodeChangeRef = useRef(onCodeChange);
  const onEvaluateRef = useRef(onEvaluate);
  const onStopRef = useRef(onStop);

  onCodeChangeRef.current = onCodeChange;
  onEvaluateRef.current = onEvaluate;
  onStopRef.current = onStop;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let view: EditorView | null = null;

    void (async () => {
      const cm = await import("@strudel/codemirror");
      const { EditorState, StateEffect } = await import("@codemirror/state");

      if (cancelled || !hostRef.current) return;

      cm.codemirrorSettings.set({
        ...cm.defaultSettings,
        theme: "blackscreen",
        isLineWrappingEnabled: true,
        isLineNumbersDisplayed: true,
        isAutoCompletionEnabled: true,
        isPatternHighlightingEnabled: true,
        isFlashEnabled: true,
        fontSize: 13,
        fontFamily: "var(--mono, ui-monospace, monospace)",
      });

      view = cm.initEditor({
        root: hostRef.current,
        initialCode,
        onChange: (update) => {
          if (update.docChanged) {
            onCodeChangeRef.current(update.state.doc.toString());
          }
        },
        onEvaluate: () => onEvaluateRef.current(),
        onStop: () => onStopRef.current(),
      });

      if (readOnly) {
        view.dispatch({
          effects: StateEffect.appendConfig.of(EditorState.readOnly.of(true)),
        });
      }

      viewRef.current = view;
    })();

    return () => {
      cancelled = true;
      view?.destroy();
      viewRef.current = null;
    };
  }, [instanceKey, readOnly, initialCode]);

  return (
    <div
      ref={hostRef}
      className="repl-cm-host"
      aria-label="Strudel pattern editor"
    />
  );
}
