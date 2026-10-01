"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
};

type State = {
  error: Error | null;
};

export class StrudelErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[studiodaze-beatober] Strudel UI error", error, info);
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      return (
        <section className="repl repl--fault" aria-label="Strudel unavailable">
          <p className="repl-error repl-error--boundary" role="alert">
            <strong>{this.props.fallbackTitle ?? "Editor crashed"}</strong>
            <span className="repl-error-msg">{error.message}</span>
          </p>
          <button type="button" className="repl-btn" onClick={this.reset}>
            Reload editor
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
