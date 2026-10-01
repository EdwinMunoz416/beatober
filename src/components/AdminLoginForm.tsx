"use client";

type Props = {
  password: string;
  error: string | null;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

export function AdminLoginForm({
  password,
  error,
  onPasswordChange,
  onSubmit,
}: Props) {
  return (
    <div className="ctrl-login">
      <p className="ctrl-note">Use your BEATOBER_AUTHOR_SECRET.</p>
      <input
        type="password"
        className="ctrl-input"
        placeholder="password"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
      />
      <button type="button" className="ctrl-btn" onClick={onSubmit}>
        Enter
      </button>
      {error ? <p className="ctrl-error">{error}</p> : null}
    </div>
  );
}
