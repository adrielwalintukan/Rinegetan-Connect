import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";

// P5-001: the service worker names its cache after the build, so a release can never serve a
// shell from an older build. Deriving it from the commit means nobody has to remember to bump a
// constant; a manual bump is exactly the kind of step that gets skipped on the release that needs it.
function buildId() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    // A tarball or a CI checkout without git still needs a stable id for this build.
    return `t${Date.now().toString(36)}`;
  }
}

const build = buildId();

const nextConfig: NextConfig = {
  agentRules: false,
  reactStrictMode: true,
  // One id for the Next build, the client registration and the cache name, so a release can
  // never update one of the three and leave the others pointing at the previous shell.
  generateBuildId: () => build,
  env: { NEXT_PUBLIC_BUILD_ID: build },
  async headers() {
    return [
      {
        // A cached worker script would pin visitors to an old shell, so it is never cached.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
