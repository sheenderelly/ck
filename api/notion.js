import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const DATABASES = {
  clients: "2d90e47d803381ebaefef4d989844848",
  invoices: "2d90e47d8033806cb6daf117fbdf92de",
  invoice_lines: "2d90e47d8033801a9cb9c07e9bb6d3a3",
  products: "2dd0e47d80338091af0bc193f4a7c43c",
  pricebook: "2dd0e47d8033805c8d45ed35337b34d6",
  payments: "2ef0e47d803380479270ee1b1d807815",
};

function readText(rich) {
  return (rich ?? []).map((t) => t.plain_text).join("");
}

// Flattens a Notion property into something a table cell can show.
function plainValue(prop) {
  if (!prop) return "";
  switch (prop.type) {
    case "title":
      return readText(prop.title);
    case "rich_text":
      return readText(prop.rich_text);
    case "number":
      return prop.number ?? "";
    case "select":
      return prop.select?.name ?? "";
    case "status":
      return prop.status?.name ?? "";
    case "multi_select":
      return (prop.multi_select ?? []).map((s) => s.name).join(", ");
    case "date":
      return prop.date?.end
        ? `${prop.date.start} → ${prop.date.end}`
        : prop.date?.start ?? "";
    case "checkbox":
      return prop.checkbox ? "Yes" : "No";
    case "url":
      return prop.url ?? "";
    case "email":
      return prop.email ?? "";
    case "phone_number":
      return prop.phone_number ?? "";
    case "people":
      return (prop.people ?? []).map((p) => p.name ?? "").join(", ");
    case "files":
      return (prop.files ?? []).map((f) => f.name).join(", ");
    case "relation":
      return prop.relation?.length ? `${prop.relation.length} linked` : "";
    case "unique_id":
      return prop.unique_id
        ? [prop.unique_id.prefix, prop.unique_id.number].filter(Boolean).join("-")
        : "";
    case "created_time":
      return prop.created_time ?? "";
    case "last_edited_time":
      return prop.last_edited_time ?? "";
    case "formula":
      return plainValue({ ...prop.formula, type: prop.formula?.type });
    case "rollup":
      if (prop.rollup?.type === "array") {
        return (prop.rollup.array ?? []).map(plainValue).join(", ");
      }
      return plainValue({ ...prop.rollup, type: prop.rollup?.type });
    default:
      return "";
  }
}

// Only these properties may be written, so a stolen token cannot rewrite arbitrary fields.
const WRITABLE = {
  pricebook: { "PHP override": "number", "x rate": "select", "is final": "checkbox" },
};

const UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

const encoder = new TextEncoder();

function sameString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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

// The edge middleware already gates /api/*; this is the second lock on the same door.
async function authorized(req, secret) {
  if (!secret) return false;

  const header = req.headers["x-portal-token"];
  if (header && sameString(String(header), secret)) return true;

  const cookie = readCookie(req.headers.cookie, "ck_session");
  if (!cookie) return false;
  const split = cookie.lastIndexOf(".");
  if (split < 1) return false;
  const expiry = cookie.slice(0, split);
  if (!/^\d+$/.test(expiry) || Number(expiry) < Date.now()) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(expiry));
  const expected = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return sameString(cookie.slice(split + 1), expected);
}

function writePayload(type, value) {
  if (value === null || value === "") {
    return type === "checkbox" ? { checkbox: false } : { [type]: null };
  }
  switch (type) {
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n)) throw new Error("Value must be a number");
      return { number: n };
    }
    case "select":
      return { select: { name: String(value) } };
    case "checkbox":
      return { checkbox: Boolean(value) };
    default:
      throw new Error(`Unsupported property type ${type}`);
  }
}

async function handleUpdate(req, res) {
  const { db, pageId, property, value } = req.body ?? {};

  const writable = WRITABLE[db];
  if (!writable) {
    return res.status(400).json({
      error: `Not writable: ${db ?? "no database given"}. Writable: ${Object.keys(WRITABLE).join(", ")}`,
    });
  }

  const type = writable[property];
  if (!type) {
    return res.status(400).json({
      error: `"${property}" is not writable. Allowed: ${Object.keys(writable).join(", ")}`,
    });
  }

  if (!UUID.test(pageId ?? "")) return res.status(400).json({ error: "Invalid pageId" });

  let payload;
  try {
    payload = writePayload(type, value);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const page = await notion.pages.update({
      page_id: pageId,
      properties: { [property]: payload },
    });
    return res.status(200).json({ id: page.id, property, value: plainValue(page.properties[property]) });
  } catch (error) {
    return res.status(error.status === 404 ? 404 : 500).json({ error: error.message });
  }
}

// Notion serves uploaded files through signed URLs that expire in about an hour,
// so these are handed straight to the browser and never stored anywhere.
export function fileUrls(prop) {
  if (!prop) return [];
  if (prop.type === "files") {
    return (prop.files ?? [])
      .map((f) => ({ name: f.name, url: f.type === "external" ? f.external?.url : f.file?.url }))
      .filter((f) => f.url);
  }
  if (prop.type === "rollup" && prop.rollup?.type === "array") {
    return (prop.rollup.array ?? []).flatMap(fileUrls);
  }
  return [];
}

export default async function handler(req, res) {
  // No CORS headers: the portal is served from this same Vercel deployment.
  if (req.method !== "GET" && req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Authenticate before reporting anything about how the server is configured.
  if (!(await authorized(req, process.env.PORTAL_TOKEN))) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!process.env.NOTION_API_KEY) {
    return res.status(500).json({ error: "Server is missing NOTION_API_KEY" });
  }

  if (req.method === "PATCH") return handleUpdate(req, res);

  const db = req.query.db;
  if (!db || !DATABASES[db]) {
    return res.status(400).json({
      error: `Unknown database. Available: ${Object.keys(DATABASES).join(", ")}`,
    });
  }

  try {
    const response = await notion.databases.query({
      database_id: DATABASES[db],
      page_size: 100,
    });

    const records = response.results.map((page) => {
      const fields = {};
      const media = {};
      for (const [name, prop] of Object.entries(page.properties)) {
        fields[name] = plainValue(prop);
        const files = fileUrls(prop);
        if (files.length) media[name] = files;
      }
      const record = { id: page.id, url: page.url, fields };
      if (Object.keys(media).length) record.media = media;
      return record;
    });

    // Title property first, remaining columns in Notion's order.
    const first = response.results[0];
    let columns = [];
    if (first) {
      const names = Object.keys(first.properties);
      const titleName = names.find((n) => first.properties[n].type === "title");
      columns = titleName ? [titleName, ...names.filter((n) => n !== titleName)] : names;
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ count: records.length, columns, records });
  } catch (error) {
    const status = error.status === 404 ? 404 : 500;
    const message =
      error.status === 404
        ? `Database "${db}" is not shared with the integration in Notion.`
        : error.message;
    return res.status(status).json({ error: message });
  }
}
