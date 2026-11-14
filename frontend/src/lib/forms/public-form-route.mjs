// frontend/src/lib/forms/public-form-route.mjs
import { publicErrorMessage } from "../api/errors.mjs";
import { PublicFormError, clientIp, hashFormIp, readFormBody, verifyTurnstile } from "./public-form.mjs";

const unavailable = () => Response.json({ error: "Formulir sementara tidak tersedia." }, { status: 503 });

/** Shared POST handler for public pastoral forms (same flow as /api/minat-belajar).
 * @param {Request} request
 * @param {{ table: string, submit: (input: unknown, deps: any) => Promise<{ status: number, body: object }>, createAdmin: () => any }} options */
export async function postPublicForm(request, { table, submit, createAdmin }) {
  let input;
  try { input = await readFormBody(request); }
  catch (error) {
    if (error instanceof PublicFormError) return Response.json({ error: publicErrorMessage(error) }, { status: error.status });
    throw error;
  }
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return unavailable();
  let admin;
  try { admin = createAdmin(); } catch { return unavailable(); }
  const result = await submit(input, {
    ipHash: hashFormIp(clientIp(request), key),
    turnstileSecret: process.env.TURNSTILE_SECRET_KEY,
    verifyTurnstile: (/** @type {string} */ token, /** @type {string} */ secret) => verifyTurnstile(token, secret),
    checkRate: async (/** @type {string} */ form, /** @type {string} */ ipHash, /** @type {number} */ limit) => {
      const { data, error } = await admin.rpc("check_form_rate", { p_form: form, p_ip_hash: ipHash, p_limit: limit, p_window: "1 hour" });
      if (error) throw error;
      return data === true;
    },
    insertRow: async (/** @type {object} */ row) => {
      const { error } = await admin.from(table).insert(row);
      if (error) throw error;
    },
  });
  return Response.json(result.body, { status: result.status });
}
