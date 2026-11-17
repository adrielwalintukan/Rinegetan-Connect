// Generate a VAPID key pair with Node's built-in crypto only (no new dependency).
//
// The public key is base64url of the uncompressed P-256 point (0x04 || X || Y), which is
// what PushManager.subscribe expects as applicationServerKey. The private key is the raw
// 32-byte scalar, base64url. This is the same shape `web-push` produces.
//
// Usage: node scripts/generate-vapid-keys.mjs <output-file>
// The keys are written to the file and never to stdout, because a private key printed to a
// terminal or a CI log has to be treated as leaked and rotated.
import { generateKeyPairSync } from "node:crypto";
import { chmodSync, writeFileSync } from "node:fs";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/generate-vapid-keys.mjs <output-file>");
  process.exit(1);
}

const b64url = (buffer) =>
  Buffer.from(buffer).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });

const publicJwk = publicKey.export({ format: "jwk" });
const privateJwk = privateKey.export({ format: "jwk" });

const rawPublic = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(publicJwk.x, "base64url"),
  Buffer.from(publicJwk.y, "base64url"),
]);

const rawPrivate = Buffer.from(privateJwk.d, "base64url");

if (rawPublic.length !== 65) throw new Error(`unexpected public key length ${rawPublic.length}`);
if (rawPrivate.length !== 32) throw new Error(`unexpected private key length ${rawPrivate.length}`);

const body = [
  "# VAPID key pair for Web Push (P5-003 / P5-004).",
  "# Generated locally; do not commit this file.",
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${b64url(rawPublic)}`,
  `VAPID_PRIVATE_KEY=${b64url(rawPrivate)}`,
  // Left blank on purpose: the subject must be a contact URI the church actually owns, and
  // the church's email is not verified yet. Inventing one would put a wrong contact address
  // in the VAPID header that push services see.
  "VAPID_SUBJECT=",
  "",
].join("\n");

writeFileSync(target, body, { encoding: "utf8", mode: 0o600 });
try {
  chmodSync(target, 0o600);
} catch {
  // Windows ignores POSIX modes; the file still lives outside the repository.
}

console.log(`Wrote a VAPID key pair to ${target} (public key length ${b64url(rawPublic).length}).`);
