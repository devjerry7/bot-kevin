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

  // Configurações de IDs de Cargos (Visuais e Permissão) - Serão preenchidos por rank
  ranks: {
    1: {
      name: "Trainee",
      chatRole: "1162904985084891156",
      callRole: "1162904985084891156",
      permRole: null,
      metaStreakRequired: 3,
    },
    2: {
      name: "Oficial",
      chatRole: "1162904986947162122",
      callRole: "1162904986947162122",
      permRole: "1162904970211897385",
      metaStreakRequired: 4,
    },
    3: {
      name: "Veterano",
      chatRole: "1162904989455364147",
      callRole: "1162904989455364147",
      permRole: "1162904959197663455",
      metaStreakRequired: 5,
    },
    4: {
      name: "Elite",
      chatRole: "1162905039279489054",
      callRole: "1162905039279489054",
      permRole: "1162904942026166343",
      metaStreakRequired: 0,
    },
  },
};
