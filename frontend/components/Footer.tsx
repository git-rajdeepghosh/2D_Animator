export function Footer() {
  return (
    <footer className="border-t border-ink-100">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-ink-500 sm:flex-row">
        <p>© {new Date().getFullYear()} 2DAnimator</p>
        <p>
          Built on{" "}
          <a
            href="https://www.manim.community/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-ink-700 underline decoration-ink-200 underline-offset-4 transition hover:text-ink-900"
          >
            Manim
          </a>
        </p>
      </div>
    </footer>
  );
}
