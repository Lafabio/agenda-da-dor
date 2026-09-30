/* Agenda da Dor - persistência local (localStorage) e utilidades de data. */

var Store = (function () {
  "use strict";

  var KEY = "agendaDaDor.v1";

  var state = {
    settings: {
      name: "",
      onboarded: false,
      createdAt: null
    },
    logs: {}
  };

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function toKey(date) {
    if (typeof date === "string") return date.slice(0, 10);
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function todayKey() {
    return toKey(new Date());
  }

  function parseKey(key) {
    var parts = key.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function monthKeyOf(key) {
    return key.slice(0, 7);
  }

  function shiftMonth(monthKey, delta) {
    var parts = monthKey.split("-");
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1 + delta, 1);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1);
  }

  function daysInMonth(monthKey) {
    var parts = monthKey.split("-");
    return new Date(Number(parts[0]), Number(parts[1]), 0).getDate();
  }

  function monthName(monthKey) {
    var parts = monthKey.split("-");
    return CATALOG.monthLabels[Number(parts[1]) - 1] + " de " + parts[0];
  }

  function monthNameShort(monthKey) {
    var parts = monthKey.split("-");
    return CATALOG.monthLabelsShort[Number(parts[1]) - 1] + "/" + parts[0].slice(2);
  }

  function formatDay(key) {
    var d = parseKey(key);
    return CATALOG.weekdayLabelsLong[d.getDay()] + ", " + d.getDate() + " de " +
      CATALOG.monthLabels[d.getMonth()];
  }

  function formatDayShort(key) {
    var d = parseKey(key);
    return pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
  }

  function formatDateTime(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + " às " +
      pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return false;
      state.settings = Object.assign(
        { name: "", onboarded: false, createdAt: null },
        data.settings || {}
      );
      state.logs = data.logs && typeof data.logs === "object" ? data.logs : {};
      return true;
    } catch (err) {
      console.warn("Falha ao carregar dados:", err);
      return false;
    }
  }

  function save() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      console.warn("Falha ao salvar dados:", err);
      return false;
    }
  }

  function ensureDay(key) {
    if (!state.logs[key]) {
      state.logs[key] = {
        date: key,
        checkin: null,
        episodes: []
      };
    }
    if (!state.logs[key].episodes) state.logs[key].episodes = [];
    return state.logs[key];
  }

  function getDay(key) {
    return state.logs[key] || null;
  }

  function getCheckin(key) {
    var day = state.logs[key];
    return day ? day.checkin : null;
  }

  function setCheckin(key, checkin) {
    var day = ensureDay(key);
    day.checkin = Object.assign({ date: key }, checkin);
    if (!day.checkin.triggers) day.checkin.triggers = [];
    save();
    return day.checkin;
  }

  function addEpisode(key, episode) {
    var day = ensureDay(key);
    episode.id = "ep_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    if (!episode.createdAt) episode.createdAt = new Date().toISOString();
    day.episodes.push(episode);
    day.episodes.sort(function (a, b) {
      return String(a.time || "").localeCompare(String(b.time || ""));
    });
    save();
    return episode;
  }

  function updateEpisode(key, id, patch) {
    var day = state.logs[key];
    if (!day) return null;
    for (var i = 0; i < day.episodes.length; i++) {
      if (day.episodes[i].id === id) {
        day.episodes[i] = Object.assign(day.episodes[i], patch);
        save();
        return day.episodes[i];
      }
    }
    return null;
  }

  function removeEpisode(key, id) {
    var day = state.logs[key];
    if (!day) return false;
    var before = day.episodes.length;
    day.episodes = day.episodes.filter(function (ep) {
      return ep.id !== id;
    });
    if (day.episodes.length === 0 && !day.checkin) delete state.logs[key];
    save();
    return day.episodes.length < before;
  }

  function removeDay(key) {
    delete state.logs[key];
    save();
  }

  function sortedDayKeys() {
    return Object.keys(state.logs).sort();
  }

  function hasAnyData() {
    return sortedDayKeys().length > 0;
  }

  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(text) {
    var data = JSON.parse(text);
    if (!data || typeof data !== "object" || !data.logs) {
      throw new Error("Arquivo inválido: não parece ser um backup do Agenda da Dor.");
    }
    state.settings = Object.assign(
      { name: "", onboarded: false, createdAt: null },
      data.settings || {}
    );
    state.logs = data.logs;
    save();
    return true;
  }

  function wipe() {
    state.settings = { name: "", onboarded: false, createdAt: null };
    state.logs = {};
    try {
      window.localStorage.removeItem(KEY);
    } catch (err) { /* ignora */ }
    save();
  }

  function randomFrom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function chance(p) {
    return Math.random() < p;
  }

  /* Gera 40 dias de dados simulados para demonstração do mapeamento. */
  function loadSampleData() {
    var now = new Date();
    state.logs = {};
    for (var back = 39; back >= 0; back--) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
      var key = toKey(d);
      var dow = d.getDay();
      var triggers = [];
      var sleep = 6.2 + Math.random() * 3;
      if (sleep < 7) triggers.push("sono_pouco");
      if (chance(0.35)) triggers.push("tela");
      if (chance(0.3)) triggers.push("estresse");
      if (chance(0.25) && dow >= 1 && dow <= 5) triggers.push("evento_grande");
      if (chance(0.22)) triggers.push("fome");
      if (chance(0.18)) triggers.push("desidratacao");
      if (chance(0.2)) triggers.push("postura");
      if (chance(0.15)) triggers.push("tensao");
      if (chance(0.12)) triggers.push("cafeina");
      if (chance(0.15)) triggers.push("luz");
      if (chance(0.1)) triggers.push("clima");
      if (chance(0.14)) triggers.push("sedentario");
      if (chance(0.16)) triggers.push("cansaco");

      var painScore = 0;
      if (triggers.indexOf("sono_pouco") >= 0) painScore += 0.38;
      if (triggers.indexOf("estresse") >= 0) painScore += 0.3;
      if (triggers.indexOf("evento_grande") >= 0) painScore += 0.26;
      if (triggers.indexOf("fome") >= 0) painScore += 0.2;
      if (triggers.indexOf("desidratacao") >= 0) painScore += 0.16;
      if (triggers.indexOf("tela") >= 0) painScore += 0.1;
      if (triggers.indexOf("tensao") >= 0) painScore += 0.12;
      if (sleep >= 7.5) painScore -= 0.12;

      var hasPain = chance(Math.min(0.85, painScore));

      var checkin = {
        date: key,
        sleepHours: Math.round(sleep * 10) / 10,
        sleepQuality: sleep >= 7.5 ? 4 : sleep >= 6.5 ? 3 : 2,
        stress: triggers.indexOf("estresse") >= 0 ? 4 : 2,
        hydration: triggers.indexOf("desidratacao") >= 0 ? 2 : 5,
        mealsOk: triggers.indexOf("fome") < 0,
        screenHours: triggers.indexOf("tela") >= 0 ? 5 : 2,
        mood: hasPain ? 3 : 4,
        cycle: "none",
        triggers: triggers,
        notes: ""
      };

      var episodes = [];
      if (hasPain) {
        var count = chance(0.25) ? 2 : 1;
        for (var e = 0; e < count; e++) {
          var intensity = 4 + Math.floor(Math.random() * 6);
          if (triggers.indexOf("sono_pouco") >= 0) intensity = Math.min(10, intensity + 1);
          var reliefs = [];
          if (chance(0.8)) reliefs.push("compressa_fria");
          if (chance(0.7)) reliefs.push("remedio");
          if (chance(0.5)) reliefs.push("dormir");
          if (chance(0.4)) reliefs.push("agua");
          if (chance(0.35)) reliefs.push("pausa_tela");
          var helped = intensity <= 5 ? chance(0.7) : chance(0.45);
          episodes.push({
            id: "ep_sample_" + key + "_" + e,
            time: pad(9 + Math.floor(Math.random() * 11)) + ":" + randomFrom(["00", "15", "30", "45"]),
            intensity: intensity,
            durationMin: [20, 30, 45, 60, 90, 120][Math.floor(Math.random() * 6)],
            locations: [
              randomFrom(["tempa_esq", "tempa_dir", "testa", "nuca", "lado_esq", "lado_dir"]),
              ...(chance(0.4) ? ["nuca"] : [])
            ],
            symptoms: [
              ...(chance(0.6) ? ["fotofobia"] : []),
              ...(chance(0.4) ? ["nausea"] : []),
              ...(chance(0.3) ? ["fonofobia"] : [])
            ],
            reliefs: reliefs,
            reliefResult: helped ? (chance(0.5) ? "total" : "parcial") : "nenhum",
            notes: ""
          });
        }
      }

      state.logs[key] = { date: key, checkin: checkin, episodes: episodes };
    }
    state.settings.onboarded = true;
    if (!state.settings.name) state.settings.name = "Exemplo";
    save();
  }

  return {
    state: state,
    pad: pad,
    toKey: toKey,
    todayKey: todayKey,
    parseKey: parseKey,
    monthKeyOf: monthKeyOf,
    shiftMonth: shiftMonth,
    daysInMonth: daysInMonth,
    monthName: monthName,
    monthNameShort: monthNameShort,
    formatDay: formatDay,
    formatDayShort: formatDayShort,
    formatDateTime: formatDateTime,
    load: load,
    save: save,
    getDay: getDay,
    getCheckin: getCheckin,
    setCheckin: setCheckin,
    addEpisode: addEpisode,
    updateEpisode: updateEpisode,
    removeEpisode: removeEpisode,
    removeDay: removeDay,
    sortedDayKeys: sortedDayKeys,
    hasAnyData: hasAnyData,
    exportJSON: exportJSON,
    importJSON: importJSON,
    wipe: wipe,
    loadSampleData: loadSampleData
  };
})();
