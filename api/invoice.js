// Reads invoices from Notion and returns them as JSON. The order image is
// drawn in the browser (see order-draw.js), so this function has no image
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

// Notion wraps every value in its own shape; the order only needs the value.
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
    case "phone_number":
      return prop.phone_number;
    case "email":
      return prop.email;
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

// The client row holds Name, receiver, address and phone. Pick them by name
// and type rather than taking whichever string property happens to come first
// — that landed the address in the name slot.
export function toClient(page) {
  if (!page) return { name: "", receiver: "", address: "", phone: "" };
  const entries = Object.entries(page.properties ?? {});
  const titleEntry = entries.find(([, p]) => p?.type === "title");
  const pick = (name) => {
    const found = entries.find(([k]) => k.toLowerCase() === name);
    return found ? deEmoji(val(found[1])) : "";
  };
  return {
    name: deEmoji(titleEntry ? val(titleEntry[1]) : ""),
    receiver: pick("receiver"),
    address: pick("address"),
    phone: pick("phone"),
  };
}

// Shapes one invoice plus its lines into what the canvas expects.
export function toOrder(inv, lines, buyer, createdTime) {
  const client = typeof buyer === "string" ? { name: buyer } : buyer ?? {};
  // Prefer Notion's own formulas, but never send a blank total if one is missing.
  const subtotal = num(inv.subtotal ?? lines.reduce((sum, l) => sum + num(l.amount), 0));
  const shipping = num(inv["shipping fee"]);
  const total = num(inv["total amount"] ?? subtotal + shipping);
  const paid = num(inv["total paid"]);

  return {
    number: inv.invoice ?? "",
    batch: deEmoji(inv.batch),
    status: deEmoji(inv["buyer status"]),
    sellerStatus: deEmoji(inv["seller status"]),
    buyer: deEmoji(client.name),
    receiver: deEmoji(client.receiver),
    address: deEmoji(client.address),
    phone: deEmoji(client.phone),
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

// Notion's API can filter a status by option name but not by group, so the
// group members are read off the schema. Deriving them means renaming or
// adding a status in Notion does not silently break the filter.
export function completeOptionsFrom(database) {
  const out = {};
  for (const [name, prop] of Object.entries(database?.properties ?? {})) {
    if (prop?.type !== "status") continue;
    const group = (prop.status?.groups ?? []).find((g) => /^complete/i.test(g.name ?? ""));
    if (!group) continue;
    const ids = new Set(group.option_ids ?? []);
    out[name] = (prop.status?.options ?? []).filter((o) => ids.has(o.id)).map((o) => o.name);
  }
  return out;
}

// Drops an invoice only once BOTH sides are done — paid AND handed over. One
// side still open keeps it listed, because the order is not finished.
//
// Notion has no "not in group" filter, so each side becomes an AND of
// does_not_equal over its completed options ("this side is still open"), and
// the two sides are OR'd: open on either side is enough to list it. An invoice
// with no status set is not complete, and does_not_equal keeps it.
export function pendingFilter(complete) {
  const sides = Object.entries(complete)
    .map(([property, names]) => names.map((name) => ({ property, status: { does_not_equal: name } })))
    .filter((clauses) => clauses.length)
    .map((clauses) => (clauses.length === 1 ? clauses[0] : { and: clauses }));

  if (!sides.length) return undefined;
  return sides.length === 1 ? sides[0] : { or: sides };
}

// Walks every page of a query, so a long back catalogue cannot push pending
// invoices off the end of the first 100.
async function queryAll(dbId, body, maxPages = 10) {
  const results = [];
  let cursor;
  for (let i = 0; i < maxPages; i++) {
    const page = await notion(`/databases/${dbId}/query`, {
      ...body,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    results.push(...page.results);
    if (!page.has_more || !page.next_cursor) break;
    cursor = page.next_cursor;
  }
  return results;
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

  const buyerId = inv.buyer?.[0];
  const client = buyerId ? toClient(await notion(`/pages/${buyerId}`)) : null;

  return toOrder(inv, linePages.results.map(props), client, page.created_time);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", NO_STORE);

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (!process.env.NOTION_API_KEY) {
    return res.status(500).json({ error: "NOTION_API_KEY is not configured" });
  }

  try {
    // The picker lists only invoices still open on both sides — anything the
    // buyer has paid for and the seller has handed over is done with.
    if (url.searchParams.has("list")) {
      const complete = completeOptionsFrom(await notion(`/databases/${INVOICES_DB}`));
      const results = await queryAll(INVOICES_DB, {
        filter: pendingFilter(complete),
        sorts: [{ property: "invoice", direction: "descending" }],
      });
      const invoices = results
        .map((p) => {
          const inv = props(p);
          return {
            number: inv.invoice,
            sellerStatus: deEmoji(inv["seller status"]),
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
