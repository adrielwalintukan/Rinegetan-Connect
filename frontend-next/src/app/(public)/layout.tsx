import type { ReactNode } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { PublicClientRuntime } from "@/components/runtime/PublicClientRuntime";

export default function PublicLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <PageShell>
      <PublicClientRuntime />
      {children}
    </PageShell>
  );
}
