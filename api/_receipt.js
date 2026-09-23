// The receipt layout, kept free of Notion and of @vercel/og so it can be
// rendered straight through satori in tests. Files under api/ that start with
// an underscore are not routes.

// Matches the rest of the site: cream paper, the red accent, ink and a muted grey.
const PAPER = "#faf7f2";
const ACCENT = "#d3252b";
const INK = "#1a1a1a";
const MUTED = "#8a8178";
const RULE = "#e2dad0";
const PAID = "#3f8f4f";

export const WIDTH = 820;
export const ROW_H = 64;
const PAD = 40;
const COL_ITEM = 380;
const COL_QTY = 70;
const COL_PRICE = 130;
const COL_AMOUNT = 160;

export const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

// Notion stores these amounts as Philippine pesos. The peso sign is not in the
// renderer's font, so the code is spelled out instead of risking a blank box.
export function peso(v) {
  const n = num(v);
  const body = Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return `${n < 0 ? "-" : ""}PHP ${body}`;
}

// There is no emoji font either, so "🧾 unpaid" would draw a blank box. The
// statuses read fine as plain words.
export function deEmoji(text) {
  return String(text ?? "")
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}️‍]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function clip(text, max) {
  const s = deEmoji(text);
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

// Rows are a fixed height, so the image height is known before rendering.
export const heightFor = (data) =>
  470 + data.lines.length * ROW_H + (data.paid ? 70 : 0);

// Plain element objects, so this file needs no JSX build step.
const h = (type, style, children) => ({ type, props: { style, children } });
const text = (value, style) => ({ type: "div", props: { style, children: value } });
const row = (style) => ({ display: "flex", flexDirection: "row", ...style });

// satori makes every div a flex container, so textAlign does nothing here —
// horizontal placement has to come from justifyContent.
const JUSTIFY = { left: "flex-start", center: "center", right: "flex-end" };

function cell(value, width, align = "left", style = {}) {
  return text(value, {
    width,
    fontSize: 17,
    color: INK,
    justifyContent: JUSTIFY[align],
    ...style,
  });
}

function heading(label, width, align) {
  return cell(label, width, align, { fontSize: 12, color: MUTED, letterSpacing: 1.2 });
}

function totalRow(label, value, { strong = false, accent = false } = {}) {
  return h("div", row({ justifyContent: "flex-end", alignItems: "center", marginTop: strong ? 10 : 6 }), [
    text(label, {
      fontSize: strong ? 20 : 16,
      color: strong ? INK : MUTED,
      marginRight: 24,
    }),
    text(value, {
      width: 210,
      justifyContent: "flex-end",
      fontSize: strong ? 28 : 16,
      color: accent ? ACCENT : INK,
    }),
  ]);
}

export function receipt(data) {
  const lineRows = data.lines.map((l, i) =>
    h(
      "div",
      row({
        alignItems: "flex-start",
        height: ROW_H,
        overflow: "hidden",
        borderBottom: `1px solid ${RULE}`,
        paddingTop: 12,
        backgroundColor: i % 2 ? "rgba(0,0,0,0.02)" : "transparent",
      }),
      [
        cell(clip(l["product name"], 62), COL_ITEM, "left", { lineHeight: 1.3, paddingRight: 16 }),
        cell(String(num(l.qty) || 1), COL_QTY, "center", { color: MUTED }),
        cell(peso(l["list price"]), COL_PRICE, "right", { color: MUTED }),
        cell(peso(l.amount), COL_AMOUNT, "right"),
      ]
    )
  );

  const totals = [
    totalRow("Subtotal", peso(data.subtotal)),
    data.shipping ? totalRow("Shipping", peso(data.shipping)) : null,
    totalRow("Total", peso(data.total), { strong: true }),
  ].filter(Boolean);

  if (data.paid) {
    totals.push(totalRow("Paid", `- ${peso(data.paid)}`));
    totals.push(totalRow("Balance", peso(data.balance), { strong: true, accent: data.balance > 0 }));
  }

  return h(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      backgroundColor: PAPER,
      padding: PAD,
      fontFamily: "sans-serif",
      color: INK,
    },
    [
      // Header
      h("div", row({ justifyContent: "space-between", alignItems: "flex-start" }), [
        h("div", { display: "flex", flexDirection: "column" }, [
          text("RECEIPT", { fontSize: 36, letterSpacing: 3 }),
          text(data.number, { fontSize: 21, color: ACCENT, marginTop: 6 }),
        ]),
        h("div", { display: "flex", flexDirection: "column", alignItems: "flex-end" }, [
          text(data.status || "", {
            fontSize: 15,
            color: "#fff",
            backgroundColor: data.balance > 0 ? MUTED : PAID,
            padding: "6px 16px",
            borderRadius: 999,
          }),
          text(data.batch || "", { fontSize: 14, color: MUTED, marginTop: 10 }),
        ]),
      ]),

      // Buyer, with the invoice date opposite it
      h(
        "div",
        row({
          marginTop: 28,
          paddingBottom: 18,
          borderBottom: `2px solid ${INK}`,
          justifyContent: "space-between",
          alignItems: "flex-end",
        }),
        [
          h("div", { display: "flex", flexDirection: "column" }, [
            text("BILLED TO", { fontSize: 12, color: MUTED, letterSpacing: 1.5 }),
            text(clip(data.buyer, 40) || "—", { fontSize: 23, marginTop: 6 }),
          ]),
          h("div", { display: "flex", flexDirection: "column", alignItems: "flex-end" }, [
            text("DATE", { fontSize: 12, color: MUTED, letterSpacing: 1.5 }),
            text(data.date || "", { fontSize: 17, marginTop: 6 }),
          ]),
        ]
      ),

      // Column headings
      h("div", row({ paddingTop: 16, paddingBottom: 10, borderBottom: `1px solid ${RULE}` }), [
        heading("ITEM", COL_ITEM, "left"),
        heading("QTY", COL_QTY, "center"),
        heading("PRICE", COL_PRICE, "right"),
        heading("AMOUNT", COL_AMOUNT, "right"),
      ]),

      h("div", { display: "flex", flexDirection: "column" }, lineRows),
      h("div", { display: "flex", flexDirection: "column", marginTop: 22 }, totals),

      // Footer
      h(
        "div",
        row({
          marginTop: "auto",
          paddingTop: 20,
          borderTop: `1px solid ${RULE}`,
          justifyContent: "space-between",
        }),
        [
          text("Thank you!", { fontSize: 15, color: MUTED }),
          text(`${data.lines.length} item${data.lines.length === 1 ? "" : "s"}`, {
            fontSize: 15,
            color: MUTED,
          }),
        ]
      ),
    ]
  );
}
