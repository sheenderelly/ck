// Draws a receipt onto a canvas. Runs in the browser so there is no
// server-side image renderer to bundle, and so the fonts and text shaping are
// the ones the device already has.
(function (global) {
  "use strict";

  var PAPER = "#faf7f2";
  var ACCENT = "#d3252b";
  var INK = "#1a1a1a";
  var MUTED = "#8a8178";
  var RULE = "#e2dad0";
  var PAID = "#3f8f4f";
  var FONT = "ReceiptPoppins, Poppins, Helvetica, Arial, sans-serif";

  var W = 820;
  var PAD = 40;
  var X_QTY = 500;
  var X_PRICE = 620;
  var X_RIGHT = W - PAD;
  var ITEM_W = 400;
  var ROW_H = 64;
  var SCALE = 2; // drawn at 2x so the saved image stays sharp when zoomed

  function num(v) {
    return typeof v === "number" && isFinite(v) ? v : 0;
  }

  // The peso sign is missing from the embedded subset, so amounts spell out the
  // currency rather than risking a blank box on some devices.
  function peso(v) {
    var n = num(v);
    var body = Math.round(Math.abs(n)).toLocaleString("en-US");
    return (n < 0 ? "-" : "") + "PHP " + body;
  }

  function font(size, weight) {
    return (weight || 400) + " " + size + "px " + FONT;
  }

  // Wraps to at most `maxLines`, ellipsising the last line if it overflows.
  function wrap(ctx, text, maxWidth, maxLines) {
    var words = String(text == null ? "" : text).split(/\s+/).filter(Boolean);
    var lines = [];
    var line = "";

    for (var i = 0; i < words.length; i++) {
      var next = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(next).width <= maxWidth || !line) {
        line = next;
      } else {
        lines.push(line);
        line = words[i];
        if (lines.length === maxLines) break;
      }
    }
    if (lines.length < maxLines && line) lines.push(line);

    if (lines.length === maxLines) {
      var last = lines[maxLines - 1];
      var truncated = words.join(" ") !== lines.join(" ");
      if (truncated || ctx.measureText(last).width > maxWidth) {
        while (last.length && ctx.measureText(last + "…").width > maxWidth) {
          last = last.slice(0, -1);
        }
        lines[maxLines - 1] = last + "…";
      }
    }
    return lines;
  }

  function text(ctx, str, x, y, opts) {
    var o = opts || {};
    ctx.font = font(o.size || 16, o.weight);
    ctx.fillStyle = o.color || INK;
    ctx.textAlign = o.align || "left";
    ctx.textBaseline = "alphabetic";
    if (o.spacing && ctx.letterSpacing !== undefined) ctx.letterSpacing = o.spacing + "px";
    ctx.fillText(String(str == null ? "" : str), x, y);
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "0px";
  }

  function rule(ctx, y, color, width) {
    ctx.fillStyle = color;
    ctx.fillRect(PAD, y, W - PAD * 2, width || 1);
  }

  function pill(ctx, label, rightX, y) {
    if (!label) return;
    ctx.font = font(15, 400);
    var w = ctx.measureText(label).width + 32;
    var h = 32;
    var x = rightX - w;
    ctx.fillStyle = arguments[4] || MUTED;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, h / 2);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, w, h);
    }
    text(ctx, label, x + w / 2, y + 21, { size: 15, color: "#fff", align: "center" });
  }

  // Header block down to the rule under the column headings.
  var HEAD_H = 234;
  var TOTALS_GAP = 34;
  var ROW_STRONG = 44;
  var ROW_PLAIN = 32;
  // Descender, the gap to the footer rule, the footer line and the bottom pad.
  var FOOT_H = 116;

  // How far the totals block advances. The last row is always a strong one
  // (Total, or Balance when something has been paid).
  function totalsAdvance(data) {
    var a = ROW_PLAIN + ROW_STRONG; // subtotal, total
    if (num(data.shipping)) a += ROW_PLAIN;
    if (num(data.paid)) a += ROW_PLAIN + ROW_STRONG; // paid, balance
    return a;
  }

  // Mirrors exactly how draw() walks down the page, minus the trailing advance
  // after the final total — otherwise the footer floats away from the content.
  function heightFor(data) {
    var lines = (data.lines || []).length;
    return HEAD_H + lines * ROW_H + TOTALS_GAP + totalsAdvance(data) - ROW_STRONG + FOOT_H;
  }

  function draw(canvas, data) {
    var lines = data.lines || [];
    var height = heightFor(data);

    canvas.width = W * SCALE;
    canvas.height = height * SCALE;
    canvas.style.width = "100%";
    canvas.style.height = "auto";

    var ctx = canvas.getContext("2d");
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, height);

    var y = PAD + 36;
    text(ctx, "RECEIPT", PAD, y, { size: 36, weight: 600, spacing: 3 });
    pill(ctx, data.status, X_RIGHT, PAD + 6, num(data.balance) > 0 ? MUTED : PAID);
    y += 30;
    text(ctx, data.number, PAD, y, { size: 21, weight: 600, color: ACCENT });
    if (data.batch) text(ctx, data.batch, X_RIGHT, y, { size: 14, color: MUTED, align: "right" });

    // Buyer and date
    y += 44;
    text(ctx, "BILLED TO", PAD, y, { size: 12, color: MUTED, spacing: 1.5 });
    text(ctx, "DATE", X_RIGHT, y, { size: 12, color: MUTED, align: "right", spacing: 1.5 });
    y += 26;
    text(ctx, data.buyer || "—", PAD, y, { size: 23, weight: 600 });
    if (data.date) text(ctx, data.date, X_RIGHT, y, { size: 17, align: "right" });

    y += 18;
    rule(ctx, y, INK, 2);

    // Column headings
    y += 28;
    text(ctx, "ITEM", PAD, y, { size: 12, color: MUTED, weight: 600, spacing: 1.2 });
    text(ctx, "QTY", X_QTY, y, { size: 12, color: MUTED, weight: 600, align: "center", spacing: 1.2 });
    text(ctx, "PRICE", X_PRICE, y, { size: 12, color: MUTED, weight: 600, align: "right", spacing: 1.2 });
    text(ctx, "AMOUNT", X_RIGHT, y, { size: 12, color: MUTED, weight: 600, align: "right", spacing: 1.2 });
    y += 12;
    rule(ctx, y, RULE);

    // Line items
    lines.forEach(function (l, i) {
      var top = y;
      if (i % 2) {
        ctx.fillStyle = "rgba(0,0,0,0.02)";
        ctx.fillRect(PAD, top, W - PAD * 2, ROW_H);
      }
      ctx.font = font(17, 400);
      var wrapped = wrap(ctx, l["product name"], ITEM_W, 2);
      var baseline = top + 26;
      wrapped.forEach(function (ln, n) {
        text(ctx, ln, PAD, baseline + n * 22, { size: 17 });
      });
      text(ctx, String(num(l.qty) || 1), X_QTY, baseline, { size: 17, color: MUTED, align: "center" });
      text(ctx, peso(l["list price"]), X_PRICE, baseline, { size: 17, color: MUTED, align: "right" });
      text(ctx, peso(l.amount), X_RIGHT, baseline, { size: 17, weight: 600, align: "right" });

      y = top + ROW_H;
      rule(ctx, y, RULE);
    });

    // Totals
    y += 34;
    function totalRow(label, value, strong, accent) {
      var size = strong ? 20 : 16;
      text(ctx, label, X_RIGHT - 230, y, {
        size: size,
        color: strong ? INK : MUTED,
        weight: strong ? 600 : 400,
        align: "right",
      });
      text(ctx, value, X_RIGHT, y, {
        size: strong ? 28 : 16,
        weight: strong ? 600 : 400,
        color: accent ? ACCENT : INK,
        align: "right",
      });
      y += strong ? 44 : 32;
    }

    totalRow("Subtotal", peso(data.subtotal));
    if (num(data.shipping)) totalRow("Shipping", peso(data.shipping));
    totalRow("Total", peso(data.total), true);
    if (num(data.paid)) {
      totalRow("Paid", "- " + peso(data.paid));
      totalRow("Balance", peso(data.balance), true, num(data.balance) > 0);
    }

    // Footer, pinned to the bottom
    var footY = height - PAD - 10;
    rule(ctx, footY - 26, RULE);
    text(ctx, "Thank you!", PAD, footY, { size: 15, color: MUTED });
    text(ctx, lines.length + (lines.length === 1 ? " item" : " items"), X_RIGHT, footY, {
      size: 15,
      color: MUTED,
      align: "right",
    });

    return canvas;
  }

  global.ReceiptDraw = { draw: draw, heightFor: heightFor, peso: peso, wrap: wrap, WIDTH: W };
})(typeof window !== "undefined" ? window : this);
