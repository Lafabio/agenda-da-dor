/* Agenda da Dor - catálogos de gatilhos (possíveis causas), alívios (benefícios),
   locais da dor, sintomas e rótulos. Fonte única de verdade. */

var CATALOG = (function () {
  "use strict";

  var triggerGroups = [
    {
      id: "alimentacao",
      name: "Alimentação e água",
      color: "#F97316",
      triggers: [
        { id: "fome", label: "Pular refeição / fome" },
        { id: "desidratacao", label: "Pouca água (desidratação)" },
        { id: "cafeina", label: "Cafeína (café, energético, refri)" },
        { id: "chocolate", label: "Chocolate" },
        { id: "queijo", label: "Queijos curados / velhos" },
        { id: "embutidos", label: "Presunto, salame e embutidos" },
        { id: "acucar", label: "Muito doce / açúcar" },
        { id: "citrus", label: "Cítricos (laranja, limão)" },
        { id: "gelo", label: "Sorvete / comida gelada" },
        { id: "alcool", label: "Álcool" },
        { id: "fastfood", label: "Fast food / prato instantâneo" },
        { id: "fritura", label: "Fritura / comida pesada" }
      ]
    },
    {
      id: "sono_rotina",
      name: "Sono e rotina",
      color: "#6C5CE7",
      triggers: [
        { id: "sono_pouco", label: "Dormiu pouco (menos de 7h)" },
        { id: "sono_demais", label: "Dormiu demais / cochilo longo" },
        { id: "sono_bagunca", label: "Horário do sono bagunçado" },
        { id: "tela", label: "Muito tempo na tela" },
        { id: "postura", label: "Postura ruim / pescoço duro" },
        { id: "mudanca_rotina", label: "Mudança de rotina (viagem, evento)" },
        { id: "evento_grande", label: "Prova, apresentação ou evento" },
        { id: "estudando", label: "Estava estudando / aula" }
      ]
    },
    {
      id: "emocoes",
      name: "Emoções",
      color: "#EC4899",
      triggers: [
        { id: "estresse", label: "Estresse" },
        { id: "ansiedade", label: "Ansiedade" },
        { id: "briga", label: "Briga ou choro intenso" },
        { id: "susto", label: "Susto ou novidade forte" }
      ]
    },
    {
      id: "corpo",
      name: "Corpo e esforço",
      color: "#14B8A6",
      triggers: [
        { id: "sedentario", label: "Pouco movimento no dia" },
        { id: "exercicio", label: "Exercício muito intenso ou súbito" },
        { id: "tensao", label: "Tensão em pescoço e ombros" },
        { id: "cansaco", label: "Cansaço acumulado" },
        { id: "gripe", label: "Gripe, resfriado ou febre" },
        { id: "dor_outra", label: "Dor em outro lugar (dente, ouvido, olho)" }
      ]
    },
    {
      id: "ambiente",
      name: "Ambiente",
      color: "#0EA5E9",
      triggers: [
        { id: "luz", label: "Luz forte ou piscando" },
        { id: "barulho", label: "Muito barulho" },
        { id: "cheiro", label: "Cheiro forte (perfume, fumaça, tinta)" },
        { id: "calor", label: "Calorão ou ar gelado demais" },
        { id: "clima", label: "Mudança de tempo / tempestade" },
        { id: "fumaca", label: "Fumaça de cigarro / poluição" }
      ]
    },
    {
      id: "hormonios",
      name: "Hormônios",
      color: "#A855F7",
      triggers: [
        { id: "menstruacao", label: "Menstruação (ou faltando pouco)" },
        { id: "pos_menstruacao", label: "Dias depois da menstruação" },
        { id: "anticoncepcional", label: "Anticoncepcional / mudança de remédio" },
        { id: "hormonal", label: "Outra mudança hormonal" }
      ]
    },
    {
      id: "remedios_habitos",
      name: "Remédios e hábitos",
      color: "#EF4444",
      triggers: [
        { id: "analgesico", label: "Excesso de analgésico" },
        { id: "esqueceu_remedio", label: "Esqueceu o remédio de rotina" },
        { id: "novo_remedio", label: "Começou um remédio novo" },
        { id: "fumo", label: "Fumo / cigarro (inclusive passivo)" },
        { id: "jejum", label: "Jejum ou dieta muito restritiva" }
      ]
    },
    {
      id: "outros",
      name: "Outros",
      color: "#64748B",
      triggers: [
        { id: "outro", label: "Outro fator (ver anotação)" }
      ]
    }
  ];

  var reliefGroups = [
    {
      id: "descanso",
      name: "Descanso",
      color: "#6C5CE7",
      items: [
        { id: "dormir", label: "Dormir / cochilar" },
        { id: "escuridao", label: "Ficar no escuro e silêncio" },
        { id: "pausa_tela", label: "Pausa das telas" },
        { id: "quieto", label: "Ficar quieta esperar passar" }
      ]
    },
    {
      id: "corpo",
      name: "Cuidados com o corpo",
      color: "#14B8A6",
      items: [
        { id: "compressa_fria", label: "Compressa gelada na testa" },
        { id: "compressa_quente", label: "Compressa quente no pescoço" },
        { id: "alongamento", label: "Alongar pescoço e ombros" },
        { id: "respiracao", label: "Respirar fundo / relaxar" },
        { id: "massagem", label: "Massagear a nuca" },
        { id: "banho", label: "Banho morno" },
        { id: "ar_livre", label: "Caminhar ao ar livre" },
        { id: "ventilacao", label: "Ar fresco / janela aberta" }
      ]
    },
    {
      id: "alimentacao",
      name: "Alimentação e remédio",
      color: "#F97316",
      items: [
        { id: "agua", label: "Beber água" },
        { id: "lanche", label: "Comer algo (se estava com fome)" },
        { id: "cafeina_ok", label: "Um café ou refri" },
        { id: "remedio", label: "Remédio (com orientação)" }
      ]
    },
    {
      id: "emocional",
      name: "Apoio emocional",
      color: "#EC4899",
      items: [
        { id: "falar", label: "Contar para alguém / desabafar" },
        { id: "evitar_gatilho", label: "Sair do ruído/luz ou parar a atividade" },
        { id: "planejar", label: "Reorganizar o dia / dormir mais cedo" }
      ]
    },
    {
      id: "outros",
      name: "Outros",
      color: "#64748B",
      items: [
        { id: "outro", label: "Outro alívio (ver anotação)" }
      ]
    }
  ];

  var painTypes = [
    { id: "pulsante", label: "Pulsante" },
    { id: "pressao", label: "Pressão" },
    { id: "fisgada", label: "Fisgada" },
    { id: "dormencia", label: "Dormência" },
    { id: "sensibilidade", label: "Sensibilidade ao toque" },
    { id: "brainzaps", label: "Brain zaps" },
    { id: "outra", label: "Outra" }
  ];

  var activities = [
    { id: "estudando", label: "Estudando / aula" },
    { id: "atividade_fisica", label: "Atividade física" },
    { id: "tela", label: "No celular / computador" },
    { id: "trabalhando", label: "Trabalhando" },
    { id: "casa", label: "Tarefas de casa" },
    { id: "social", label: "Festa / rolê" },
    { id: "descanso", label: "Descansando" },
    { id: "transporte", label: "No ônibus / caminhando" },
    { id: "sem_mudanca", label: "Nada em especial" },
    { id: "outra", label: "Outra (anotar)" }
  ];

  var locations = [
    { id: "topo", label: "Topo da cabeça" },
    { id: "testa", label: "Testa" },
    { id: "olhos", label: "Ao redor dos olhos" },
    { id: "tempa_esq", label: "Têmpora esquerda" },
    { id: "tempa_dir", label: "Têmpora direita" },
    { id: "rosto", label: "Rosto / mandíbula" },
    { id: "nuca", label: "Nuca" },
    { id: "occipital", label: "Região occipital (parte de trás)" },
    { id: "pescoco", label: "Pescoço" },
    { id: "lado_esq", label: "Metade esquerda da cabeça" },
    { id: "lado_dir", label: "Metade direita da cabeça" },
    { id: "inteira", label: "Cabeça inteira" }
  ];

  var symptoms = [
    { id: "nausea", label: "Enjoo" },
    { id: "vomito", label: "Vômito" },
    { id: "aura", label: "Luzes / zigue-zague na visão" },
    { id: "visao_turva", label: "Visão turva" },
    { id: "fotofobia", label: "Sensível à luz" },
    { id: "fonofobia", label: "Sensível a som" },
    { id: "tontura", label: "Tontura" },
    { id: "formigamento", label: "Formigamento" },
    { id: "rigidez", label: "Pescoço rígido" },
    { id: "sono_crise", label: "Vontade de dormir" }
  ];

  var moods = [
    { id: 1, label: "Péssimo", color: "#EF4444" },
    { id: 2, label: "Ruim", color: "#F97316" },
    { id: 3, label: "Normal", color: "#FDBA2D" },
    { id: 4, label: "Bom", color: "#2ED3A7" },
    { id: 5, label: "Ótimo", color: "#10B981" }
  ];

  var cycleStates = [
    { id: "none", label: "Sem mudanças" },
    { id: "menstruacao", label: "Menstruando" },
    { id: "pms", label: "Faltando /TPM" },
    { id: "pos", label: "Depois da menstruação" },
    { id: "na", label: "Não quer registrar" }
  ];

  var intensityLabels = [
    { max: 2, label: "Quase nada", color: "#2ED3A7" },
    { max: 4, label: "Leve", color: "#84CC16" },
    { max: 6, label: "Moderada", color: "#FDBA2D" },
    { max: 8, label: "Forte", color: "#F97316" },
    { max: 10, label: "Muito forte", color: "#EF4444" }
  ];

  var weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  var weekdayLabelsLong = [
    "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"
  ];
  var monthLabels = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  var monthLabelsShort = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez"
  ];

  function findTrigger(id) {
    for (var g = 0; g < triggerGroups.length; g++) {
      var list = triggerGroups[g].triggers;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) {
          return { trigger: list[i], group: triggerGroups[g] };
        }
      }
    }
    return null;
  }

  function findRelief(id) {
    for (var g = 0; g < reliefGroups.length; g++) {
      var list = reliefGroups[g].items;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) {
          return { relief: list[i], group: reliefGroups[g] };
        }
      }
    }
    return null;
  }

  function findLocation(id) {
    for (var i = 0; i < locations.length; i++) {
      if (locations[i].id === id) return locations[i];
    }
    return { id: id, label: id };
  }

  function findSymptom(id) {
    for (var i = 0; i < symptoms.length; i++) {
      if (symptoms[i].id === id) return symptoms[i];
    }
    return { id: id, label: id };
  }

  function findPainType(id) {
    for (var i = 0; i < painTypes.length; i++) {
      if (painTypes[i].id === id) return painTypes[i];
    }
    return null;
  }

  function findActivity(id) {
    for (var i = 0; i < activities.length; i++) {
      if (activities[i].id === id) return activities[i];
    }
    return null;
  }

  function intensityInfo(value) {
    for (var i = 0; i < intensityLabels.length; i++) {
      if (value <= intensityLabels[i].max) return intensityLabels[i];
    }
    return intensityLabels[intensityLabels.length - 1];
  }

  return {
    triggerGroups: triggerGroups,
    reliefGroups: reliefGroups,
    painTypes: painTypes,
    activities: activities,
    locations: locations,
    symptoms: symptoms,
    moods: moods,
    cycleStates: cycleStates,
    intensityLabels: intensityLabels,
    weekdayLabels: weekdayLabels,
    weekdayLabelsLong: weekdayLabelsLong,
    monthLabels: monthLabels,
    monthLabelsShort: monthLabelsShort,
    findTrigger: findTrigger,
    findRelief: findRelief,
    findPainType: findPainType,
    findActivity: findActivity,
    findLocation: findLocation,
    findSymptom: findSymptom,
    intensityInfo: intensityInfo
  };
})();
