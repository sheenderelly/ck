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

const ALLOWED_ORIGINS = [
  "https://ck-pasaubuy.vercel.app",
  "https://sheenderelly.github.io",
];

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

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Portal-Token");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.NOTION_API_KEY || !process.env.PORTAL_TOKEN) {
    return res.status(500).json({ error: "Server is missing NOTION_API_KEY or PORTAL_TOKEN" });
  }

  const token = req.headers["x-portal-token"] || req.query.token;
  if (token !== process.env.PORTAL_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

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
      for (const [name, prop] of Object.entries(page.properties)) {
        fields[name] = plainValue(prop);
      }
      return { id: page.id, url: page.url, fields };
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
