import { Hero } from "@/components/landing/Hero";
import { LibraryPreview } from "@/components/landing/LibraryPreview";
import { Showcase } from "@/components/landing/Showcase";
import { SiteFooter } from "@/components/landing/SiteFooter";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <main className="flex-1">
        <Hero />
        <LibraryPreview />
        <Showcase />
      </main>
      <SiteFooter />
    </div>
  );
}
