/* Agenda da Dor - motor de análise: mapeia possíveis causas (gatilhos)
   e benefícios (alívios) a partir dos registros. */

var Insights = (function () {
  "use strict";

  var MIN_SUPPORT = 3; // dias mínimos com o gatilho para avaliar

  function emptyLogMap() {
    return { days: [], painDays: 0, episodes: [] };
  }

  /* Coleta os dias de um mês (YYYY-MM) a partir do Store. */
  function collectMonth(monthKey) {
    var out = emptyLogMap();
    var daysIn = Store.daysInMonth(monthKey);
    for (var d = 1; d <= daysIn; d++) {
      var key = monthKey + "-" + Store.pad(d);
      var log = Store.getDay(key);
      if (!log) continue;
      var painCount = (log.episodes || []).length;
      out.days.push({
        key: key,
        dayNum: d,
        weekday: Store.parseKey(key).getDay(),
        checkin: log.checkin || null,
        episodes: log.episodes || [],
        hasPain: painCount > 0
      });
      if (painCount > 0) out.painDays++;
      out.episodes = out.episodes.concat(log.episodes || []);
    }
    return out;
  }

  /* Análise estatística simples de um gatilho vs dias com dor. */
  function analyzeTrigger(triggerId, days) {
    var withT = 0, withTPain = 0, withoutT = 0, withoutTPain = 0;
    for (var i = 0; i < days.length; i++) {
      var day = days[i];
      if (!day.checkin) continue;
      var has = (day.checkin.triggers || []).indexOf(triggerId) >= 0;
      if (has) {
        withT++;
        if (day.hasPain) withTPain++;
      } else {
        withoutT++;
        if (day.hasPain) withoutTPain++;
      }
    }
    if (withT < MIN_SUPPORT || withoutT < MIN_SUPPORT) {
      return null; // dados insuficientes
    }
    var rateWith = withTPain / withT;
    var rateWithout = withoutTPain / withoutT;
    var lift = rateWithout > 0 ? rateWith / rateWithout : (rateWith > 0 ? 4 : 1);
    if (lift > 4) lift = 4;
    var level;
    if (lift >= 2) level = "forte";
    else if (lift >= 1.4) level = "provavel";
    else if (lift >= 1.1) level = "leve";
    else if (lift <= 0.75) level = "protetor";
    else level = "sem_relacao";
    return {
      id: triggerId,
      withT: withT,
      withTPain: withTPain,
      withoutT: withoutT,
      withoutTPain: withoutTPain,
      rateWith: rateWith,
      rateWithout: rateWithout,
      lift: lift,
      level: level
    };
  }

  function levelLabel(level) {
    switch (level) {
      case "forte": return "Ligação forte";
      case "provavel": return "Provável causa";
      case "leve": return "Ligação leve";
      case "protetor": return "Parece proteger";
      default: return "Sem ligação clara";
    }
  }

  function levelColor(level) {
    switch (level) {
      case "forte": return "#EF4444";
      case "provavel": return "#F97316";
      case "leve": return "#FDBA2D";
      case "protetor": return "#2ED3A7";
      default: return "#94A3B8";
    }
  }

  /* Todos os gatilhos avaliados, ordenados por força de ligação. */
  function triggerRanking(days) {
    var ids = [];
    var groups = CATALOG.triggerGroups;
    for (var g = 0; g < groups.length; g++) {
      for (var i = 0; i < groups[g].triggers.length; i++) {
        ids.push(groups[g].triggers[i].id);
      }
    }
    var ranked = [];
    var pending = [];
    for (var t = 0; t < ids.length; t++) {
      var res = analyzeTrigger(ids[t], days);
      if (res) ranked.push(res);
      else pending.push(ids[t]);
    }
    ranked.sort(function (a, b) {
      if (b.lift !== a.lift) return b.lift - a.lift;
      return b.withT - a.withT;
    });
    for (var r = 0; r < ranked.length; r++) {
      var found = CATALOG.findTrigger(ranked[r].id);
      ranked[r].label = found ? found.trigger.label : ranked[r].id;
      ranked[r].group = found ? found.group : null;
      ranked[r].levelLabel = levelLabel(ranked[r].level);
      ranked[r].levelColor = levelColor(ranked[r].level);
      ranked[r].percentWith = Math.round(ranked[r].rateWith * 100);
      ranked[r].percentWithout = Math.round(ranked[r].rateWithout * 100);
    }
    return { ranked: ranked, pending: pending };
  }

  /* Eficácia de cada alívio a partir dos episódios. */
  function reliefRanking(episodes) {
    var map = {};
    for (var i = 0; i < episodes.length; i++) {
      var ep = episodes[i];
      var list = ep.reliefs || [];
      for (var r = 0; r < list.length; r++) {
        var id = list[r];
        if (!map[id]) map[id] = { id: id, tried: 0, total: 0, partial: 0, none: 0 };
        map[id].tried++;
        if (ep.reliefResult === "total") map[id].total++;
        else if (ep.reliefResult === "parcial") map[id].partial++;
        else if (ep.reliefResult === "nenhum") map[id].none++;
      }
    }
    var items = [];
    Object.keys(map).forEach(function (id) {
      var m = map[id];
      var helped = m.total + m.partial * 0.5;
      var score = m.tried ? helped / m.tried : 0;
      var found = CATALOG.findRelief(id);
      items.push({
        id: id,
        label: found ? found.relief.label : id,
        group: found ? found.group : null,
        tried: m.tried,
        total: m.total,
        partial: m.partial,
        none: m.none,
        score: score,
        percentHelped: Math.round(((m.total + m.partial) / m.tried) * 100),
        percentTotal: Math.round((m.total / m.tried) * 100)
      });
    });
    items.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return b.tried - a.tried;
    });
    return items;
  }

  function distribution(items, valueFn) {
    var counts = {};
    items.forEach(function (it) {
      var v = valueFn(it);
      if (v === null || v === undefined) return;
      counts[v] = (counts[v] || 0) + 1;
    });
    return counts;
  }

  function weekdayStats(days) {
    var stats = [];
    for (var w = 0; w < 7; w++) {
      stats.push({ weekday: w, label: CATALOG.weekdayLabels[w], total: 0, pain: 0, intensitySum: 0, intensityN: 0 });
    }
    days.forEach(function (day) {
      var s = stats[day.weekday];
      s.total++;
      if (day.hasPain) s.pain++;
      day.episodes.forEach(function (ep) {
        s.intensitySum += ep.intensity || 0;
        s.intensityN++;
      });
    });
    stats.forEach(function (s) {
      s.avgIntensity = s.intensityN ? Math.round((s.intensitySum / s.intensityN) * 10) / 10 : 0;
      s.painRate = s.total ? s.pain / s.total : 0;
    });
    return stats;
  }

  function hourStats(episodes) {
    var buckets = [
      { label: "Madrugada", from: 0, to: 5, count: 0 },
      { label: "Manhã", from: 6, to: 11, count: 0 },
      { label: "Tarde", from: 12, to: 17, count: 0 },
      { label: "Noite", from: 18, to: 23, count: 0 }
    ];
    episodes.forEach(function (ep) {
      if (!ep.time) return;
      var h = Number(String(ep.time).split(":")[0]);
      for (var i = 0; i < buckets.length; i++) {
        if (h >= buckets[i].from && h <= buckets[i].to) {
          buckets[i].count++;
          break;
        }
      }
    });
    return buckets;
  }

  function countList(episodes, field, finder) {
    var map = {};
    episodes.forEach(function (ep) {
      (ep[field] || []).forEach(function (id) {
        map[id] = (map[id] || 0) + 1;
      });
    });
    return Object.keys(map)
      .map(function (id) {
        var found = finder(id);
        return {
          id: id,
          label: found ? (found.label || found.id) : id,
          group: found && found.group ? found.group : null,
          count: map[id]
        };
      })
      .sort(function (a, b) { return b.count - a.count; });
  }

  function symptomsRanking(episodes) {
    return countList(episodes, "symptoms", function (id) {
      var s = CATALOG.findSymptom(id);
      return { label: s.label };
    });
  }

  function locationsRanking(episodes) {
    return countList(episodes, "locations", function (id) {
      var l = CATALOG.findLocation(id);
      return { label: l.label };
    });
  }

  function avg(nums) {
    if (!nums.length) return 0;
    var sum = 0;
    for (var i = 0; i < nums.length; i++) sum += nums[i];
    return sum / nums.length;
  }

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  function buildSummary(collected) {
    var days = collected.days;
    var episodes = collected.episodes;
    var intensities = episodes.map(function (e) { return e.intensity || 0; });
    var durations = episodes.map(function (e) { return e.durationMin || 0; });
    var sleeps = [];
    var stresses = [];
    var loggedDays = 0;
    days.forEach(function (d) {
      if (d.checkin) {
        loggedDays++;
        if (typeof d.checkin.sleepHours === "number") sleeps.push(d.checkin.sleepHours);
        if (typeof d.checkin.stress === "number") stresses.push(d.checkin.stress);
      }
    });
    return {
      loggedDays: loggedDays,
      daysInMonth: days.length,
      painDays: collected.painDays,
      episodes: episodes.length,
      avgIntensity: intensities.length ? round1(avg(intensities)) : 0,
      maxIntensity: intensities.length ? Math.max.apply(null, intensities) : 0,
      totalMinutes: durations.reduce(function (a, b) { return a + b; }, 0),
      avgDuration: durations.length ? Math.round(avg(durations)) : 0,
      avgSleep: sleeps.length ? round1(avg(sleeps)) : 0,
      avgStress: stresses.length ? round1(avg(stresses)) : 0,
      painFreeDays: Math.max(0, days.length - collected.painDays)
    };
  }

  /* Frases-guia geradas a partir dos dados. */
  function buildNarrative(summary, triggers, reliefs, weekday, collected) {
    var lines = [];

    if (summary.episodes === 0) {
      lines.push("Nenhum episódio de dor registrado neste mês. Continue assim — dias sem dor também são dados importantes.");
      return lines;
    }

    lines.push(
      "Foram " + summary.episodes + (summary.episodes === 1 ? " episódio" : " episódios") +
      " de dor em " + summary.painDays + (summary.painDays === 1 ? " dia" : " dias") +
      ", com intensidade média de " + summary.avgIntensity + "/10."
    );

    var strong = triggers.ranked.filter(function (t) {
      return t.level === "forte" || t.level === "provavel";
    }).slice(0, 3);
    if (strong.length) {
      var parts = strong.map(function (t) {
        return t.label.toLowerCase() + " (dor em " + t.percentWith + "% dos dias com esse fator, contra " +
          t.percentWithout + "% sem ele)";
      });
      lines.push("Possíveis causas mais ligadas à dor: " + parts.join("; ") + ".");
    } else if (triggers.ranked.length === 0) {
      lines.push("Ainda faltam dados: marque os fatores do dia no check-in (mesmo nos dias sem dor) para descobrir possíveis causas.");
    } else {
      lines.push("Nenhum fator mostrou ligação forte com a dor ainda — continue registrando para aumentar a confiança.");
    }

    var goodReliefs = reliefs.filter(function (r) { return r.tried >= 2 && r.percentHelped >= 60; }).slice(0, 3);
    if (goodReliefs.length) {
      lines.push("O que mais ajudou: " + goodReliefs.map(function (r) {
        return r.label.toLowerCase() + " (aliviou " + r.percentHelped + "% das vezes)";
      }).join(", ") + ".");
    } else if (reliefs.length) {
      lines.push("Nenhum alívio se destacou ainda; tente anotar o que você fez e se melhorou em cada crise.");
    }

    if (weekday.some(function (w) { return w.total >= 2 && w.painRate >= 0.5; })) {
      var worst = weekday.slice().sort(function (a, b) { return b.painRate - a.painRate; })[0];
      if (worst.painRate >= 0.5 && worst.total >= 2) {
        lines.push(CATALOG.weekdayLabelsLong[worst.weekday] + " foi o dia com mais dor (" +
          Math.round(worst.painRate * 100) + "% dos registrados).");
      }
    }

    if (summary.avgSleep && summary.avgSleep < 7) {
      lines.push("Sua média de sono ficou em " + summary.avgSleep + "h — sono abaixo de 7h é um dos gatilhos mais comuns de enxaqueca.");
    }

    if (summary.maxIntensity >= 8) {
      lines.push("Houve crises muito fortes (intensidade " + summary.maxIntensity + "/10). Leve este relatório ao seu médico.");
    }

    return lines;
  }

  /* Análise principal de um mês. */
  function analyzeMonth(monthKey) {
    var collected = collectMonth(monthKey);
    var days = collected.days;
    var episodes = collected.episodes;
    var summary = buildSummary(collected);
    var triggers = triggerRanking(days);
    var reliefs = reliefRanking(episodes);
    var weekday = weekdayStats(days);
    var hours = hourStats(episodes);
    var symptoms = symptomsRanking(episodes);
    var locations = locationsRanking(episodes);
    var narrative = buildNarrative(summary, triggers, reliefs, weekday, collected);

    return {
      monthKey: monthKey,
      summary: summary,
      days: days,
      episodes: episodes,
      triggers: triggers,
      reliefs: reliefs,
      weekday: weekday,
      hours: hours,
      symptoms: symptoms,
      locations: locations,
      narrative: narrative
    };
  }

  /* Série dos últimos N meses (para tendência). */
  function trend(endMonthKey, span) {
    var result = [];
    var mk = endMonthKey;
    for (var i = 0; i < span; i++) {
      var a = analyzeMonth(mk);
      result.unshift({
        monthKey: mk,
        label: Store.monthNameShort(mk),
        painDays: a.summary.painDays,
        episodes: a.summary.episodes,
        avgIntensity: a.summary.avgIntensity
      });
      mk = Store.shiftMonth(mk, -1);
    }
    return result;
  }

  /* Comparação com o mês anterior. */
  function compareWithPrevious(monthKey) {
    var current = analyzeMonth(monthKey);
    var prevKey = Store.shiftMonth(monthKey, -1);
    var prev = analyzeMonth(prevKey);
    if (prev.summary.episodes === 0 && prev.summary.loggedDays === 0) {
      return { current: current, previous: null, prevKey: prevKey };
    }
    function delta(cur, old) {
      if (!old && old !== 0) return null;
      var d = Math.round((cur - old) * 10) / 10;
      return d;
    }
    return {
      current: current,
      previous: prev,
      prevKey: prevKey,
      deltas: {
        painDays: delta(current.summary.painDays, prev.summary.painDays),
        episodes: delta(current.summary.episodes, prev.summary.episodes),
        avgIntensity: delta(current.summary.avgIntensity, prev.summary.avgIntensity),
        avgSleep: delta(current.summary.avgSleep, prev.summary.avgSleep)
      }
    };
  }

  return {
    analyzeMonth: analyzeMonth,
    trend: trend,
    compareWithPrevious: compareWithPrevious,
    levelLabel: levelLabel,
    levelColor: levelColor,
    collectMonth: collectMonth
  };
})();
