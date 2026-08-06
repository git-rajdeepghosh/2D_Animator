import { Suspense } from "react";
import type { Metadata } from "next";
import { GeneratorView } from "@/components/generator/GeneratorView";

export const metadata: Metadata = {
  title: "Generator — 2DAnimator",
};

export default function GeneratorPage() {
  return (
    <Suspense fallback={null}>
      <GeneratorView />
    </Suspense>
  );
}
