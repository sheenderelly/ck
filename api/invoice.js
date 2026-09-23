// Reads invoices from Notion and returns them as JSON. The receipt image is
// drawn in the browser (see receipt-draw.js), so this function has no image
// renderer to bundle — nothing here carries a wasm file or a native binary.

const NOTION = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const INVOICES_DB = "2d90e47d-8033-806c-b6da-f117fbdf92de";
const LINES_DB = "2d90e47d-8033-801a-9cb9-c07e9bb6d3a3";

const NO_STORE = "no-store, no-cache, must-revalidate";

export const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

// The canvas font has no emoji, so "🧾 unpaid" would draw a blank box.
// ™, © and ® are classed as emoji but are ordinary symbols the font has, and
// product names use them ("ROIHI-TSUBOKO™"), so they are kept.
const KEEP = new Set(["™", "©", "®"]);

export function deEmoji(text) {
  return String(text ?? "")
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}️‍]/gu, (ch) =>
      KEEP.has(ch) ? ch : ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

// Spelled out rather than via toLocaleDateString, whose month abbreviations
// vary between runtimes ("Sep" here, "Sept" there).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function asDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
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

// Shapes one invoice plus its lines into what the canvas expects.
export function toReceipt(inv, lines, buyer, createdTime) {
  // Prefer Notion's own formulas, but never send a blank total if one is missing.
  const subtotal = num(inv.subtotal ?? lines.reduce((sum, l) => sum + num(l.amount), 0));
  const shipping = num(inv["shipping fee"]);
  const total = num(inv["total amount"] ?? subtotal + shipping);
  const paid = num(inv["total paid"]);

  return {
    number: inv.invoice ?? "",
    batch: deEmoji(inv.batch),
    status: deEmoji(inv["buyer status"]),
    buyer: deEmoji(buyer),
    date: asDate(createdTime),
    lines: lines.map((l) => ({
      "product name": deEmoji(l["product name"]),
      qty: num(l.qty),
      "list price": num(l["list price"]),
      amount: num(l.amount),
    })),
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

    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: String(err?.message ?? err) });
  }
}
