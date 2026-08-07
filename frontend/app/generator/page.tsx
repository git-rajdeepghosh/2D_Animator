import { Suspense } from "react";
import type { Metadata } from "next";
import { GeneratorView } from "@/components/generator/GeneratorView";
import { AuthGate, AuthGateSkeleton } from "@/components/auth/AuthGate";

export const metadata: Metadata = {
  title: "Generator — 2DAnimator",
};

export default function GeneratorPage() {
  return (
    <Suspense fallback={<AuthGateSkeleton />}>
      <AuthGate>
        <GeneratorView />
      </AuthGate>
    </Suspense>
  );
}
