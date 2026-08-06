const steps = [
  {
    label: "01",
    title: "Describe",
    body: "Type the concept you want explained, in plain language. No scripts, no timelines.",
    icon: (
      <path
        d="M4 5h16M4 10h16M4 15h10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    label: "02",
    title: "Generate",
    body: "We write the narration, animate it with Manim, and record a voiceover — all in one pass.",
    icon: (
      <path
        d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.5-6.5-2.1 2.1M8.6 15.4l-2.1 2.1m11-2.1-2.1-2.1M8.6 8.6 6.5 6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    label: "03",
    title: "Refine",
    body: "Scrub the timeline, re-prompt a single scene, or tweak the wording — without redoing the whole video.",
    icon: (
      <path
        d="M4 12a8 8 0 1 1 3 6.2M4 12v5m0-5h5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

export function PipelineSteps() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-14 max-w-xl">
        <p className="text-sm font-medium text-brand-500">How it works</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">
          From idea to video in three steps
        </h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.label}
            className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-5 w-5"
              >
                {step.icon}
              </svg>
            </div>
            <p className="mt-4 text-xs font-medium tracking-wide text-ink-500">
              {step.label}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-ink-900">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
