// frontend/tests/p5-003-vapid-keys.test.mjs
// The VAPID key pair must be a real P-256 pair in the exact shape PushManager expects.
// A wrong shape is not caught until a jemaat presses "Simpan" in a browser, which is far
// too late, so the generator is tested here.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const frontendRoot = resolve(import.meta.dirname, "..");
const script = join(frontendRoot, "scripts", "generate-vapid-keys.mjs");

const b64urlToBuffer = (value) => Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function generate() {
  const dir = mkdtempSync(join(tmpdir(), "vapid-"));
  const file = join(dir, "keys.env");
  try {
    const stdout = execFileSync(process.execPath, [script, file], { encoding: "utf8" });
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    const read = (name) => {
      const line = lines.find((entry) => entry.startsWith(`${name}=`));
      assert.ok(line, `${name} must be written`);
      return line.slice(name.length + 1);
    };
    return {
      stdout,
      publicKey: read("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
      privateKey: read("VAPID_PRIVATE_KEY"),
      subject: read("VAPID_SUBJECT"),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const keys = generate();

test("the public key is an uncompressed P-256 point, which is what PushManager wants", () => {
  const raw = b64urlToBuffer(keys.publicKey);
  assert.equal(raw.length, 65, "an uncompressed P-256 point is 65 bytes");
  assert.equal(raw[0], 0x04, "the point must start with the uncompressed marker");
  assert.equal(keys.publicKey.length, 87, "base64url of 65 bytes is 87 characters");
});

test("the private key is a 32-byte scalar", () => {
  assert.equal(b64urlToBuffer(keys.privateKey).length, 32);
  assert.equal(keys.privateKey.length, 43, "base64url of 32 bytes is 43 characters");
});

test("the public and private keys are a matching pair", () => {
  const raw = b64urlToBuffer(keys.publicKey);
  const publicKey = createPublicKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: raw.subarray(1, 33).toString("base64url"),
      y: raw.subarray(33, 65).toString("base64url"),
    },
    format: "jwk",
  });
  const privateKey = createPrivateKey({
    key: { kty: "EC", crv: "P-256", d: keys.privateKey, x: raw.subarray(1, 33).toString("base64url"), y: raw.subarray(33, 65).toString("base64url") },
    format: "jwk",
  });

  const message = Buffer.from("rinegetan");
  const signature = sign("sha256", message, privateKey);
  assert.equal(verify("sha256", message, publicKey, signature), true, "the pair must actually sign and verify");
});

test("the private key is never printed to stdout", () => {
  assert.ok(!keys.stdout.includes(keys.privateKey), "a key printed to a log has to be rotated");
  assert.match(keys.stdout, /VAPID key pair/);
});

test("two runs produce different keys, so a key is never reused from a template", () => {
  const second = generate();
  assert.notEqual(second.privateKey, keys.privateKey);
  assert.notEqual(second.publicKey, keys.publicKey);
});

test("the subject line is left blank for the owner to fill", () => {
  assert.equal(keys.subject, "", "the contact address is the owner's decision, not the generator's");
});

test("the script refuses to run without a target file", () => {
  assert.throws(
    () => execFileSync(process.execPath, [script], { encoding: "utf8", stdio: "pipe" }),
    /Usage:/,
    "writing keys to stdout by default would leak them into logs",
  );
});
