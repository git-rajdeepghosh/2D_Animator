export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-100/80 bg-ink-50/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-900">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-400" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink-900">
            2DAnimator
          </span>
        </a>

        <nav className="hidden items-center gap-8 text-sm text-ink-700 sm:flex">
          <a href="#how-it-works" className="transition hover:text-ink-900">
            How it works
          </a>
          <a href="#examples" className="transition hover:text-ink-900">
            Examples
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="/editor"
            className="hidden text-sm text-ink-700 transition hover:text-ink-900 sm:block"
          >
            Sign in
          </a>
          <a
            href="#prompt"
            className="rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-700"
          >
            Get started
          </a>
        </div>
      </div>
    </header>
  );
}
