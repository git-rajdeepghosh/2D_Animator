/**
 * Section 4 — footer. Four plain columns, then the wordmark set large enough
 * to run the full width and clip at the baseline, echoing the reference.
 */

const QUICK_LINKS = [
  { label: "Home", href: "#top" },
  { label: "Categories", href: "#categories" },
  { label: "Showcase", href: "#showcase" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const SOCIAL = ["Twitter", "GitHub", "YouTube", "Discord"];

export function SiteFooter() {
  return (
    <footer id="contact" className="bg-ink pt-24 sm:pt-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4">
          <div>
            <p className="tag mb-5 text-paper/40">Sitemap</p>
            <ul className="space-y-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-paper/70 transition-colors hover:text-paper"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="tag mb-5 text-paper/40">Social</p>
            <ul className="space-y-2">
              {SOCIAL.map((name) => (
                <li key={name}>
                  <a
                    href="#"
                    className="text-sm text-paper/70 transition-colors hover:text-paper"
                  >
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div id="about">
            <p className="tag mb-5 text-paper/40">Contact</p>
            <p className="text-sm leading-relaxed text-paper/70">
              hello@placeholder.dev
              <br />
              Placeholder Street 00
              <br />
              City, Country
            </p>
          </div>

          <div>
            <p className="tag mb-5 text-paper/40">Explore</p>
            <a
              href="#showcase"
              className="text-sm text-highlight/70 transition-colors hover:text-highlight"
            >
              Browse examples
            </a>
            <p className="mt-5 max-w-[22ch] text-sm leading-relaxed text-paper/50">
              Placeholder line about what the product does, kept short.
            </p>
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-2 border-t border-paper/10 pt-6 text-[11px] text-paper/35 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 2DAnimator — placeholder legal and credit text.</p>
          <p>Built on Manim · Placeholder terms · Placeholder privacy</p>
        </div>
      </div>

      {/* Wordmark. Clipped at the baseline so it reads as a mark, not a line
          of copy. */}
      <div className="mt-14 overflow-hidden px-4">
        <p
          aria-hidden="true"
          className="-mb-[0.18em] whitespace-nowrap text-center font-display leading-[0.8] text-paper"
          style={{ fontSize: "clamp(3.4rem, 15.5vw, 15rem)" }}
        >
          2DAnimator
        </p>
      </div>
    </footer>
  );
}
