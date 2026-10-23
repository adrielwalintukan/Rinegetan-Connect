import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { PageShell } from "@/components/layout/PageShell";
import { PublicClientRuntime } from "@/components/runtime/PublicClientRuntime";

export default function PublicLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <MotionConfig reducedMotion="user">
      <PageShell>
        <PublicClientRuntime />
        {children}
      </PageShell>
    </MotionConfig>
  );
}
