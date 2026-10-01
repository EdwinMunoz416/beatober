type Props = {
  playing: boolean;
  busy: boolean;
  playDisabled: boolean;
  stopDisabled: boolean;
  bootLabel: string | null;
  saveHint: string | null;
  onPlay: () => void;
  onStop: () => void;
};

function IconPlay() {
  return (
    <svg
      className="repl-transport__icon"
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path d="M9 7.5v9l7.5-4.5L9 7.5z" fill="currentColor" />
    </svg>
  );
}

function IconStop() {
  return (
    <svg
      className="repl-transport__icon"
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <rect x="7.5" y="7.5" width="9" height="9" rx="1" fill="currentColor" />
    </svg>
  );
}

export function ReplTransport({
  playing,
  busy,
  playDisabled,
  stopDisabled,
  bootLabel,
  saveHint,
  onPlay,
  onStop,
}: Props) {
  return (
    <nav
      className="repl-transport repl-transport--sticky"
      aria-label="Pattern playback"
    >
      {saveHint ? (
        <p className="repl-transport__meta">
          <span className="repl-transport__hint repl-transport__hint--save">
            {saveHint}
          </span>
        </p>
      ) : null}
      <div className="repl-transport__bar">
        {playing ? (
          <span
            className="repl-transport__status repl-transport__live"
            aria-live="polite"
          >
            <span className="repl-transport__pulse" aria-hidden />
            live
          </span>
        ) : bootLabel ? (
          <span
            className="repl-transport__status repl-transport__hint repl-transport__hint--boot"
            aria-live="polite"
          >
            {bootLabel}
          </span>
        ) : null}
        <div className="repl-transport__controls">
          <button
            type="button"
            className={`repl-transport__btn repl-transport__btn--play${playing ? " repl-transport__btn--active" : ""}`}
            disabled={playDisabled}
            aria-label={busy ? "Loading pattern" : "Play pattern"}
            onClick={onPlay}
          >
            {busy ? (
              <span className="repl-transport__spinner" aria-hidden />
            ) : (
              <IconPlay />
            )}
          </button>
          <span className="repl-transport__divider" aria-hidden />
          <button
            type="button"
            className="repl-transport__btn repl-transport__btn--stop"
            disabled={stopDisabled}
            aria-label="Stop pattern"
            onClick={onStop}
          >
            <IconStop />
          </button>
        </div>
      </div>
    </nav>
  );
}
