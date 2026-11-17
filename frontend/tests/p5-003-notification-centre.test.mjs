// frontend/tests/p5-003-notification-centre.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const frontendRoot = resolve(import.meta.dirname, "..");
const modulePath = resolve(frontendRoot, "src", "lib", "notifications", "centre.mjs");
const componentPath = resolve(frontendRoot, "src", "components", "notifications", "NotificationCentre.tsx");

const load = async () => import(pathToFileURL(modulePath).href);

test("the centre lists the four church categories with Indonesian labels", async () => {
  const { categoryOptions } = await load();
  const options = categoryOptions();
  assert.deepEqual(options.map((option) => option.id), [
    "pengumuman",
    "ibadah",
    "pelajari-alkitab",
    "sekolah-sabat",
  ]);
  for (const option of options) {
    assert.ok(option.label.length > 0, `${option.id} needs a label`);
    assert.ok(option.description.length > 0, `${option.id} needs a description so the choice is informed`);
  }
  assert.match(options[0].label, /Pengumuman/i);
  assert.match(options[1].label, /Ibadah/i);
  assert.match(options[2].label, /Alkitab/i);
  assert.match(options[3].label, /Sekolah Sabat/i);
});

test("the centre says plainly that no account and no contact detail is needed", async () => {
  const { centreCopy } = await load();
  assert.match(centreCopy.noAccount, /tanpa akun|tidak perlu akun/i);
  assert.match(centreCopy.identity, /perangkat/i);
  assert.match(centreCopy.stopAllHint, /perangkat ini/i);
});

test("subscribing is blocked with a readable reason when push is unavailable", async () => {
  const { canSubscribe } = await load();

  const noSupport = canSubscribe({ hasPushManager: false, hasVapidKey: true });
  assert.equal(noSupport.ok, false);
  assert.match(noSupport.reason, /browser|peramban/i);

  const noKey = canSubscribe({ hasPushManager: true, hasVapidKey: false });
  assert.equal(noKey.ok, false);
  assert.match(noKey.reason, /belum tersedia|belum siap/i);

  assert.equal(canSubscribe({ hasPushManager: true, hasVapidKey: true }).ok, true);
});

test("the subscribe body carries the endpoint, keys and only the enabled categories", async () => {
  const { toSubscribeBody, categoryOptions } = await load();
  void categoryOptions;
  const body = toSubscribeBody(
    { endpoint: "https://push.example.invalid/x", keys: { p256dh: "k", auth: "a" } },
    { pengumuman: true, ibadah: false, "pelajari-alkitab": true, "sekolah-sabat": false },
  );
  assert.equal(body.endpoint, "https://push.example.invalid/x");
  assert.deepEqual(body.keys, { p256dh: "k", auth: "a" });
  assert.deepEqual(body.categories, ["pengumuman", "pelajari-alkitab"]);
});

test("the subscribe body refuses to be built with nothing ticked", async () => {
  const { toSubscribeBody } = await load();
  assert.throws(
    () => toSubscribeBody(
      { endpoint: "https://push.example.invalid/x", keys: { p256dh: "k", auth: "a" } },
      { pengumuman: false, ibadah: false, "pelajari-alkitab": false, "sekolah-sabat": false },
    ),
    /kategori/i,
    "an empty selection must be a stop-all, not a subscription",
  );
});

test("the stop body carries only the endpoint", async () => {
  const { toStopBody } = await load();
  assert.deepEqual(toStopBody("https://push.example.invalid/x"), { endpoint: "https://push.example.invalid/x" });
});

test("the summary describes the state without inventing a count", async () => {
  const { summaryText } = await load();
  assert.match(summaryText({ pengumuman: false, ibadah: false, "pelajari-alkitab": false, "sekolah-sabat": false }), /belum ada|tidak ada/i);
  assert.match(summaryText({ pengumuman: true, ibadah: false, "pelajari-alkitab": false, "sekolah-sabat": false }), /1 kategori/i);
  assert.match(
    summaryText({ pengumuman: true, ibadah: true, "pelajari-alkitab": true, "sekolah-sabat": true }),
    /4 kategori/i,
  );
});

test("the component is accessible, 44px and never pre-ticks a category", () => {
  const source = readFileSync(componentPath, "utf8");
  assert.match(source, /role="status"/, "state changes must be announced");
  assert.match(source, /role="alert"/, "errors must be announced");
  assert.match(source, /min-h-11/, "touch targets must reach 44px");
  assert.match(source, /aria-describedby/, "each category needs its explanation linked");
  assert.doesNotMatch(source, /defaultChecked|checked=\{true\}/, "no category may start ticked");
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
});

test("the component asks for no email, phone or name", () => {
  const source = readFileSync(componentPath, "utf8");
  assert.doesNotMatch(source, /type="email"/, "the centre must not collect an email address");
  assert.doesNotMatch(source, /type="tel"/, "the centre must not collect a phone number");
  assert.doesNotMatch(source, /name="nama"|name="name"/, "the centre must not collect a name");
});

test("the component reads the saved choice through an external store, not setState in an effect", () => {
  const source = readFileSync(componentPath, "utf8");
  // Reading localStorage in an effect and calling setState there is rejected by the lint
  // rules and renders twice; useSyncExternalStore is the supported shape.
  assert.match(source, /useSyncExternalStore/, "the saved choice must come from an external store");
  assert.doesNotMatch(
    source,
    /useEffect\(\(\)\s*=>\s*\{[^}]*setPrefs\(/s,
    "an effect must not seed preference state",
  );
  const store = readFileSync(resolve(frontendRoot, "src", "lib", "notifications", "store.mjs"), "utf8");
  assert.match(store, /getServerSnapshot/, "the store needs a stable server snapshot for hydration");
});
