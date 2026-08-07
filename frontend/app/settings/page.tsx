import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteNav } from "@/components/landing/SiteNav";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { AuthGate, AuthGateSkeleton } from "@/components/auth/AuthGate";
import { SettingsView } from "@/components/auth/SettingsView";

export const metadata: Metadata = {
  title: "Settings — 2DAnimator",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteNav theme="light" />

      <main className="flex-1">
        <Suspense fallback={<AuthGateSkeleton />}>
          <AuthGate>
            <SettingsView />
          </AuthGate>
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}
