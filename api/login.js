const COOKIE = "ck_session";
const SESSION_DAYS = 30;
const encoder = new TextEncoder();

async function signature(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secret = process.env.PORTAL_TOKEN;
  if (!secret) return res.status(500).json({ error: "PORTAL_TOKEN is not configured" });

  const password = String((req.body ?? {}).password ?? "");
  if (!sameString(password, secret)) {
    // Slow down trivial brute forcing; the URL is public even though the site is not.
    await new Promise((r) => setTimeout(r, 500));
    return res.status(401).json({ error: "Wrong password." });
  }

  const expiry = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const value = `${expiry}.${await signature(String(expiry), secret)}`;

  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}`
  );
  return res.status(200).json({ ok: true });
}
