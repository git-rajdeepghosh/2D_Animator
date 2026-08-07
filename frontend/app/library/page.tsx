import type { Metadata } from "next";
import { SiteNav } from "@/components/landing/SiteNav";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { LibraryBrowser } from "@/components/library/LibraryBrowser";

export const metadata: Metadata = {
  title: "Library — 2DAnimator",
  description:
    "Browse every explainer, grouped by collection: maths, physics, computer science and graphs.",
};

/** Public catalogue. A reader's own videos live at `/my-videos`. */
export default function LibraryPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteNav theme="light" />

      <main className="flex-1">
        <LibraryBrowser />
      </main>

      <SiteFooter />
    </div>
  );
}
