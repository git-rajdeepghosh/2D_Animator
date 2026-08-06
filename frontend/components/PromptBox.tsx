"use client";

import { useRef, useState } from "react";

const MAX_LENGTH = 400;

const EXAMPLES = [
  "How does binary search work?",
  "Why is the sky blue?",
  "What is compound interest?",
  "How do neural networks learn?",
];

type Status = "idle" | "submitting" | "queued";

export function PromptBox() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = prompt.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= MAX_LENGTH;

  function fillExample(example: string) {
    setPrompt(example);
    textareaRef.current?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || status === "submitting") return;

    setStatus("submitting");
    // Pipeline (codegen -> sandbox render -> voiceover) isn't wired up yet —
    // this simulates the hand-off so the flow can be reviewed end to end.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setStatus("queued");
  }

  return (
    <div id="prompt" className="mx-auto w-full max-w-2xl scroll-mt-24">
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-ink-100 bg-white p-2 shadow-card"
      >
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="Explain how binary search works…"
          rows={3}
          className="w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-[15px] leading-relaxed text-ink-900 placeholder:text-ink-500 focus:outline-none"
        />

        <div className="flex items-center justify-between gap-3 border-t border-ink-100 px-4 py-3">
          <span className="text-xs text-ink-500">
            {trimmed.length}/{MAX_LENGTH}
          </span>

          <button
            type="submit"
            disabled={!canSubmit || status === "submitting"}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
          >
            {status === "submitting" ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
                  />
                </svg>
                Starting…
              </>
            ) : (
              <>
                Generate video
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>

      {status === "queued" && (
        <p className="mt-3 text-center text-sm text-ink-500">
          Job queued — generation pipeline isn't connected yet, so this is a
          preview of the flow.
        </p>
      )}

      <div id="examples" className="mt-5 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => fillExample(example)}
            className="rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs text-ink-700 transition hover:border-brand-400 hover:text-brand-600"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
