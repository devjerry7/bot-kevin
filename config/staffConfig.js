// config/staffConfig.js
module.exports = {
  // IDs de Canais de Texto
  channels: {
    avisosStaff: "1550680586593767444", // Canal onde o bot manda o aviso na Segunda-feira
    chatStaff: "1550680999489314866", // Canal onde o bot anuncia as promoções de rank
    logsStaff: "1550681171007119413", // Canal exclusivo para a direção ver falhas/warnings
  },

  // Canais ou Categorias de Chat que DEVEM SER IGNORADOS pelo tracker
  ignoredChannels: ["ticket", "cmd", "comandos", "staff", "bot"],

  // Configurações de Cargos e Metas por Rank
  ranks: {
    1: {
      name: "Trainee",
      chatRole: "1162904985084891156",
      callRole: "1162904985084891156",
      permRole: null,
      metaChat: 150, // Meta de mensagens para Trainee
      metaCall: 300, // Meta de minutos em call para Trainee (ex: 5h)
      metaStreakRequired: 3,
    },
    2: {
      name: "Oficial",
      chatRole: "1162904986947162122",
      callRole: "1162904986947162122",
      permRole: "1162904970211897385",
      metaChat: 250, // Meta de mensagens para Oficial
      metaCall: 600, // Meta de minutos em call para Oficial (ex: 10h)
      metaStreakRequired: 4,
    },
    3: {
      name: "Veterano",
      chatRole: "1162904989455364147",
      callRole: "1162904989455364147",
      permRole: "1162904959197663455",
      metaChat: 350, // Meta de mensagens para Veterano
      metaCall: 900, // Meta de minutos em call para Veterano (ex: 15h)
      metaStreakRequired: 5,
    },
    4: {
      name: "Elite",
      chatRole: "1162905039279489054",
      callRole: "1162905039279489054",
      permRole: "1162904942026166343",
      metaChat: 500, // Meta de mensagens para Elite
      metaCall: 1200, // Meta de minutos em call para Elite (ex: 20h)
      metaStreakRequired: 0,
    },
  },
};
