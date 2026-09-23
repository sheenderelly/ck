import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { receipt, heightFor, deEmoji, num, WIDTH } from "./_receipt.js";
import { FONTS } from "./_fonts.js";

// Deliberately the Node runtime, not Edge: @vercel/og cannot be bundled for an
// Edge Function outside Next.js ("referencing unsupported modules"), and this
// pair does the same job — satori lays the receipt out as SVG, resvg
// rasterises it — with a native binary instead of wasm.

const NOTION = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const INVOICES_DB = "2d90e47d-8033-806c-b6da-f117fbdf92de";
const LINES_DB = "2d90e47d-8033-801a-9cb9-c07e9bb6d3a3";

const NO_STORE = "no-store, no-cache, must-revalidate";

// Renders the receipt to PNG bytes. Exported so tests can call it directly.
export async function renderReceipt(data) {
  const svg = await satori(receipt(data), {
    width: WIDTH,
    height: heightFor(data),
    fonts: FONTS,
  });
  return Buffer.from(new Resvg(svg).render().asPng());
}

async function notion(path, body) {
  const res = await fetch(`${NOTION}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      "notion-version": NOTION_VERSION,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Notion ${path} responded ${res.status}`);
  return res.json();
}

// Notion wraps every value in its own shape; the receipt only wants the value.
export function val(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case "title":
    case "rich_text":
      return prop[prop.type].map((t) => t.plain_text).join("");
    case "number":
      return prop.number;
    case "select":
      return prop.select?.name ?? null;
    case "status":
      return prop.status?.name ?? null;
    case "url":
      return prop.url;
    case "unique_id":
      return prop.unique_id?.number ?? null;
    case "relation":
      return prop.relation.map((r) => r.id);
    case "formula":
      return prop.formula?.[prop.formula.type] ?? null;
    case "rollup": {
      const r = prop.rollup;
      if (r.type === "number") return r.number;
      if (r.type === "array") {
        const flat = r.array.map(val).filter((v) => v !== null && v !== "");
        // "list price" rolls up a single product, so unwrap the common case.
        return flat.length === 1 ? flat[0] : flat;
      }
      return null;
    }
    default:
      return null;
  }
}

export function props(page) {
  const out = {};
  for (const [name, prop] of Object.entries(page.properties ?? {})) out[name] = val(prop);
  return out;
}

// Invoices carry no date property, so the receipt dates itself by when the
// invoice row was created.
// Spelled out rather than via toLocaleDateString, whose month abbreviations
// vary between runtimes ("Sep" here, "Sept" there).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function asDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Shapes one invoice plus its lines into what the layout expects.
export function toReceipt(inv, lines, buyer, createdTime) {
  // Prefer Notion's own formulas, but never render a blank total if one is missing.
  const subtotal = num(inv.subtotal ?? lines.reduce((sum, l) => sum + num(l.amount), 0));
  const shipping = num(inv["shipping fee"]);
  const total = num(inv["total amount"] ?? subtotal + shipping);
  const paid = num(inv["total paid"]);

  return {
    number: inv.invoice ?? "",
    batch: deEmoji(inv.batch),
    status: deEmoji(inv["buyer status"]),
    buyer: buyer ?? "",
    date: asDate(createdTime),
    lines,
    subtotal,
    shipping,
    total,
    paid,
    balance: total - paid,
  };
}

async function loadInvoice(number) {
  const found = await notion(`/databases/${INVOICES_DB}/query`, {
    filter: { property: "invoice", title: { equals: number } },
    page_size: 1,
  });
  if (!found.results.length) return null;

  const page = found.results[0];
  const inv = props(page);

  const linePages = await notion(`/databases/${LINES_DB}/query`, {
    filter: { property: "invoice", relation: { contains: page.id } },
    page_size: 100,
  });

  let buyer = "";
  const buyerId = inv.buyer?.[0];
  if (buyerId) {
    const buyerPage = await notion(`/pages/${buyerId}`);
    buyer = Object.values(props(buyerPage)).find((v) => typeof v === "string" && v) ?? "";
  }

  return toReceipt(inv, linePages.results.map(props), buyer, page.created_time);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", NO_STORE);

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (!process.env.NOTION_API_KEY) {
    return res.status(500).json({ error: "NOTION_API_KEY is not configured" });
  }

  try {
    // The picker needs a list of invoices to choose from.
    if (url.searchParams.has("list")) {
      const page = await notion(`/databases/${INVOICES_DB}/query`, {
        sorts: [{ property: "invoice", direction: "descending" }],
        page_size: 100,
      });
      const invoices = page.results
        .map((p) => {
          const inv = props(p);
          return {
            number: inv.invoice,
            batch: deEmoji(inv.batch),
            status: deEmoji(inv["buyer status"]),
            total: num(inv["total amount"] ?? inv.subtotal),
          };
        })
        .filter((i) => i.number);
      return res.status(200).json({ invoices });
    }

    const number = url.searchParams.get("inv");
    if (!number) return res.status(400).json({ error: "Pass ?inv=INV0001 or ?list=1" });

    const data = await loadInvoice(number);
    if (!data) return res.status(404).json({ error: `No invoice named ${number}` });

    const png = await renderReceipt(data);

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `inline; filename="${data.number || "receipt"}.png"`);
    return res.status(200).end(png);
  } catch (err) {
    return res.status(502).json({ error: String(err?.message ?? err) });
  }
}
