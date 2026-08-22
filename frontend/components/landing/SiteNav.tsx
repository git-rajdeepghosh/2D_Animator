import Link from "next/link";
import { ProfileMenu } from "@/components/auth/ProfileMenu";

/**
 * The pill navbar, shared by the landing page and the signed-in routes, plus
 * the auth control.
 *
 * Every href is absolute rather than a bare hash, so the same nav works from
 * any route — `#showcase` would go nowhere from `/library`.
 *
 * Layout differs by width on purpose. From `sm` up the pill is optically
 * centred on the viewport and the auth control is pinned to the right edge.
 * Below that there isn't room for both, so the two sit in a plain row and the
 * secondary links drop out; hiding the auth control instead would leave phones
 * with no way to sign in at all.
 */

export const NAV_LINKS = [
  { label: "Home", href: "/", compact: true },
  { label: "Library", href: "/library", compact: true },
  { label: "Showcase", href: "/#showcase", compact: true },
  { label: "About", href: "/#about", compact: false },
  { label: "Contact", href: "/#contact", compact: false },
];

export function SiteNav({
  /** The hero holds the nav back until its intro has played. */
  revealed = true,
  theme = "dark",
}: {
  revealed?: boolean;
  theme?: "dark" | "light";
}) {
  const dark = theme === "dark";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-5 z-[60] flex items-center justify-between gap-2 px-4 transition-all duration-700 sm:justify-center ${
          revealed
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        <nav
          className={`flex items-center gap-0.5 rounded-full px-1.5 py-1.5 sm:gap-1 sm:px-2 ${
            dark ? "bg-paper" : "bg-ink"
          }`}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`nav-link px-2.5 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm ${
                link.compact ? "" : "hidden sm:block"
              } ${dark ? "" : "text-paper hover:bg-paper hover:text-ink"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="shrink-0 sm:absolute sm:right-4 sm:top-0">
          <ProfileMenu theme={theme} />
        </div>
      </header>

      <Link
        href="/"
        className={`fixed left-6 top-8 z-[60] hidden font-display text-xl font-semibold transition-opacity duration-700 lg:block ${
          dark ? "text-paper" : "text-ink"
        } ${revealed ? "opacity-100" : "opacity-0"}`}
      >
        2DAnimator
      </Link>
    </>
  );
}
