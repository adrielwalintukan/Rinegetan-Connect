"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
};
const turnstile = () => (window as Window & { turnstile?: Turnstile }).turnstile;

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
export const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// One explicit widget per form; render runs on mount and again when the script reports ready.
export function useTurnstile() {
  const [token, setToken] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const render = useCallback(() => {
    const api = turnstile();
    if (!TURNSTILE_SITE_KEY || !ref.current || !api || widgetId.current !== undefined) return;
    widgetId.current = api.render(ref.current, {
      // The 320px contact cards have 230px inside; flexible has a 300px minimum.
      sitekey: TURNSTILE_SITE_KEY, language: "id", size: "compact", callback: setToken, "expired-callback": () => setToken(""), "error-callback": () => setToken(""),
    });
  }, []);
  useEffect(render, [render]);
  const reset = useCallback(() => { setToken(""); turnstile()?.reset(widgetId.current); }, []);
  return { token, ref, render, reset };
}
