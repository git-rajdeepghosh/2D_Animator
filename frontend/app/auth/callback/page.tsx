import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCallbackView } from "@/components/auth/AuthCallbackView";

export const metadata: Metadata = {
  title: "Signing you in — 2DAnimator",
  robots: { index: false, follow: false },
};

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackView />
    </Suspense>
  );
}
