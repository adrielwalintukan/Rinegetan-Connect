"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { MotionGlobalConfig } from "framer-motion";
import { Toaster } from "sonner";

// Runs at module load, before any motion component mounts: with reduced motion every framer-motion
// animation (opacity fades and delays included) jumps straight to its final state.
// shortcut: read once per page load, so toggling the OS setting applies after a reload.
if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  MotionGlobalConfig.skipAnimations = true;
}

export function PublicClientRuntime() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    let frame = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return <Toaster position="top-center" richColors />;
}
