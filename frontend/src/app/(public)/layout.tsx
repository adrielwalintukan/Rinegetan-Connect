import type { ReactNode } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { PublicClientRuntime } from "@/components/runtime/PublicClientRuntime";
import { ServiceWorkerUpdate } from "@/components/runtime/ServiceWorkerUpdate";
import { StoredCopyNotice } from "@/components/runtime/StoredCopyNotice";

export default function PublicLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <PageShell>
      <PublicClientRuntime />
      {children}
      {/* Registered here, not in the root layout: the staff area must never receive a service worker. */}
      <ServiceWorkerUpdate />
      <StoredCopyNotice />
    </PageShell>
  );
}
