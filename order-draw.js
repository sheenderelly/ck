// Draws an order onto a canvas, in the site's own design: the moss and olive
// theme tokens from style.css and Roboto Mono. Colours are read from the live
// CSS variables, so the order follows whichever theme the page is in and
// changes with the site rather than drifting from it.
(function (global) {
  "use strict";

  var FONT = "OrderMono, 'Roboto Mono', monospace";

  var W = 820;
  var PAD = 40;
  var X_QTY = 500;
  var X_PRICE = 620;
  var X_RIGHT = W - PAD;
  var ITEM_W = 400;
  var BUYER_W = 440;
  var ROW_H = 64;
  var SCALE = 2; // drawn at 2x so the saved image stays sharp when zoomed

  // Falls back to the dark theme's values so an order still draws if the
  // stylesheet has not applied yet.
  var FALLBACK = {
    "--bg-main": "#1a1c18",
    "--bg-card": "#242821",
    "--bg-elevated": "#2a2f25",
    "--text-primary": "#f1f3ec",
    "--text-secondary": "#a9ba9d",
    "--text-muted": "#6c7a5e",
    "--border": "#4a5441",
    "--accent": "#d4e157",
    "--success": "#81c784",
    "--error": "#c0413c",
  };

  function tokens() {
    var css = global.getComputedStyle
      ? global.getComputedStyle(document.documentElement)
      : null;
    var t = {};
    Object.keys(FALLBACK).forEach(function (name) {
      var v = css ? String(css.getPropertyValue(name) || "").trim() : "";
      t[name] = v || FALLBACK[name];
    });
    return t;
  }

  function num(v) {
    return typeof v === "number" && isFinite(v) ? v : 0;
  }

  // The mono subset has no peso sign, so amounts spell out the currency rather
  // than risking a blank box.
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
    ctx.font = font(o.size || 15, o.weight);
    ctx.fillStyle = o.color || "#000";
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

  // A soft-cornered box, matching the site's --radius-md on .panel.
  function box(ctx, x, y, w, h, radius, fill, stroke) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, radius);
    else ctx.rect(x, y, w, h);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }

  var TOTALS_GAP = 34;
  var ROW_STRONG = 44;
  var ROW_PLAIN = 32;
  var FOOT_H = 116;
  var CARD_PAD = 24; // the card inset around the whole order

  // Where both the QR and the text send a buyer: the published notion.site
  // address, which a stranger can open without a Notion account. One constant,
  // so the code and the pasted link can never drift apart.
  var PAY_URL =
    "https://cks-pad.notion.site/fund-transfer-2e00e47d8033803880a3d476cb346f98";

  // Pasted into a chat rather than drawn, so the emoji and the bold letters are
  // the receiving app's to render, not the canvas font's.
  var PAY_PROMPT = "\u{1F447}\u{1F3FB} \u{1D429}\u{1D41A}\u{1D432} \u{1D421}\u{1D41E}\u{1D42B}\u{1D41E}:";
  var QR_PLATE = 120;      // the light plate the code sits on
  var QR_SECTION_H = 192;  // the whole payment band, including its margins

  // There is nothing to pay once the balance is settled, so the payment band
  // is left off entirely. Driven by the balance rather than the status, the
  // same signal the status chip is coloured by.
  function owes(data) {
    return num(data.balance) > 0;
  }

  // Renders the code at one pixel per module, then scales it up with smoothing
  // off. Drawing the modules directly at a fractional size would blur their
  // edges, which is what makes a code hard to scan.
  function qrTile(url) {
    if (typeof qrcode !== "function") return null;
    try {
      var qr = qrcode(0, "M");
      qr.addData(url);
      qr.make();
      var n = qr.getModuleCount();
      var quiet = 4; // the spec's quiet zone, in modules
      var total = n + quiet * 2;

      var tile = document.createElement("canvas");
      tile.width = tile.height = total;
      var g = tile.getContext("2d");
      // Always dark-on-light, whatever the site theme is: an inverted code is
      // unreliable to scan, and this one is meant for a stranger's phone.
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, total, total);
      g.fillStyle = "#000000";
      for (var r = 0; r < n; r++) {
        for (var c = 0; c < n; c++) {
          if (qr.isDark(r, c)) g.fillRect(c + quiet, r + quiet, 1, 1);
        }
      }
      return tile;
    } catch (e) {
      return null; // a missing code must not cost us the whole order image
    }
  }

  function totalsAdvance(data) {
    var a = ROW_PLAIN + ROW_STRONG; // subtotal, total
    if (num(data.shipping)) a += ROW_PLAIN;
    if (num(data.paid)) a += ROW_PLAIN + ROW_STRONG; // paid, balance
    return a;
  }

  function buyerBlock(ctx, data, t) {
    var out = [{ text: data.buyer || "—", size: 20, weight: 700, color: t["--text-primary"], gap: 26 }];

    if (data.receiver && data.receiver !== data.buyer) {
      out.push({ text: "Attn: " + data.receiver, size: 13, color: t["--text-secondary"], gap: 24 });
    }
    if (data.address) {
      ctx.font = font(13, 400);
      wrap(ctx, data.address, BUYER_W, 3).forEach(function (line, i) {
        out.push({ text: line, size: 13, color: t["--text-muted"], gap: i === 0 ? 22 : 19 });
      });
    }
    if (data.phone) {
      out.push({ text: data.phone, size: 13, color: t["--text-muted"], gap: 22 });
    }
    return out;
  }

  function blockHeight(block) {
    return block.reduce(function (sum, item) { return sum + item.gap; }, 0);
  }

  function scratch() {
    return document.createElement("canvas").getContext("2d");
  }

  function heightFor(data, ctx) {
    var lines = (data.lines || []).length;
    var t = tokens();
    var head = 150 + blockHeight(buyerBlock(ctx || scratch(), data, t)) + 18 + 28 + 12;
    return (
      head + lines * ROW_H + TOTALS_GAP + totalsAdvance(data) - ROW_STRONG +
      (owes(data) ? QR_SECTION_H : 0) + FOOT_H
    );
  }

  function draw(canvas, data) {
    var t = tokens();
    var lines = data.lines || [];
    var block = buyerBlock(scratch(), data, t);
    var inner = heightFor(data, scratch());
    var height = inner + CARD_PAD * 2;

    canvas.width = W * SCALE;
    canvas.height = height * SCALE;
    canvas.style.width = "100%";
    canvas.style.height = "auto";

    var ctx = canvas.getContext("2d");
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

    // The page background, then the order as a card on top of it — the same
    // relationship as .panel against --bg-main on the site.
    ctx.fillStyle = t["--bg-main"];
    ctx.fillRect(0, 0, W, height);
    box(ctx, CARD_PAD / 2, CARD_PAD / 2, W - CARD_PAD, height - CARD_PAD, 6,
        t["--bg-card"], t["--border"]);

    ctx.save();
    ctx.translate(0, CARD_PAD);

    var accent = t["--accent"];
    var primary = t["--text-primary"];
    var secondary = t["--text-secondary"];
    var muted = t["--text-muted"];
    var border = t["--border"];

    var y = PAD + 30;
    // h5 on the site: uppercase, letterspaced, small.
    text(ctx, "ORDER", PAD, y, { size: 30, weight: 700, spacing: 4, color: primary });

    // Status reads as the site's code chip: elevated fill, bordered, accent text.
    if (data.status) {
      ctx.font = font(13, 400);
      var sw = ctx.measureText(data.status).width + 24;
      var unpaid = num(data.balance) > 0;
      box(ctx, X_RIGHT - sw, PAD + 6, sw, 28, 4, t["--bg-elevated"],
          unpaid ? t["--error"] : t["--success"]);
      text(ctx, data.status, X_RIGHT - sw / 2, PAD + 25, {
        size: 13,
        color: unpaid ? t["--error"] : t["--success"],
        align: "center",
      });
    }

    y += 28;
    text(ctx, data.number, PAD, y, { size: 18, weight: 700, color: accent });
    if (data.batch) text(ctx, data.batch, X_RIGHT, y, { size: 13, color: muted, align: "right" });

    // Buyer and date
    y += 44;
    text(ctx, "BILLED TO", PAD, y, { size: 11, color: secondary, spacing: 1.5, weight: 700 });
    text(ctx, "DATE", X_RIGHT, y, { size: 11, color: secondary, align: "right", spacing: 1.5, weight: 700 });

    block.forEach(function (item) {
      y += item.gap;
      text(ctx, item.text, PAD, y, { size: item.size, weight: item.weight, color: item.color });
      if (item === block[0] && data.date) {
        text(ctx, data.date, X_RIGHT, y, { size: 15, color: primary, align: "right" });
      }
    });

    y += 18;
    rule(ctx, y, accent, 2);

    // Column headings, in the site's h6 idiom
    y += 28;
    var head = { size: 11, color: secondary, weight: 700, spacing: 1.2 };
    text(ctx, "ITEM", PAD, y, head);
    text(ctx, "QTY", X_QTY, y, Object.assign({ align: "center" }, head));
    text(ctx, "PRICE", X_PRICE, y, Object.assign({ align: "right" }, head));
    text(ctx, "AMOUNT", X_RIGHT, y, Object.assign({ align: "right" }, head));
    y += 12;
    rule(ctx, y, border);

    lines.forEach(function (l, i) {
      var top = y;
      if (i % 2) {
        ctx.fillStyle = t["--bg-elevated"];
        ctx.fillRect(PAD, top, W - PAD * 2, ROW_H);
      }
      ctx.font = font(15, 400);
      var wrapped = wrap(ctx, l["product name"], ITEM_W, 2);
      var baseline = top + 26;
      wrapped.forEach(function (ln, n) {
        text(ctx, ln, PAD, baseline + n * 21, { size: 15, color: primary });
      });
      text(ctx, String(num(l.qty) || 1), X_QTY, baseline, { size: 15, color: muted, align: "center" });
      text(ctx, peso(l["list price"]), X_PRICE, baseline, { size: 15, color: muted, align: "right" });
      text(ctx, peso(l.amount), X_RIGHT, baseline, { size: 15, weight: 700, color: primary, align: "right" });

      y = top + ROW_H;
      rule(ctx, y, border);
    });

    // Totals
    y += 34;
    function totalRow(label, value, strong, isBalance) {
      text(ctx, label, X_RIGHT - 250, y, {
        size: strong ? 16 : 14,
        color: strong ? primary : secondary,
        weight: strong ? 700 : 400,
        align: "right",
      });
      text(ctx, value, X_RIGHT, y, {
        size: strong ? 24 : 14,
        weight: strong ? 700 : 400,
        color: isBalance ? t["--error"] : strong ? accent : primary,
        align: "right",
      });
      y += strong ? ROW_STRONG : ROW_PLAIN;
    }

    totalRow("Subtotal", peso(data.subtotal));
    if (num(data.shipping)) totalRow("Shipping", peso(data.shipping));
    totalRow("Total", peso(data.total), true);
    if (num(data.paid)) {
      totalRow("Paid", "- " + peso(data.paid));
      totalRow("Balance", peso(data.balance), true, num(data.balance) > 0);
    }

    // Payment methods: a scannable code and the line that explains it. Only
    // while something is still owed.
    if (owes(data)) {
      var bandY = inner - FOOT_H - QR_SECTION_H + 30;
      var bandH = QR_SECTION_H - 48;
      box(ctx, PAD, bandY, W - PAD * 2, bandH, 6, t["--bg-elevated"], border);

      var plateX = PAD + 18;
      var plateY = bandY + (bandH - QR_PLATE) / 2;
      var tile = qrTile(PAY_URL);
      if (tile) {
        box(ctx, plateX, plateY, QR_PLATE, QR_PLATE, 4, "#ffffff", null);
        var pad = 6;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tile, plateX + pad, plateY + pad, QR_PLATE - pad * 2, QR_PLATE - pad * 2);
        ctx.imageSmoothingEnabled = true;
      }

      var textX = plateX + (tile ? QR_PLATE + 26 : 0);
      var midY = bandY + bandH / 2;
      text(ctx, "SCAN HERE", textX, midY - 8, {
        size: 15,
        weight: 700,
        color: accent,
        spacing: 2,
      });
      text(ctx, "for the list of payment methods", textX, midY + 16, {
        size: 14,
        color: secondary,
      });
    }

    var footY = inner - PAD - 10;
    rule(ctx, footY - 26, border);
    text(ctx, "Thank you!", PAD, footY, { size: 13, color: muted });
    text(ctx, lines.length + (lines.length === 1 ? " item" : " items"), X_RIGHT, footY, {
      size: 13,
      color: muted,
      align: "right",
    });

    ctx.restore();
    return canvas;
  }

  // The same order as plain text, for pasting into a chat. Lines in brackets
  // in the spec — paid and balance — appear only when there is a value, and
  // shipping follows the same rule so the items and the total still add up.
  function asText(data) {
    var out = [];

    // Header: the invoice and who it is for, then where it stands.
    var head = [data.number, data.buyer].filter(Boolean).join("｜");
    if (head) out.push(head);

    var state = [data.sellerStatus, data.status].filter(Boolean).join(", ");
    if (state) out.push(state);

    var lines = data.lines || [];
    if (lines.length) {
      if (out.length) out.push("");
      lines.forEach(function (l) {
        var name = String(l["product name"] == null ? "" : l["product name"]).trim();
        out.push(name + "  x" + (num(l.qty) || 1) + "  " + peso(l.amount));
      });
    }

    out.push("");
    if (num(data.shipping)) out.push("Shipping  " + peso(data.shipping));
    out.push("Total  " + peso(data.total));
    if (num(data.paid) > 0) out.push("Paid  " + peso(data.paid));
    if (num(data.balance) > 0) out.push("Balance  " + peso(data.balance));

    // Same condition as the QR band: nothing left to pay, nothing to point at.
    if (owes(data)) {
      out.push("");
      out.push(PAY_PROMPT);
      out.push(PAY_URL);
    }

    return out.join("\n");
  }

  global.OrderDraw = {
    draw: draw,
    heightFor: heightFor,
    peso: peso,
    wrap: wrap,
    asText: asText,
    WIDTH: W,
  };
})(typeof window !== "undefined" ? window : this);
