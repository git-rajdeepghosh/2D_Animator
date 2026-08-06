import Link from "next/link";

/**
 * The pill navbar, shared by the landing page and `/library`.
 *
 * Every href is absolute rather than a bare hash, so the same nav works from
 * any route — `#showcase` would go nowhere from `/library`.
 */

export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Library", href: "/library" },
  { label: "Showcase", href: "/#showcase" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

export function SiteNav({
  /** The hero holds the nav back until its intro has played. */
  revealed = true,
  theme = "dark",
}: {
  revealed?: boolean;
  theme?: "dark" | "light";
}) {
  return (
    <>
      <header
        className={`fixed inset-x-0 top-5 z-40 flex justify-center px-4 transition-all duration-700 ${
          revealed
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        <nav
          className={`flex items-center gap-0.5 rounded-full px-1.5 py-1.5 sm:gap-1 sm:px-2 ${
            theme === "dark" ? "bg-paper" : "bg-ink"
          }`}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`nav-link px-2.5 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm ${
                theme === "dark"
                  ? ""
                  : "text-paper/70 hover:bg-paper hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <Link
        href="/"
        className={`fixed left-6 top-8 z-40 hidden font-display text-xl font-semibold transition-opacity duration-700 lg:block ${
          theme === "dark" ? "text-paper" : "text-ink"
        } ${revealed ? "opacity-100" : "opacity-0"}`}
      >
        2DAnimator
      </Link>
    </>
  );
}
