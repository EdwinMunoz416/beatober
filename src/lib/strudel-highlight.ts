/** Lightweight Strudel / mini-notation highlighter for the practice overlay. */

const FN_HINTS = new Set([
  "note",
  "n",
  "s",
  "sound",
  "stack",
  "cat",
  "seq",
  "pure",
  "silence",
  "slow",
  "fast",
  "hurry",
  "early",
  "late",
  "rev",
  "ply",
  "euclid",
  "struct",
  "mask",
  "gain",
  "pan",
  "room",
  "size",
  "speed",
  "begin",
  "end",
  "cut",
  "cutoff",
  "lpf",
  "hpf",
  "bpf",
  "vowel",
  "chop",
  "striate",
  "jux",
  "off",
  "add",
  "sub",
  "mul",
  "div",
  "setcps",
  "cps",
  "scale",
  "transpose",
  "chord",
  "pianoMidi",
  "vizGlobal",
  "initHydra",
  "clearHydra",
  "H",
  "osc",
  "all",
  "color",
  "colour",
]);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function span(cls: string, text: string): string {
  return `<span class="${cls}">${escapeHtml(text)}</span>`;
}

/** Highlight mini-notation insides of a string (already excludes quotes). */
function highlightMini(body: string): string {
  let out = "";
  let i = 0;
  while (i < body.length) {
    const ch = body[i];

    if (/\s/.test(ch)) {
      out += escapeHtml(ch);
      i += 1;
      continue;
    }

    if ("<>[](){},~*!@^?|_./:".includes(ch)) {
      out += span("tok-mini-op", ch);
      i += 1;
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === "-" && /[0-9]/.test(body[i + 1] ?? ""))) {
      let j = i + 1;
      while (j < body.length && /[0-9.]/.test(body[j]!)) j += 1;
      out += span("tok-mini-num", body.slice(i, j));
      i = j;
      continue;
    }

    if (/[A-Za-z#]/.test(ch)) {
      let j = i + 1;
      while (j < body.length && /[A-Za-z0-9#_]/.test(body[j]!)) j += 1;
      const word = body.slice(i, j);
      // Note-ish tokens (c3, bb4, fs2) vs sample names (bd, sd, hh)
      const isPitch = /^[a-gA-G][#b]?[0-9]?$/.test(word);
      out += span(isPitch ? "tok-mini-note" : "tok-mini-sample", word);
      i = j;
      continue;
    }

    out += escapeHtml(ch);
    i += 1;
  }
  return out;
}

/**
 * Returns safe HTML for a highlighted mirror of `code`.
 * Empty string → empty (caller may show placeholder separately).
 */
export function highlightStrudel(code: string): string {
  if (!code) return "";

  let out = "";
  let i = 0;

  while (i < code.length) {
    // line comment
    if (code[i] === "/" && code[i + 1] === "/") {
      let j = i + 2;
      while (j < code.length && code[j] !== "\n") j += 1;
      out += span("tok-comment", code.slice(i, j));
      i = j;
      continue;
    }

    // string → mini-notation body
    if (code[i] === '"' || code[i] === "'") {
      const q = code[i]!;
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === "\\") {
          j += 2;
          continue;
        }
        if (code[j] === q) break;
        if (code[j] === "\n") break;
        j += 1;
      }
      const closed = code[j] === q;
      const inner = code.slice(i + 1, j);
      out += span("tok-string-q", q);
      out += `<span class="tok-string">${highlightMini(inner)}</span>`;
      if (closed) {
        out += span("tok-string-q", q);
        j += 1;
      }
      i = j;
      continue;
    }

    // channel `$:` (optionally with name before)
    if (code[i] === "$") {
      let j = i + 1;
      while (j < code.length && /[A-Za-z0-9_]/.test(code[j]!)) j += 1;
      if (code[j] === ":") {
        out += span("tok-channel", code.slice(i, j + 1));
        i = j + 1;
        continue;
      }
    }

    // whitespace
    if (/\s/.test(code[i]!)) {
      out += escapeHtml(code[i]!);
      i += 1;
      continue;
    }

    // number
    if (
      /[0-9]/.test(code[i]!) ||
      (code[i] === "." && /[0-9]/.test(code[i + 1] ?? ""))
    ) {
      let j = i + 1;
      while (j < code.length && /[0-9.]/.test(code[j]!)) j += 1;
      out += span("tok-number", code.slice(i, j));
      i = j;
      continue;
    }

    // identifier / method
    if (/[A-Za-z_]/.test(code[i]!)) {
      let j = i + 1;
      while (j < code.length && /[A-Za-z0-9_]/.test(code[j]!)) j += 1;
      const word = code.slice(i, j);
      const nextNonWs = code.slice(j).match(/^\s*/)?.[0].length ?? 0;
      const after = code[j + nextNonWs];
      const isCall = after === "(";
      if (FN_HINTS.has(word) || isCall) {
        out += span("tok-fn", word);
      } else {
        out += span("tok-ident", word);
      }
      i = j;
      continue;
    }

    // punctuation / operators
    if ("()[]{}.,;=<>!|&+-*/?:".includes(code[i]!)) {
      out += span("tok-punct", code[i]!);
      i += 1;
      continue;
    }

    out += escapeHtml(code[i]!);
    i += 1;
  }

  // trailing newline keeps last empty line height in sync with textarea
  if (code.endsWith("\n")) out += "\n";
  return out;
}
