import { Hero } from "@/components/landing/Hero";
import { CategoryCards } from "@/components/landing/CategoryCards";
import { Showcase } from "@/components/landing/Showcase";
import { SiteFooter } from "@/components/landing/SiteFooter";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <main className="flex-1">
        <Hero />
        <CategoryCards />
        <Showcase />
      </main>
      <SiteFooter />
    </div>
  );
}
