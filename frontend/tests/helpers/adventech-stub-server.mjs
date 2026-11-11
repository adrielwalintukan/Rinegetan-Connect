// Starts the real Next server with the Adventech upstream stubbed in-process, so the reader page
// renders and hydrates without any network access. Product code is untouched; only the test process
// swaps globalThis.fetch before Next boots.
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const frontend = resolve(import.meta.dirname, "../..");
const next = resolve(frontend, "node_modules/next/dist/bin/next");
const stub = resolve(import.meta.dirname, "adventech-stub.cjs");
// Passing --require as an argv entry avoids NODE_OPTIONS quoting, which breaks on paths with spaces.
const preload = ["--require", stub];
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };

// CI builds once before the browser suites; build here only when no bundle exists yet.
if (!existsSync(resolve(frontend, ".next/BUILD_ID"))) {
  const built = spawnSync(process.execPath, [...preload, next, "build"], { cwd: frontend, env, stdio: "inherit" });
  if (built.status !== 0) process.exit(built.status ?? 1);
}

const child = spawn(process.execPath, [...preload, next, "start", "--hostname", "127.0.0.1", "--port", "3412"], {
  cwd: frontend, env, stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", code => process.exit(code ?? 1));
