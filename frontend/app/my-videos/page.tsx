import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteNav } from "@/components/landing/SiteNav";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { AuthGate, AuthGateSkeleton } from "@/components/auth/AuthGate";
import { MyVideos } from "@/components/library/MyVideos";

export const metadata: Metadata = {
  title: "My videos — 2DAnimator",
  robots: { index: false, follow: false },
};

/** The reader's own generated videos. The public catalogue is `/library`. */
export default function MyVideosPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteNav theme="light" />

      <main className="flex-1">
        <Suspense fallback={<AuthGateSkeleton />}>
          <AuthGate>
            <MyVideos />
          </AuthGate>
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}
