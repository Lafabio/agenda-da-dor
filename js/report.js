/* Agenda da Dor - relatório mensal (pré-visualização e impressão em PDF). */

var Report = (function () {
  "use strict";

  function esc(text) {
    return Charts.esc(text);
  }

  function minutesText(min) {
    if (!min) return "0 min";
    var h = Math.floor(min / 60);
    var m = min % 60;
    if (!h) return m + " min";
    return h + "h" + (m ? String(Store.pad(m)) : "");
  }

  function deltaBadge(value, suffix, inverseGood) {
    if (value === null || value === undefined) return "";
    var up = value > 0;
    var same = value === 0;
    var good = same ? null : (inverseGood ? !up : up === false);
    var cls = same ? "flat" : good ? "good" : "bad";
    var sign = up ? "+" : "";
    var txt = sign + value + (suffix || "");
    return '<span class="delta ' + cls + '">' + txt + "</span>";
  }

  function statCard(label, value, hint, accent) {
    return '<div class="stat-card' + (accent ? " accent" : "") + '">' +
      '<div class="stat-value">' + esc(value) + "</div>" +
      '<div class="stat-label">' + esc(label) + "</div>" +
      (hint ? '<div class="stat-hint">' + esc(hint) + "</div>" : "") +
      "</div>";
  }

  function triggerRows(items, limit) {
    var rows = items.slice(0, limit || 8);
    if (!rows.length) {
      return '<p class="muted">Dados insuficientes. Marque os fatores de cada dia no check-in (inclusive dias sem dor) por pelo menos 1 semana para liberar esta análise.</p>';
    }
    var html = '<table class="data-table"><thead><tr>' +
      "<th>Possível causa</th><th>Com dor</th><th>Sem dor</th><th>Leitura</th>" +
      "</tr></thead><tbody>";
    rows.forEach(function (t) {
      html += "<tr>" +
        "<td><strong>" + esc(t.label) + "</strong></td>" +
        "<td>" + t.percentWith + "% <span class='mini'>(" + t.withTPain + "/" + t.withT + " dias)</span></td>" +
        "<td>" + t.percentWithout + "% <span class='mini'>(" + t.withoutTPain + "/" + t.withoutT + " dias)</span></td>" +
        '<td><span class="tag" style="background:' + t.levelColor + '22;color:' + t.levelColor + '">' +
        esc(t.levelLabel) + "</span></td>" +
        "</tr>";
    });
    html += "</tbody></table>";
    return html;
  }

  function reliefTable(items, limit) {
    var rows = items.filter(function (r) { return r.tried > 0; }).slice(0, limit || 8);
    if (!rows.length) {
      return '<p class="muted">Ainda não há registros do que você tentou para aliviar as crises.</p>';
    }
    var html = '<table class="data-table"><thead><tr>' +
      "<th>O que você tentou</th><th>Vezes</th><th>Ajudou</th><th>Alívio total</th>" +
      "</tr></thead><tbody>";
    rows.forEach(function (r) {
      html += "<tr>" +
        "<td><strong>" + esc(r.label) + "</strong></td>" +
        "<td>" + r.tried + "</td>" +
        "<td>" + r.percentHelped + "%</td>" +
        "<td>" + r.percentTotal + "%</td>" +
        "</tr>";
    });
    html += "</tbody></table>";
    return html;
  }

  function simpleBars(items, emptyMsg) {
    if (!items.length) return '<p class="muted">' + emptyMsg + "</p>";
    return Charts.hBars(
      items.map(function (it) {
        return { label: it.label, value: it.count };
      }),
      {
        labelW: 240,
        barMax: items[0].count,
        colorFn: function (item, index) { return "#0EA5E9"; },
        textFn: function (item) { return item.value + "×"; }
      }
    );
  }

  /* Tabela de registro das crises — espelho do formulário em papel. */
  function episodesTableHTML(analysis) {
    var rows = [];
    analysis.days.forEach(function (day) {
      day.episodes.forEach(function (ep) {
        rows.push({ day: day, ep: ep });
      });
    });
    if (!rows.length) {
      return '<p class="muted">Nenhuma crise registrada neste mês. Use "Registrar dor" para anotar cada episódio — esta é a tabela que a neurologista pede para levar à consulta.</p>';
    }
    var html = '<table class="data-table table-crises"><thead><tr>' +
      "<th>Data/hora</th><th>Int.</th><th>Tipo de dor</th><th>Onde dói?</th>" +
      "<th>O que eu estava fazendo?</th><th>Sintomas / observações</th>" +
      "</tr></thead><tbody>";
    rows.forEach(function (row) {
      var ep = row.ep;
      var info = CATALOG.intensityInfo(ep.intensity || 1);
      var pt = ep.painType ? CATALOG.findPainType(ep.painType) : null;
      var act = ep.activity ? CATALOG.findActivity(ep.activity) : null;
      var locs = (ep.locations || []).map(function (id) {
        var f = CATALOG.findLocation(id);
        return f ? f.label : id;
      }).join(", ");
      var syms = (ep.symptoms || []).map(function (id) {
        var f = CATALOG.findSymptom(id);
        return f ? f.label : id;
      }).join(", ");
      if (ep.notes) syms += (syms ? " · " : "") + "<em>" + esc(ep.notes) + "</em>";
      html += "<tr>" +
        "<td>" + esc(Store.formatDayShort(row.day.key)) + " " + esc(ep.time || "--:--") + "</td>" +
        '<td><span class="tag" style="background:' + info.color + '22;color:' + info.color + '">' +
        (ep.intensity || 0) + "/10</span></td>" +
        "<td>" + (pt ? esc(pt.label) : "—") + "</td>" +
        "<td>" + (locs ? esc(locs) : "—") + "</td>" +
        "<td>" + (act ? esc(act.label) : "—") + "</td>" +
        "<td>" + (syms || "—") + "</td>" +
        "</tr>";
    });
    html += "</tbody></table>";
    html += '<p class="muted small">' + rows.length + (rows.length === 1 ? " crise registrada" : " crises registradas") +
      " neste mês.</p>";
    return html;
  }

  /* Resumo por semana do mês (padrão do formulário "Resumo"). */
  function weeklySummaryHTML(monthKey, analysis) {
    var daysIn = Store.daysInMonth(monthKey);
    var html = '<table class="data-table"><thead><tr>' +
      "<th>Semana</th><th>Dias com dor</th><th>Crises</th><th>Pior intensidade</th><th>Sono médio</th>" +
      "</tr></thead><tbody>";
    for (var start = 1; start <= daysIn; start += 7) {
      var end = Math.min(daysIn, start + 6);
      var painDays = 0, eps = 0, maxI = 0, sleeps = [];
      analysis.days.forEach(function (day) {
        if (day.dayNum < start || day.dayNum > end) return;
        if (day.hasPain) painDays++;
        eps += day.episodes.length;
        day.episodes.forEach(function (ep) {
          if ((ep.intensity || 0) > maxI) maxI = ep.intensity || 0;
        });
        if (day.checkin && typeof day.checkin.sleepHours === "number") sleeps.push(day.checkin.sleepHours);
      });
      var avgSleep = sleeps.length
        ? (Math.round((sleeps.reduce(function (a, b) { return a + b; }, 0) / sleeps.length) * 10) / 10)
        : null;
      html += "<tr>" +
        "<td><strong>" + Store.pad(start) + "–" + Store.pad(end) + "</strong></td>" +
        "<td>" + painDays + "</td>" +
        "<td>" + eps + "</td>" +
        "<td>" + (maxI ? maxI + "/10" : "—") + "</td>" +
        "<td>" + (avgSleep != null ? String(avgSleep).replace(".", ",") + "h" : "—") + "</td>" +
        "</tr>";
    }
    html += "</tbody></table>";
    return html;
  }

  function buildHTML(monthKey) {
    var analysis = Insights.analyzeMonth(monthKey);
    var s = analysis.summary;
    var compare = Insights.compareWithPrevious(monthKey);
    var trend = Insights.trend(monthKey, 6);
    var generated = new Date();
    var name = Store.state.settings.name || "Não informado";
    var strongTriggers = analysis.triggers.ranked.filter(function (t) {
      return t.level === "forte" || t.level === "provavel" || t.level === "leve";
    });

    var html = '<article class="report-paper">';

    /* Cabeçalho */
    html += '<header class="report-head">' +
      '<div class="report-brand"><span class="brand-mark">A</span>' +
      '<div><h1>Agenda da Dor</h1><p>Relatório mensal de enxaqueca</p></div></div>' +
      '<div class="report-meta">' +
      "<p><strong>Período:</strong> " + esc(Store.monthName(monthKey)) + "</p>" +
      "<p><strong>Nome:</strong> " + esc(name) + "</p>" +
      "<p><strong>Gerado em:</strong> " + Store.formatDayShort(Store.toKey(generated)) +
      " (" + Store.pad(generated.getHours()) + ":" + Store.pad(generated.getMinutes()) + ")</p>" +
      "</div></header>";

    /* Resumo */
    html += '<section><h2>1. Resumo do mês</h2><div class="stat-grid">';
    html += statCard("Dias com dor", String(s.painDays), "de " + s.daysInMonth + " dias do mês", true);
    html += statCard("Crises (episódios)", String(s.episodes), s.painDays ? "média " + (Math.round((s.episodes / s.painDays) * 10) / 10) + " por dia afetado" : "—");
    html += statCard("Intensidade média", s.avgIntensity ? s.avgIntensity + "/10" : "—", "pico " + (s.maxIntensity || "—") + "/10");
    html += statCard("Tempo de dor", minutesText(s.totalMinutes), "média de " + (s.avgDuration || 0) + " min por crise");
    html += statCard("Sono médio", s.avgSleep ? s.avgSleep + "h" : "—", s.loggedDays + " dias com check-in");
    html += statCard("Sem dor", String(s.painFreeDays), "dias livres no mês");
    html += "</div>";

    html += '<div class="report-flex">';
    html += '<div class="donut-wrap">' + Charts.donut(s.painDays, s.painFreeDays) + "</div>";
    html += '<div class="narrative"><h3>O que os dados dizem</h3><ul>';
    analysis.narrative.forEach(function (line) {
      html += "<li>" + esc(line) + "</li>";
    });
    html += "</ul></div></div></section>";

    /* Evolução diária */
    html += '<section><h2>2. Evolução da dor no mês</h2>' +
      '<p class="muted">Cada barra é um dia; a altura é a pior intensidade daquele dia (0 a 10).</p>' +
      Charts.dayColumns(monthKey, analysis.days) +
      '<div class="legend">' +
      '<span><i style="background:#2ED3A7"></i>0–2</span>' +
      '<span><i style="background:#84CC16"></i>3–4</span>' +
      '<span><i style="background:#FDBA2D"></i>5–6</span>' +
      '<span><i style="background:#F97316"></i>7–8</span>' +
      '<span><i style="background:#EF4444"></i>9–10</span>' +
      '<span><i style="background:#F1EFFC;border:1px solid #DCD9F4"></i>sem registro/dor</span>' +
      "</div></section>";

    /* Registro das crises (tabela do formulário da neurologista) */
    html += '<section><h2>3. Registro das crises</h2>' +
      '<p class="muted">Tabela do diário, como no formulário: uma linha por crise do mês.</p>' +
      episodesTableHTML(analysis) +
      "</section>";

    /* Causas */
    html += '<section><h2>4. Possíveis causas (mapeamento de gatilhos)</h2>' +
      '<p class="muted">Comparação: em quantos dias com o fator houve dor, versus sem o fator. ' +
      'Quanto maior a diferença, maior a suspeita de ser gatilho. É correlação — não é diagnóstico.</p>';
    if (strongTriggers.length) {
      html += Charts.hBars(
        strongTriggers.slice(0, 8).map(function (t) {
          return {
            label: t.label,
            value: t.percentWith,
            color: t.levelColor,
            sub: t.percentWithout
          };
        }),
        {
          labelW: 250,
          barMax: 100,
          unit: "%",
          colorFn: function (item) { return item.color; },
          textFn: function (item) { return item.value + "% com dor"; }
        }
      );
    }
    html += triggerRows(analysis.triggers.ranked, 10);
    if (analysis.triggers.pending.length) {
      html += '<p class="muted small">Ainda sem dados suficientes para: ' +
        analysis.triggers.pending.slice(0, 12).map(function (id) {
          var f = CATALOG.findTrigger(id);
          return esc(f ? f.trigger.label : id);
        }).join(", ") + ".</p>";
    }
    html += "</section>";

    /* Benefícios */
    html += '<section><h2>5. O que ajudou (mapeamento de benefícios)</h2>' +
      '<p class="muted">Registros de cada tentativa de alívio e o resultado obtido (total, parcial ou nenhum).</p>';
    var helpedItems = analysis.reliefs.filter(function (r) { return r.tried > 0; });
    if (helpedItems.length) {
      html += Charts.hBars(
        helpedItems.slice(0, 8).map(function (r) {
          return { label: r.label, value: r.percentHelped, color: "#2ED3A7" };
        }),
        {
          labelW: 250,
          barMax: 100,
          colorFn: function (item) { return "#2ED3A7"; },
          textFn: function (item) { return item.value + "% ajudou"; }
        }
      );
    }
    html += reliefTable(analysis.reliefs, 10);
    html += "</section>";

    /* Padrões */
    html += '<section><h2>6. Padrões</h2>';
    html += '<div class="report-cols">';
    html += '<div><h4>Por dia da semana</h4>' + Charts.weekBars(analysis.weekday) +
      '<p class="muted small">Roxo = dias com dor; claro = dias registrados.</p></div>';
    html += '<div><h4>Horário de início das crises</h4>' + Charts.hourBars(analysis.hours) + "</div>";
    html += "</div>";

    html += '<div class="report-cols">';
    html += '<div><h4>Tipo de dor</h4>' +
      (analysis.painTypes.total
        ? simpleBars(analysis.painTypes.items, "Sem registros.")
        : '<p class="muted">Nenhum tipo de dor registrado.</p>') + "</div>";
    html += '<div><h4>O que eu estava fazendo?</h4>' +
      (analysis.activities.total
        ? simpleBars(analysis.activities.items.slice(0, 7), "Sem registros.")
        : '<p class="muted">Nada registrado ainda.</p>') + "</div>";
    html += "</div>";

    html += '<div class="report-cols">';
    html += '<div><h4>Sintomas mais frequentes</h4>' +
      simpleBars(analysis.symptoms.slice(0, 6), "Sem sintomas registrados.") + "</div>";
    html += '<div><h4>Locais da dor</h4>' +
      simpleBars(analysis.locations.slice(0, 6), "Sem locais registrados.") + "</div>";
    html += "</div></section>";

    /* Resumo das semanas + padrão percebido (seção "Resumo" do formulário) */
    var monthNote = Store.getMonthNote(monthKey);
    html += '<section><h2>7. Resumo das semanas</h2>' +
      '<p class="muted">Agrupamento em semanas de 7 dias, como no resumo do formulário.</p>' +
      weeklySummaryHTML(monthKey, analysis) +
      '<div class="report-note"><h4>Percebi algum padrão ou possível gatilho?</h4>' +
      (monthNote
        ? "<p>" + esc(monthNote) + "</p>"
        : '<p class="muted">— ainda não preenchido (escreva na aba Relatório) —</p>') +
      "</div></section>";

    /* Tendência */
    html += '<section><h2>8. Evolução nos últimos meses</h2>' +
      Charts.trendBars(trend) +
      '<p class="muted small">Barras = número de crises; "média" = intensidade média do mês.</p>';
    if (compare.previous) {
      var d = compare.deltas;
      html += '<p class="compare">Comparado a ' + esc(Store.monthName(compare.prevKey)) + ": " +
        "crises " + deltaBadge(d.episodes, "", false) + " · " +
        "dias com dor " + deltaBadge(d.painDays, "", false) + " · " +
        "intensidade média " + deltaBadge(d.avgIntensity, "", false) + " · " +
        "sono " + deltaBadge(d.avgSleep, "h", false) + "</p>";
    }
    html += "</section>";

    /* Notas / médico */
    html += '<section><h2>9. Para levar ao médico</h2>' +
      '<ul class="checklist">' +
      "<li>Intensidade máxima do mês: <strong>" + (s.maxIntensity || "—") + "/10</strong></li>" +
      "<li>Duração média das crises: <strong>" + (s.avgDuration || 0) + " minutos</strong></li>" +
      "<li>Fatores com ligação forte/provável: <strong>" +
      (strongTriggers.length
        ? strongTriggers.slice(0, 5).map(function (t) { return esc(t.label); }).join(", ")
        : "ainda em observação") + "</strong></li>" +
      "<li>Alívios mais eficazes: <strong>" +
      (helpedItems.filter(function (r) { return r.percentHelped >= 60; }).slice(0, 4).map(function (r) {
        return esc(r.label);
      }).join(", ") || "ainda em observação") + "</strong></li>" +
      "</ul>" +
      '<div class="notes-box"><h4>Anotações livres</h4>' +
      '<div class="notes-lines"><span></span><span></span><span></span><span></span></div></div>' +
      "</section>";

    html += '<footer class="report-foot">' +
      "<p><strong>Aviso à neurologista:</strong> este relatório é um diário de observação pessoal. " +
      "Ele <strong>não serve para diagnosticar sozinho(a)</strong> — serve para ajudar a neurologista a ver os padrões " +
      "e conversarmos melhor na consulta. Enxaqueca em adolescentes deve ser avaliada por um profissional de saúde; " +
      "leve este relatório à consulta.</p>" +
      "<p>Agenda da Dor · dados salvos apenas neste dispositivo · gerado em " +
      Store.formatDay(Store.toKey(generated)) + "</p>" +
      "</footer>";

    html += "</article>";
    return html;
  }

  function filenameFor(monthKey) {
    var name = (Store.state.settings.name || "relatorio")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return "agenda-da-dor_" + (name || "relatorio") + "_" + monthKey + ".pdf";
  }

  /* Envia o relatório para a área de impressão (Salvar como PDF). */
  function exportPDF(monthKey, onBefore, onAfter) {
    var root = document.getElementById("printRoot");
    root.innerHTML = buildHTML(monthKey);
    root.setAttribute("data-filename", filenameFor(monthKey));
    if (typeof onBefore === "function") onBefore();
    setTimeout(function () {
      window.print();
      setTimeout(function () {
        root.innerHTML = "";
        if (typeof onAfter === "function") onAfter();
      }, 300);
    }, 60);
  }

  return {
    buildHTML: buildHTML,
    exportPDF: exportPDF,
    filenameFor: filenameFor,
    triggerRows: triggerRows,
    reliefTable: reliefTable
  };
})();
