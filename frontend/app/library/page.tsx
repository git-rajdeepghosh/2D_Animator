import type { Metadata } from "next";
import { SiteNav } from "@/components/landing/SiteNav";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { LibraryBrowser } from "@/components/library/LibraryBrowser";

export const metadata: Metadata = {
  title: "Library — 2DAnimator",
  description:
    "Browse every generated explainer, grouped by collection: maths, physics, computer science and graphs.",
};

export default function LibraryPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {/* Light pill on the off-white page. */}
      <SiteNav theme="light" />

      <main className="flex-1">
        <LibraryBrowser />
      </main>

      <SiteFooter />
    </div>
  );
}
