/* Agenda da Dor - gráficos em SVG (sem dependências, imprimem bem em PDF). */

var Charts = (function () {
  "use strict";

  var PRINT_STYLE = 'style="print-color-adjust:exact;-webkit-print-color-adjust:exact"';

  function esc(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* Colunas da intensidade por dia do mês. */
  function dayColumns(monthKey, days) {
    var total = Store.daysInMonth(monthKey);
    var byDay = {};
    days.forEach(function (d) {
      var maxI = 0;
      d.episodes.forEach(function (ep) {
        if ((ep.intensity || 0) > maxI) maxI = ep.intensity;
      });
      byDay[d.dayNum] = { hasPain: d.hasPain, maxI: maxI, logged: true };
    });

    var W = 720, H = 190;
    var padL = 26, padR = 8, padB = 30, padT = 16;
    var innerW = W - padL - padR;
    var innerH = H - padT - padB;
    var slot = innerW / total;
    var barW = Math.max(4, slot - 3);

    var svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Intensidade da dor por dia" ' + PRINT_STYLE + '>';

    // grade
    for (var g = 0; g <= 2; g++) {
      var y = padT + innerH - (innerH * g) / 2;
      svg += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y +
        '" stroke="#E7E5F7" stroke-width="1" stroke-dasharray="' + (g === 0 ? "0" : "4 4") + '"/>';
      svg += '<text x="2" y="' + (y + 4) + '" font-size="9" fill="#94A3B8">' + (g === 0 ? "0" : g === 1 ? "5" : "10") + '</text>';
    }

    for (var d = 1; d <= total; d++) {
      var x = padL + (d - 1) * slot + (slot - barW) / 2;
      var info = byDay[d];
      if (!info || !info.hasPain) {
        svg += '<rect x="' + x.toFixed(1) + '" y="' + (padT + innerH - 4) + '" width="' + barW +
          '" height="4" rx="2" fill="' + (info ? "#DCD9F4" : "#F1EFFC") + '" ' + PRINT_STYLE + '/>';
      } else {
        var h = Math.max(6, (info.maxI / 10) * innerH);
        var color = CATALOG.intensityInfo(info.maxI).color;
        svg += '<rect x="' + x.toFixed(1) + '" y="' + (padT + innerH - h).toFixed(1) + '" width="' + barW +
          '" height="' + h.toFixed(1) + '" rx="3" fill="' + color + '" ' + PRINT_STYLE + '>' +
          '<title>Dia ' + d + ': intensidade ' + info.maxI + '/10</title></rect>';
      }
      if (d === 1 || d % 5 === 0 || d === total) {
        svg += '<text x="' + (x + barW / 2).toFixed(1) + '" y="' + (H - 12) +
          '" font-size="9" fill="#94A3B8" text-anchor="middle">' + d + '</text>';
      }
    }

    svg += '<text x="' + padL + '" y="' + (H - 2) + '" font-size="9" fill="#94A3B8">dia do mês</text>';
    svg += "</svg>";
    return svg;
  }

  /* Barras horizontais ranqueadas (gatilhos, alívios, sintomas...). */
  function hBars(items, opts) {
    opts = opts || {};
    var labelW = opts.labelW || 230;
    var valueW = opts.valueW || 96;
    var rowH = opts.rowH || 30;
    var barMax = opts.barMax || 100;
    var unit = opts.unit || "%";
    var W = opts.width || 640;
    if (!items.length) {
      return '<p class="chart-empty">' + esc(opts.emptyText || "Sem dados ainda.") + "</p>";
    }
    var H = items.length * rowH + 6;
    var barArea = W - labelW - valueW - 10;
    var svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" ' + PRINT_STYLE + '>';

    items.forEach(function (item, i) {
      var y = i * rowH;
      var value = opts.valueFn ? opts.valueFn(item) : item.value;
      var pct = Math.max(0, Math.min(1, value / barMax));
      var barW = Math.max(3, pct * barArea);
      var color = opts.colorFn ? opts.colorFn(item) : (item.color || "#7A5AF8");
      var label = item.label;
      if (label.length > 34) label = label.slice(0, 33) + "…";
      var valueText = opts.textFn ? opts.textFn(item) : Math.round(value) + unit;

      svg += '<text x="0" y="' + (y + rowH / 2 + 4) + '" font-size="12" fill="#3B3660">' + esc(label) + "</text>";
      svg += '<rect x="' + labelW + '" y="' + (y + rowH / 2 - 7) + '" width="' + barArea +
        '" height="14" rx="7" fill="#F1EFFC" ' + PRINT_STYLE + "/>";
      svg += '<rect x="' + labelW + '" y="' + (y + rowH / 2 - 7) + '" width="' + barW.toFixed(1) +
        '" height="14" rx="7" fill="' + color + '" ' + PRINT_STYLE + '><title>' + esc(valueText) + "</title></rect>";
      svg += '<text x="' + (W - 2) + '" y="' + (y + rowH / 2 + 4) +
        '" font-size="11.5" font-weight="600" fill="#1E1B36" text-anchor="end">' + esc(valueText) + "</text>";
    });

    svg += "</svg>";
    return svg;
  }

  /* Barras verticais por dia da semana (dor). */
  function weekBars(weekday) {
    var W = 420, H = 170;
    var padL = 8, padB = 34, padT = 14;
    var innerH = H - padT - padB;
    var slot = (W - padL * 2) / 7;
    var maxCount = Math.max(1, Math.max.apply(null, weekday.map(function (w) { return w.total; })));
    var svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" ' + PRINT_STYLE + ">";

    weekday.forEach(function (w, i) {
      var x = padL + i * slot + slot * 0.18;
      var bw = slot * 0.64;
      var totalH = (w.total / maxCount) * innerH;
      var painH = (w.pain / maxCount) * innerH;
      var yBase = padT + innerH;
      svg += '<rect x="' + x.toFixed(1) + '" y="' + (yBase - totalH).toFixed(1) + '" width="' + bw.toFixed(1) +
        '" height="' + Math.max(2, totalH).toFixed(1) + '" rx="5" fill="#E4E0FA" ' + PRINT_STYLE + "/>";
      if (w.pain > 0) {
        svg += '<rect x="' + x.toFixed(1) + '" y="' + (yBase - painH).toFixed(1) + '" width="' + bw.toFixed(1) +
          '" height="' + Math.max(3, painH).toFixed(1) + '" rx="5" fill="#7A5AF8" ' + PRINT_STYLE + ">" +
          "<title>" + w.pain + " dia(s) com dor</title></rect>";
      }
      svg += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (yBase - Math.max(totalH, painH) - 5).toFixed(1) +
        '" font-size="10" fill="#6B6690" text-anchor="middle">' + (w.pain || "") + "</text>";
      svg += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 16) +
        '" font-size="11" fill="#3B3660" text-anchor="middle" font-weight="600">' + w.label + "</text>";
      svg += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 4) +
        '" font-size="9" fill="#94A3B8" text-anchor="middle">' + (w.total ? Math.round(w.painRate * 100) + "%" : "–") + "</text>";
    });

    svg += "</svg>";
    return svg;
  }

  /* Barras por período do dia. */
  function hourBars(hours) {
    var max = Math.max(1, Math.max.apply(null, hours.map(function (h) { return h.count; })));
    return hBars(
      hours.map(function (h) {
        return { label: h.label, value: h.count, raw: h.count };
      }),
      {
        labelW: 110,
        barMax: max,
        unit: "",
        colorFn: function () { return "#0EA5E9"; },
        textFn: function (item) { return item.value + (item.value === 1 ? " crise" : " crises"); },
        emptyText: "Sem crises registradas."
      }
    );
  }

  /* Tendência de meses (barras de episódios). */
  function trendBars(points) {
    var W = 640, H = 170;
    var padL = 10, padB = 34, padT = 16;
    var innerH = H - padT - padB;
    var slot = (W - padL * 2) / Math.max(1, points.length);
    var max = Math.max(1, Math.max.apply(null, points.map(function (p) { return p.episodes; })));
    var svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" ' + PRINT_STYLE + ">";

    points.forEach(function (p, i) {
      var x = padL + i * slot + slot * 0.2;
      var bw = slot * 0.6;
      var h = (p.episodes / max) * innerH;
      var y = padT + innerH - h;
      svg += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) +
        '" height="' + Math.max(3, h).toFixed(1) + '" rx="6" fill="#7A5AF8" ' + PRINT_STYLE + ">" +
        "<title>" + esc(p.label) + ": " + p.episodes + " crises</title></rect>";
      svg += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 5).toFixed(1) +
        '" font-size="10.5" font-weight="600" fill="#3B3660" text-anchor="middle">' + p.episodes + "</text>";
      svg += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 16) +
        '" font-size="11" fill="#3B3660" text-anchor="middle">' + esc(p.label) + "</text>";
      svg += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 4) +
        '" font-size="9" fill="#94A3B8" text-anchor="middle">média ' + p.avgIntensity + "</text>";
    });

    svg += "</svg>";
    return svg;
  }

  /* Rosca simples: dias com dor vs sem dor. */
  function donut(painDays, freeDays) {
    var total = painDays + freeDays;
    var W = 150, H = 150, r = 54, sw = 22;
    var cx = W / 2, cy = H / 2;
    var svg = '<svg class="chart donut" viewBox="0 0 ' + W + ' ' + H + '" ' + PRINT_STYLE + ">";
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#E4E0FA" stroke-width="' + sw + '"/>';
    if (total > 0 && painDays > 0) {
      var circ = 2 * Math.PI * r;
      var frac = painDays / total;
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#7A5AF8" stroke-width="' + sw +
        '" stroke-dasharray="' + (circ * frac).toFixed(2) + " " + circ.toFixed(2) +
        '" transform="rotate(-90 ' + cx + " " + cy + ')" stroke-linecap="round"/>';
    }
    svg += '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="26" font-weight="700" fill="#1E1B36">' +
      (total ? Math.round((painDays / total) * 100) : 0) + "%</text>";
    svg += '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="10" fill="#6B6690">dias com dor</text>';
    svg += "</svg>";
    return svg;
  }

  return {
    dayColumns: dayColumns,
    hBars: hBars,
    weekBars: weekBars,
    hourBars: hourBars,
    trendBars: trendBars,
    donut: donut,
    esc: esc
  };
})();
