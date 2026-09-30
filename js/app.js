/* Agenda da Dor - interface principal. */

var App = (function () {
  "use strict";

  var state = {
    view: "hoje",
    calMonth: null,
    patMonth: null,
    repMonth: null,
    selectedDay: null,
    editing: null /* { date, id|null } */
  };

  /* ---------------- utilidades ---------------- */

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function esc(text) {
    return Charts.esc(text);
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.hidden = true;
    }, 2600);
  }

  function openModal(id) {
    $all(".modal").forEach(function (m) {
      if (m.id !== "modal-onboarding") m.hidden = true;
    });
    var modal = document.getElementById(id);
    if (modal) modal.hidden = false;
  }

  function closeModal(id) {
    var modal = document.getElementById(id);
    if (modal && modal.id !== "modal-onboarding") modal.hidden = true;
  }

  function closeAllModals() {
    $all(".modal").forEach(function (m) {
      if (m.id !== "modal-onboarding") m.hidden = true;
    });
  }

  function confirmDialog(title, text) {
    return new Promise(function (resolve) {
      $("#confirmTitle").textContent = title;
      $("#confirmText").textContent = text;
      var btn = $("#confirmOkBtn");
      var onClick = function () {
        cleanup();
        resolve(true);
      };
      var onHidden = function (e) {
        if (e.target && e.target.id === "modal-confirm") {
          cleanup();
          resolve(false);
        }
      };
      function cleanup() {
        btn.removeEventListener("click", onClick);
        $("#modal-confirm").removeEventListener("click", onHidden);
      }
      btn.addEventListener("click", onClick);
      $("#modal-confirm").addEventListener("click", onHidden);
      openModal("modal-confirm");
    });
  }

  function formatRange(input) {
    var out = document.getElementById(input.getAttribute("data-out"));
    if (!out) return;
    var v = Number(input.value);
    var fmt = input.getAttribute("data-format");
    if (fmt === "h") out.textContent = String(v).replace(".", ",") + "h";
    else if (fmt === "x5") out.textContent = v + "/5";
    else if (fmt === "pain") {
      var info = CATALOG.intensityInfo(v);
      out.textContent = v + "/10 — " + info.label;
      out.style.color = info.color;
    } else out.textContent = String(v);
  }

  function bindRanges(root) {
    $all('input[type="range"][data-out]', root).forEach(function (input) {
      if (input.__bound) return;
      input.__bound = true;
      input.addEventListener("input", function () {
        formatRange(input);
      });
      formatRange(input);
    });
  }

  function checkedValues(container) {
    return $all('input[type="checkbox"]:checked', container).map(function (i) {
      return i.value;
    });
  }

  function setChecked(container, values) {
    $all('input[type="checkbox"]', container).forEach(function (input) {
      input.checked = values.indexOf(input.value) >= 0;
    });
  }

  function setRadio(form, name, value) {
    var el = form.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (el) el.checked = true;
  }

  function getRadio(form, name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }

  /* ---------------- builders de chips ---------------- */

  function triggerChipsHTML() {
    return CATALOG.triggerGroups.map(function (group) {
      var chips = group.triggers.map(function (t) {
        return '<label class="chip"><input type="checkbox" value="' + t.id + '" /><span>' +
          esc(t.label) + "</span></label>";
      }).join("");
      return '<div class="trigger-group">' +
        '<div class="trigger-group-head"><i class="group-dot" style="background:' + group.color + '"></i>' +
        esc(group.name) + "</div>" +
        '<div class="chip-row">' + chips + "</div></div>";
    }).join("");
  }

  function symptomChipsHTML() {
    return CATALOG.symptoms.map(function (s) {
      return '<label class="chip"><input type="checkbox" value="' + s.id + '" /><span>' +
        esc(s.label) + "</span></label>";
    }).join("");
  }

  function reliefChipsHTML() {
    return CATALOG.reliefGroups.map(function (group) {
      var chips = group.items.map(function (r) {
        return '<label class="chip"><input type="checkbox" value="' + r.id + '" /><span>' +
          esc(r.label) + "</span></label>";
      }).join("");
      return '<div class="trigger-group">' +
        '<div class="trigger-group-head"><i class="group-dot" style="background:' + group.color + '"></i>' +
        esc(group.name) + "</div>" +
        '<div class="chip-row">' + chips + "</div></div>";
    }).join("");
  }

  /* ---------------- navegação ---------------- */

  function switchView(view) {
    state.view = view;
    $all(".view").forEach(function (v) {
      v.classList.toggle("active", v.id === "view-" + view);
    });
    $all(".nav-item[data-view]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === view);
    });
    if (view === "hoje") renderHoje();
    if (view === "calendario") renderCalendar();
    if (view === "padroes") renderPatterns();
    if (view === "relatorio") renderReport();
    window.scrollTo(0, 0);
  }

  /* ---------------- HOJE ---------------- */

  var TIPS = [
    "Registre também os dias BONS. Sem dias sem dor, o app não consegue descobrir qual fator faz diferença.",
    "Marque os fatores do dia mesmo quando não doer: é a comparação com os dias sem dor que revela a causa.",
    "Água, sono e refeições em horário são os fatores mais fáceis de controlar — e entre os mais comuns de enxaqueca.",
    "Quando doer, anote logo o horário e a intensidade. Depois de passar, a memória engana um pouco.",
    "Se a dor passar de 8/10, durar muito tempo ou vier com visão alterada, avise um adulto e um médico.",
    "Telas por muito tempo e postura curvada tensionam o pescoço — e o pescoço tensionado provoca dor.",
    "Leve o relatório mensal na consulta: médicos decidem melhor com dados do que com memória."
  ];

  function renderHoje() {
    var today = Store.todayKey();
    var now = new Date();
    var name = Store.state.settings.name;

    $("#todayWeekday").textContent = CATALOG.weekdayLabelsLong[now.getDay()];
    $("#todayGreeting").textContent = name ? "Oi, " + name + "!" : "Oi!";
    $("#todayDate").textContent = Store.formatDay(today);

    var checkin = Store.getCheckin(today);
    var pill = $("#checkinPill");
    var summary = $("#checkinSummary");
    var tags = $("#checkinTags");
    var btn = $("#checkinBtn");

    if (checkin) {
      pill.textContent = "feito";
      pill.classList.add("ok");
      btn.textContent = "Editar check-in";
      summary.innerHTML = "Sono <strong>" + String(checkin.sleepHours).replace(".", ",") +
        "h</strong> · estresse <strong>" + checkin.stress + "/5</strong> · água <strong>" +
        checkin.hydration + " copos</strong>" +
        (checkin.notes ? "<br><em>" + esc(checkin.notes) + "</em>" : "");
      var list = (checkin.triggers || []).slice(0, 8).map(function (id) {
        var f = CATALOG.findTrigger(id);
        return '<span class="tag" style="background:' + (f ? f.group.color : "#7A5AF8") +
          '1A;color:' + (f ? f.group.color : "#7A5AF8") + '">' + esc(f ? f.trigger.label : id) + "</span>";
      });
      var more = (checkin.triggers || []).length > 8
        ? '<span class="tag" style="background:#EEEBFF;color:#6746F0">+' +
          ((checkin.triggers || []).length - 8) + "</span>"
        : "";
      tags.innerHTML = list.join("") + more;
      if (!(checkin.triggers || []).length) {
        tags.innerHTML = '<span class="muted small">Nenhum fator marcado hoje.</span>';
      }
    } else {
      pill.textContent = "pendente";
      pill.classList.remove("ok");
      btn.textContent = "Fazer check-in";
      summary.textContent =
        "Conte como foi o seu dia: sono, estresse, água e os fatores presentes. Leva 30 segundos!";
      tags.innerHTML = "";
    }

    var day = Store.getDay(today);
    var episodes = day ? day.episodes : [];
    $("#todayEpisodeCount").textContent = String(episodes.length);
    var wrap = $("#todayEpisodes");
    if (!episodes.length) {
      wrap.innerHTML = '<p class="empty">Nenhuma crise registrada hoje. Se doer, toque em "Registrar dor".</p>';
    } else {
      wrap.innerHTML = episodes.map(function (ep) {
        return episodeRowHTML(ep, today);
      }).join("");
    }

    var tipIndex = Math.floor(now.getTime() / 86400000) % TIPS.length;
    $("#dailyTip").textContent = TIPS[tipIndex];
  }

  function episodeRowHTML(ep, dateKey) {
    var info = CATALOG.intensityInfo(ep.intensity || 1);
    var pt = ep.painType ? CATALOG.findPainType(ep.painType) : null;
    var locs = (ep.locations || []).map(function (id) {
      return CATALOG.findLocation(id).label;
    }).slice(0, 3).join(", ");
    var reliefs = (ep.reliefs || []).length
      ? (ep.reliefs || []).map(function (id) {
          var f = CATALOG.findRelief(id);
          return f ? f.relief.label : id;
        }).join(", ") + " → " + reliefResultLabel(ep.reliefResult)
      : "sem tentativas registradas";
    return '<div class="episode" data-episode="' + ep.id + '" data-date="' + dateKey + '" role="button" tabindex="0">' +
      '<span class="episode-time">' + esc(ep.time || "--:--") + "</span>" +
      '<span class="episode-badge" style="background:' + info.color + '">' + (ep.intensity || 0) + "/10</span>" +
      '<span class="episode-info"><strong>' + esc(info.label) +
      (pt ? " · " + esc(pt.label) : "") +
      (ep.durationMin ? " · " + ep.durationMin + " min" : "") + "</strong>" +
      "<span>" + esc(locs || "local não marcado") + " · " + esc(reliefs) + "</span></span>" +
      "</div>";
  }

  function reliefResultLabel(value) {
    if (value === "total") return "passou tudo";
    if (value === "parcial") return "melhorou um pouco";
    if (value === "nenhum") return "não melhorou";
    return "não tentou nada";
  }

  /* ---------------- CHECK-IN ---------------- */

  function openCheckin(dateKey) {
    var key = dateKey || Store.todayKey();
    state.editing = { date: key, id: null, kind: "checkin" };
    var form = $("#checkinForm");
    var existing = Store.getCheckin(key);

    $("#checkinDateLabel").textContent = Store.formatDay(key);

    form.reset();
    if (existing) {
      form.sleepHours.value = existing.sleepHours != null ? existing.sleepHours : 7.5;
      setRadio(form, "sleepQuality", String(existing.sleepQuality || 3));
      form.stress.value = existing.stress != null ? existing.stress : 2;
      form.hydration.value = existing.hydration != null ? existing.hydration : 5;
      form.screenHours.value = existing.screenHours != null ? existing.screenHours : 2;
      setRadio(form, "mood", String(existing.mood || 3));
      setRadio(form, "cycle", existing.cycle || "none");
      form.mealsOk.checked = existing.mealsOk !== false;
      form.notes.value = existing.notes || "";
      setChecked($("#checkinTriggers"), existing.triggers || []);
    } else {
      setChecked($("#checkinTriggers"), []);
    }
    bindRanges(form);
    openModal("modal-checkin");
  }

  function submitCheckin(e) {
    e.preventDefault();
    var form = e.target;
    var key = state.editing && state.editing.date ? state.editing.date : Store.todayKey();
    Store.setCheckin(key, {
      sleepHours: Number(form.sleepHours.value),
      sleepQuality: Number(getRadio(form, "sleepQuality") || 3),
      stress: Number(form.stress.value),
      hydration: Number(form.hydration.value),
      screenHours: Number(form.screenHours.value),
      mood: Number(getRadio(form, "mood") || 3),
      cycle: getRadio(form, "cycle") || "none",
      mealsOk: form.mealsOk.checked,
      triggers: checkedValues($("#checkinTriggers")),
      notes: form.notes.value.trim()
    });
    closeModal("modal-checkin");
    toast("Check-in salvo! Obrigada pelos dados.");
    refreshCurrent();
  }

  /* ---------------- EPISÓDIO (REGISTRAR DOR) ---------------- */

  function openEpisode(dateKey, episodeId) {
    var key = dateKey || Store.todayKey();
    state.editing = { date: key, id: episodeId || null, kind: "episode" };
    var form = $("#episodeForm");
    form.reset();

    var existing = null;
    if (episodeId) {
      var day = Store.getDay(key);
      if (day) {
        day.episodes.forEach(function (ep) {
          if (ep.id === episodeId) existing = ep;
        });
      }
    }

    $("#episodeDateLabel").textContent = Store.formatDay(key);
    $("#episodeTitle").textContent = existing ? "Editar crise" : "Registrar dor";
    $("#deleteEpisodeBtn").hidden = !existing;

    if (existing) {
      form.id.value = existing.id;
      form.time.value = existing.time || "12:00";
      form.durationMin.value = String(existing.durationMin || 60);
      form.intensity.value = String(existing.intensity || 5);
      setRadio(form, "painType", existing.painType || "");
      setRadio(form, "activity", existing.activity || "");
      $all('input[name="locations"]', form).forEach(function (i) {
        i.checked = (existing.locations || []).indexOf(i.value) >= 0;
      });
      setChecked($("#episodeSymptoms"), existing.symptoms || []);
      setChecked($("#episodeReliefs"), existing.reliefs || []);
      setRadio(form, "reliefResult", existing.reliefResult || "nenhum");
      form.notes.value = existing.notes || "";
    } else {
      form.id.value = "";
      var now = new Date();
      form.time.value = Store.pad(now.getHours()) + ":" + Store.pad(now.getMinutes());
      form.durationMin.value = "60";
      form.intensity.value = "5";
      $all('input[name="locations"]', form).forEach(function (i) { i.checked = false; });
      setChecked($("#episodeSymptoms"), []);
      setChecked($("#episodeReliefs"), []);
      setRadio(form, "reliefResult", "nenhum");
      form.notes.value = "";
    }

    toggleReliefResult();
    bindRanges(form);
    formatRange(form.intensity);
    openModal("modal-episode");
  }

  function toggleReliefResult() {
    var form = $("#episodeForm");
    var any = checkedValues($("#episodeReliefs")).length > 0;
    $("#reliefResultField").hidden = !any;
  }

  function submitEpisode(e) {
    e.preventDefault();
    var form = e.target;
    var key = state.editing.date;
    var payload = {
      time: form.time.value || "12:00",
      durationMin: Number(form.durationMin.value),
      intensity: Number(form.intensity.value),
      painType: getRadio(form, "painType"),
      activity: getRadio(form, "activity"),
      locations: $all('input[name="locations"]:checked', form).map(function (i) { return i.value; }),
      symptoms: checkedValues($("#episodeSymptoms")),
      reliefs: checkedValues($("#episodeReliefs")),
      reliefResult: checkedValues($("#episodeReliefs")).length
        ? getRadio(form, "reliefResult")
        : "na",
      notes: form.notes.value.trim()
    };

    if (state.editing && state.editing.id) {
      Store.updateEpisode(key, state.editing.id, payload);
      toast("Crise atualizada.");
    } else {
      Store.addEpisode(key, payload);
      toast("Crise registrada. Melhoras!");
    }
    closeModal("modal-episode");
    refreshCurrent();
  }

  function deleteEpisode() {
    if (!state.editing || !state.editing.id) return;
    confirmDialog("Excluir esta crise?", "O registro será removido do seu histórico.").then(function (ok) {
      if (!ok) return;
      Store.removeEpisode(state.editing.date, state.editing.id);
      closeModal("modal-episode");
      toast("Crise excluída.");
      refreshCurrent();
    });
  }

  /* ---------------- CALENDÁRIO ---------------- */

  function currentMonthKey() {
    return Store.monthKeyOf(Store.todayKey());
  }

  function monthLabel(monthKey) {
    var name = Store.monthName(monthKey);
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  function shiftMonthUI(which, delta) {
    var key = state[which + "Month"];
    var next = Store.shiftMonth(key, delta);
    if (next > currentMonthKey()) {
      toast("Ainda não chegamos nesse mês.");
      return;
    }
    state[which + "Month"] = next;
    if (which === "cal") renderCalendar();
    if (which === "pat") renderPatterns();
    if (which === "rep") renderReport();
  }

  function renderCalendar() {
    var monthKey = state.calMonth;
    $("#calMonthLabel").textContent = monthLabel(monthKey);

    var year = Number(monthKey.slice(0, 4));
    var month = Number(monthKey.slice(5, 7));
    var firstDow = new Date(year, month - 1, 1).getDay();
    var daysIn = Store.daysInMonth(monthKey);
    var today = Store.todayKey();
    var html = "";

    for (var b = 0; b < firstDow; b++) {
      html += '<div class="cal-day empty"></div>';
    }

    for (var d = 1; d <= daysIn; d++) {
      var key = monthKey + "-" + Store.pad(d);
      var log = Store.getDay(key);
      var classes = ["cal-day"];
      var style = "";
      var inner = '<span class="day-num">' + d + "</span>";

      var maxI = 0;
      if (log) {
        (log.episodes || []).forEach(function (ep) {
          if ((ep.intensity || 0) > maxI) maxI = ep.intensity;
        });
      }

      if (maxI > 0) {
        classes.push("pain");
        style = ' style="background:' + CATALOG.intensityInfo(maxI).color + '"';
        var count = (log.episodes || []).length;
        if (count > 1) inner += '<span class="ep-count">' + count + "x</span>";
      } else if (log && log.checkin) {
        classes.push("has-checkin");
      }
      if (key === today) classes.push("is-today");
      if (key > today) classes.push("future");

      html += '<button type="button" class="' + classes.join(" ") + '" data-day="' + key + '"' +
        style + " aria-label=\"" + Store.formatDay(key) + '">' + inner + "</button>";
    }

    $("#calGrid").innerHTML = html;

    var analysis = Insights.analyzeMonth(monthKey);
    var s = analysis.summary;
    $("#calStats").innerHTML =
      statCard("Dias com dor", String(s.painDays), "de " + daysIn, true) +
      statCard("Crises", String(s.episodes), s.painDays ? "média " +
        (Math.round((s.episodes / Math.max(1, s.painDays)) * 10) / 10) + "/dia afetado" : "—") +
      statCard("Intensidade média", s.avgIntensity ? s.avgIntensity + "/10" : "—",
        "pico " + (s.maxIntensity || "—")) +
      statCard("Check-ins", String(s.loggedDays), "dias preenchidos");
  }

  function statCard(label, value, hint, accent) {
    return '<div class="stat-card' + (accent ? " accent" : "") + '">' +
      '<div class="stat-value">' + esc(value) + "</div>" +
      '<div class="stat-label">' + esc(label) + "</div>" +
      (hint ? '<div class="stat-hint">' + esc(hint) + "</div>" : "") +
      "</div>";
  }

  /* ---------------- MODAL DO DIA ---------------- */

  function openDayModal(key) {
    state.selectedDay = key;
    $("#dayModalWeekday").textContent = CATALOG.weekdayLabelsLong[Store.parseKey(key).getDay()];
    $("#dayModalTitle").textContent = Store.formatDay(key);

    var log = Store.getDay(key);
    var body = $("#dayModalBody");
    var html = "";

    if (log && log.checkin) {
      var c = log.checkin;
      var factors = (c.triggers || []).map(function (id) {
        var f = CATALOG.findTrigger(id);
        return esc(f ? f.trigger.label : id);
      }).join(", ");
      html += '<div class="day-checkin"><strong>Check-in:</strong> sono ' +
        String(c.sleepHours).replace(".", ",") + "h · estresse " + c.stress +
        "/5 · água " + c.hydration + " copos · humor " + c.mood + "/5" +
        (c.mealsOk === false ? " · pulou refeição" : "") +
        "<br><strong>Fatores:</strong> " + (factors || "nenhum marcado") +
        (c.notes ? "<br><em>" + esc(c.notes) + "</em>" : "") + "</div>";
    } else {
      html += '<div class="day-checkin">Sem check-in neste dia. ' +
        'Check-ins ajudam a descobrir possíveis causas — marque "Fazer check-in" abaixo.</div>';
    }

    var episodes = log ? log.episodes : [];
    if (episodes.length) {
      html += '<div class="episode-list">' + episodes.map(function (ep) {
        return episodeRowHTML(ep, key);
      }).join("") + "</div>";
    } else {
      html += '<p class="empty">Nenhuma crise registrada neste dia.</p>';
    }

    body.innerHTML = html;
    openModal("modal-day");
  }

  /* ---------------- PADRÕES ---------------- */

  function emptyPatternsHTML() {
    return '<div class="card">' +
      '<div class="card-head"><h2>Ainda não há dados</h2></div>' +
      '<p class="muted">Para mapear causas e benefícios o app precisa de registros: ' +
      'faça o check-in de pelo menos alguns dias (mesmo sem dor) e registre as crises. ' +
      'Depois de ~1 semana os gráficos aparecem aqui.</p>' +
      '<div class="card-actions">' +
      '<button class="btn btn-primary" data-action="checkin" type="button">Fazer check-in</button>' +
      '<button class="btn btn-soft" data-action="new-episode" type="button">Registrar dor</button>' +
      '<button class="btn btn-ghost" id="sampleFromPatterns" type="button">Ver com dados de exemplo</button>' +
      "</div></div>";
  }

  function renderPatterns() {
    $("#patMonthLabel").textContent = monthLabel(state.patMonth);
    var analysis = Insights.analyzeMonth(state.patMonth);
    var s = analysis.summary;
    var body = $("#patternsBody");

    if (!s.loggedDays && !s.episodes) {
      body.innerHTML = emptyPatternsHTML();
      return;
    }

    var ranked = analysis.triggers.ranked;
    var reliefs = analysis.reliefs.filter(function (r) { return r.tried > 0; });
    var html = "";

    html += '<div class="card"><div class="card-head"><h2>Leitura do mês</h2>' +
      '<span class="pill pill-ghost">' + s.loggedDays + " dias com check-in</span></div>" +
      '<ul class="narrative-list">' +
      analysis.narrative.map(function (line) { return "<li>" + esc(line) + "</li>"; }).join("") +
      "</ul></div>";

    /* Possíveis causas */
    html += '<div class="card"><div class="card-head"><h2>Possíveis causas</h2>' +
      '<span class="pill pill-ghost">' + ranked.length + " analisados</span></div>" +
      '<p class="muted">Compare: em quantos dias <strong>com</strong> o fator houve dor, versus dias ' +
      "<strong>sem</strong> o fator. Diferença grande = suspeita de gatilho (correlação, não diagnóstico).</p>";
    if (ranked.length) {
      html += Charts.hBars(
        ranked.slice(0, 8).map(function (t) {
          return { label: t.label, value: t.percentWith, color: t.levelColor, levelColor: t.levelColor };
        }),
        {
          labelW: 250,
          barMax: 100,
          colorFn: function (item) { return item.color; },
          textFn: function (item) { return item.value + "% com dor"; }
        }
      );
      html += Report.triggerRows(ranked, 10);
    } else {
      html += '<p class="muted">Dados insuficientes ainda. Marque os fatores de cada dia no check-in por pelo menos 1 semana — inclusive dias sem dor.</p>';
    }
    if (analysis.triggers.pending.length) {
      html += '<p class="muted small" style="margin-top:8px">Poucos dados para: ' +
        analysis.triggers.pending.slice(0, 14).map(function (id) {
          var f = CATALOG.findTrigger(id);
          return esc(f ? f.trigger.label : id);
        }).join(", ") + ".</p>";
    }
    html += "</div>";

    /* Benefícios */
    html += '<div class="card"><div class="card-head"><h2>O que mais ajudou</h2>' +
      '<span class="pill pill-ghost">' + reliefs.length + " tentativas</span></div>" +
      '<p class="muted">Cada tentativa de alívio registrada nas crises, com o resultado: passou tudo, melhorou um pouco ou não melhorou.</p>';
    if (reliefs.length) {
      html += Charts.hBars(
        reliefs.slice(0, 8).map(function (r) {
          return { label: r.label, value: r.percentHelped, color: "#2ED3A7" };
        }),
        {
          labelW: 250,
          barMax: 100,
          colorFn: function () { return "#2ED3A7"; },
          textFn: function (item) { return item.value + "% ajudou"; }
        }
      );
      html += Report.reliefTable(reliefs, 10);
    } else {
      html += '<p class="muted">Registre o que você tentou ao aliviar a crise (compressa, água, remédio, dormir...) para descobrir o que funciona para você.</p>';
    }
    html += "</div>";

    /* Padrões */
    html += '<div class="card"><div class="card-head"><h2>Quando a dor aparece</h2></div>' +
      '<div class="report-cols">' +
      "<div><h4>Por dia da semana</h4>" + Charts.weekBars(analysis.weekday) +
      '<div class="legend-inline"><span><i style="background:#7A5AF8"></i>dias com dor</span>' +
      '<span><i style="background:#E4E0FA"></i>dias registrados</span></div></div>' +
      "<div><h4>Horário de início</h4>" + Charts.hourBars(analysis.hours) + "</div>" +
      "</div>" +
      '<div class="report-cols" style="margin-top:18px">' +
      "<div><h4>Sintomas mais frequentes</h4>" +
      (analysis.symptoms.length
        ? Charts.hBars(analysis.symptoms.slice(0, 6).map(function (it) {
            return { label: it.label, value: it.count };
          }), { labelW: 240, barMax: analysis.symptoms[0].count, colorFn: function () { return "#0EA5E9"; }, textFn: function (i) { return i.value + "x"; } })
        : '<p class="muted">Nenhum sintoma registrado.</p>') +
      "</div>" +
      "<div><h4>Locais da dor</h4>" +
      (analysis.locations.length
        ? Charts.hBars(analysis.locations.slice(0, 6).map(function (it) {
            return { label: it.label, value: it.count };
          }), { labelW: 240, barMax: analysis.locations[0].count, colorFn: function () { return "#A855F7"; }, textFn: function (i) { return i.value + "x"; } })
        : '<p class="muted">Nenhum local registrado.</p>') +
      "</div></div>";

    /* Tipo de dor e atividade no início da crise */
    html += '<div class="card"><div class="card-head"><h2>Tipo de dor e o que estava fazendo</h2></div>' +
      '<div class="report-cols">' +
      "<div><h4>Tipo de dor</h4>" +
      (analysis.painTypes.total
        ? Charts.hBars(analysis.painTypes.items.map(function (it) {
            return { label: it.label, value: it.percent, count: it.count };
          }), {
            labelW: 180,
            barMax: 100,
            colorFn: function () { return "#F97316"; },
            textFn: function (i) { return i.value + "% (" + i.count + "x)"; }
          })
        : '<p class="muted">Nenhum tipo de dor registrado. Marque no "Registrar dor".</p>') +
      "</div>" +
      "<div><h4>No momento em que começou</h4>" +
      (analysis.activities.total
        ? Charts.hBars(analysis.activities.items.slice(0, 7).map(function (it) {
            return { label: it.label, value: it.percent, count: it.count };
          }), {
            labelW: 220,
            barMax: 100,
            colorFn: function () { return "#EC4899"; },
            textFn: function (i) { return i.value + "% (" + i.count + "x)"; }
          })
        : '<p class="muted">Nada registrado ainda.</p>') +
      "</div></div></div>";

    /* Evolução */
    var trend = Insights.trend(state.patMonth, 6);
    html += '<div class="card"><div class="card-head"><h2>Evolução</h2></div>' +
      Charts.trendBars(trend) +
      '<div class="legend-inline"><span><i style="background:#7A5AF8"></i>crises por mês</span>' +
      "<span>texto = intensidade média</span></div></div>";

    body.innerHTML = html;
  }

  /* ---------------- RELATÓRIO ---------------- */

  function renderReport() {
    $("#repMonthLabel").textContent = monthLabel(state.repMonth);
    $("#reportPreview").innerHTML = Report.buildHTML(state.repMonth);
    bindReportNote();
  }

  function bindReportNote() {
    var noteEl = document.getElementById("reportNote");
    if (!noteEl) return;
    noteEl.value = Store.getMonthNote(state.repMonth);
    noteEl.setAttribute("data-month", state.repMonth);
    if (noteEl.__bound) return;
    noteEl.__bound = true;
    var timer = null;
    var save = function () {
      var month = noteEl.getAttribute("data-month") || state.repMonth;
      Store.setMonthNote(month, noteEl.value.trim());
      var pill = document.getElementById("reportNotePill");
      if (pill) {
        pill.textContent = "salvo";
        setTimeout(function () { pill.textContent = "vai para o PDF"; }, 1500);
      }
      if (month === state.repMonth) {
        $("#reportPreview").innerHTML = Report.buildHTML(state.repMonth);
      }
    };
    noteEl.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(save, 700);
    });
    noteEl.addEventListener("change", save);
  }

  function exportPDF() {
    var btn = $("#exportPdfBtn");
    btn.disabled = true;
    Report.exportPDF(state.repMonth, null, function () {
      btn.disabled = false;
      toast('Se escolher "Salvar como PDF", o arquivo fica salvo no seu dispositivo.');
    });
  }

  /* ---------------- AJUSTES ---------------- */

  function openSettings() {
    $("#settingsName").value = Store.state.settings.name || "";
    openModal("modal-settings");
  }

  function downloadFile(filename, text, mime) {
    var blob = new Blob([text], { type: mime || "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function wireSettings() {
    $("#saveSettingsBtn").addEventListener("click", function () {
      Store.state.settings.name = $("#settingsName").value.trim();
      Store.save();
      closeModal("modal-settings");
      toast("Preferências salvas.");
      refreshCurrent();
    });

    $("#exportDataBtn").addEventListener("click", function () {
      downloadFile("agenda-da-dor-backup-" + Store.todayKey() + ".json", Store.exportJSON());
      toast("Backup baixado.");
    });

    $("#importDataBtn").addEventListener("click", function () {
      $("#importFile").click();
    });

    $("#importFile").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          Store.importJSON(String(reader.result));
          closeModal("modal-settings");
          toast("Backup importado!");
          refreshCurrent();
        } catch (err) {
          toast("Não consegui ler esse arquivo.");
        }
        e.target.value = "";
      };
      reader.readAsText(file);
    });

    $("#sampleDataBtn").addEventListener("click", function () {
      confirmDialog("Carregar dados de exemplo?",
        "Isso substitui os dados atuais por 40 dias simulados, ótimo para conhecer o app.")
        .then(function (ok) {
          if (!ok) return;
          Store.loadSampleData();
          closeModal("modal-settings");
          toast("Dados de exemplo carregados.");
          refreshCurrent();
        });
    });

    $("#wipeDataBtn").addEventListener("click", function () {
      confirmDialog("Apagar todos os dados?",
        "Check-ins, crises e histórico serão apagados deste dispositivo. Esta ação não pode ser desfeita.")
        .then(function (ok) {
          if (!ok) return;
          Store.wipe();
          closeModal("modal-settings");
          toast("Dados apagados.");
          document.getElementById("modal-onboarding").hidden = false;
          $("#obName").value = "";
        });
    });
  }

  /* ---------------- FLUXO GERAL ---------------- */

  function refreshCurrent() {
    if (state.view === "hoje") renderHoje();
    if (state.view === "calendario") renderCalendar();
    if (state.view === "padroes") renderPatterns();
    if (state.view === "relatorio") renderReport();
  }

  function handleAction(action, el) {
    switch (action) {
      case "settings": openSettings(); break;
      case "checkin": openCheckin(Store.todayKey()); break;
      case "checkin-from-day": openCheckin(state.selectedDay); break;
      case "new-episode": openEpisode(Store.todayKey()); break;
      case "new-episode-from-day": openEpisode(state.selectedDay); break;
      case "cal-prev": shiftMonthUI("cal", -1); break;
      case "cal-next": shiftMonthUI("cal", 1); break;
      case "pat-prev": shiftMonthUI("pat", -1); break;
      case "pat-next": shiftMonthUI("pat", 1); break;
      case "rep-prev": shiftMonthUI("rep", -1); break;
      case "rep-next": shiftMonthUI("rep", 1); break;
      case "export-pdf": exportPDF(); break;
      default: break;
    }
  }

  function wireEvents() {
    document.addEventListener("click", function (e) {
      var viewBtn = e.target.closest("[data-view]");
      if (viewBtn) {
        switchView(viewBtn.getAttribute("data-view"));
        return;
      }

      var closeBtn = e.target.closest("[data-close]");
      if (closeBtn) {
        var modal = closeBtn.closest(".modal");
        if (modal) modal.hidden = true;
        return;
      }

      var actionBtn = e.target.closest("[data-action]");
      if (actionBtn) {
        handleAction(actionBtn.getAttribute("data-action"), actionBtn);
        return;
      }

      var dayBtn = e.target.closest("[data-day]");
      if (dayBtn) {
        openDayModal(dayBtn.getAttribute("data-day"));
        return;
      }

      var epRow = e.target.closest("[data-episode]");
      if (epRow) {
        openEpisode(epRow.getAttribute("data-date"), epRow.getAttribute("data-episode"));
        return;
      }

      if (e.target.classList && e.target.classList.contains("modal") &&
          e.target.id !== "modal-onboarding") {
        e.target.hidden = true;
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        $all(".modal").forEach(function (m) {
          if (m.id !== "modal-onboarding" && !m.hidden) m.hidden = true;
        });
      }
    });

    document.addEventListener("change", function (e) {
      if (e.target.closest("#episodeReliefs")) toggleReliefResult();
    });

    $("#onboardingForm").addEventListener("submit", function (e) {
      e.preventDefault();
      Store.state.settings.name = $("#obName").value.trim();
      Store.state.settings.onboarded = true;
      if (!Store.state.settings.createdAt) {
        Store.state.settings.createdAt = new Date().toISOString();
      }
      Store.save();
      document.getElementById("modal-onboarding").hidden = true;
      renderHoje();
      toast("Bem-vinda! Comece pelo check-in de hoje.");
    });

    $("#checkinForm").addEventListener("submit", submitCheckin);
    $("#episodeForm").addEventListener("submit", submitEpisode);

    $("#deleteEpisodeBtn").addEventListener("click", deleteEpisode);

    $("#deleteDayBtn").addEventListener("click", function () {
      if (!state.selectedDay) return;
      confirmDialog("Apagar este dia?", "O check-in e as crises deste dia serão removidos.")
        .then(function (ok) {
          if (!ok) return;
          Store.removeDay(state.selectedDay);
          closeModal("modal-day");
          toast("Dia apagado.");
          refreshCurrent();
        });
    });

    document.addEventListener("click", function (e) {
      if (e.target.id === "sampleFromPatterns") {
        confirmDialog("Carregar dados de exemplo?",
          "Isso substitui os dados atuais por 40 dias simulados, ótimo para conhecer o app.")
          .then(function (ok) {
            if (!ok) return;
            Store.loadSampleData();
            toast("Dados de exemplo carregados.");
            refreshCurrent();
          });
      }
    });
  }

  function init() {
    Store.load();

    var month = currentMonthKey();
    state.calMonth = month;
    state.patMonth = month;
    state.repMonth = month;

    $("#checkinTriggers").innerHTML = triggerChipsHTML();
    $("#episodeSymptoms").innerHTML = symptomChipsHTML();
    $("#episodeReliefs").innerHTML = reliefChipsHTML();

    bindRanges(document);
    wireEvents();
    wireSettings();

    if (!Store.state.settings.onboarded) {
      document.getElementById("modal-onboarding").hidden = false;
    }
    renderHoje();
  }


  return {
    init: init,
    state: state
  };
})();

/* Inicializacao */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () { App.init(); });
} else {
  App.init();
}
