import { next } from "@vercel/edge";

export const config = { matcher: "/((?!_vercel).*)" };

// Paths reachable without a session. Add entries here to make a page public.
const PUBLIC_PATHS = new Set(["/login", "/login.html", "/api/login", "/api/logout"]);

const COOKIE = "ck_session";
const NO_STORE = "no-store, no-cache, must-revalidate";
const encoder = new TextEncoder();

async function expectedSignature(value, secret) {
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

export async function isValidSession(cookieValue, secret) {
  if (!cookieValue || !secret) return false;
  const split = cookieValue.lastIndexOf(".");
  if (split < 1) return false;
  const expiry = cookieValue.slice(0, split);
  const signature = cookieValue.slice(split + 1);
  if (!/^\d+$/.test(expiry) || Number(expiry) < Date.now()) return false;
  return sameString(signature, await expectedSignature(expiry, secret));
}

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (PUBLIC_PATHS.has(path)) return next();

  const secret = process.env.PORTAL_TOKEN;
  if (!secret) {
    // Fail closed: without a configured password nothing is protected, so serve nothing.
    return new Response("Site is not configured: PORTAL_TOKEN is unset.", {
      status: 503,
      headers: { "content-type": "text/plain", "cache-control": NO_STORE },
    });
  }

  const session = readCookie(request.headers.get("cookie"), COOKIE);
  if (await isValidSession(session, secret)) return next();

  if (path.startsWith("/api/")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json", "cache-control": NO_STORE },
    });
  }

  const login = new URL("/login", url);
  if (path !== "/") login.searchParams.set("next", path + url.search);

  // Built by hand rather than Response.redirect(), whose headers are immutable.
  // Without no-store the browser can cache this bounce and replay it after a
  // successful login, which looks exactly like the password being refused.
  const headers = { location: login.toString(), "cache-control": NO_STORE };

  // Drop a dead session so the browser stops sending it on every later request.
  if (session) headers["set-cookie"] = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

  return new Response(null, { status: 302, headers });
}
