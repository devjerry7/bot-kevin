// protectionManager.js
const prisma = require("./database");

module.exports = {
  // ==========================================
  // 🛡️ PANELA (Anti-ban / Whitelist)
  // ==========================================
  addToPanela: async (userId) => {
    try {
      await prisma.panela.create({ data: { userId } });
      return true;
    } catch (e) {
      if (e.code !== "P2002") console.error("[DB ERROR] addToPanela:", e);
      return false;
    }
  },

  removeFromPanela: async (userId) => {
    try {
      await prisma.panela.delete({ where: { userId } });
      return true;
    } catch (e) {
      if (e.code !== "P2025") console.error("[DB ERROR] removeFromPanela:", e);
      return false;
    }
  },

  isPanela: async (userId) => {
    // 1. Imunidade Suprema: Verifica se é o dono ou se está na whitelist fixa do .env
    const envWhitelist = process.env.WHITELIST_IDS?.split(",") || [];
    if (userId === process.env.OWNER_1_ID || envWhitelist.includes(userId)) {
      return true;
    }

    // 2. Verifica a imunidade dinâmica no Banco de Dados
    try {
      const user = await prisma.panela.findUnique({ where: { userId } });
      return !!user;
    } catch (e) {
      console.error("[DB ERROR] isPanela:", e);
      return false;
    }
  },

  // ==========================================
  // 🚫 BLACKLIST (Bloqueados de usar o bot)
  // ==========================================
  addToBlacklist: async (userId) => {
    try {
      await prisma.blacklist.create({ data: { userId } });
      return true;
    } catch (e) {
      if (e.code !== "P2002") console.error("[DB ERROR] addToBlacklist:", e);
      return false;
    }
  },

  removeFromBlacklist: async (userId) => {
    try {
      await prisma.blacklist.delete({ where: { userId } });
      return true;
    } catch (e) {
      if (e.code !== "P2025")
        console.error("[DB ERROR] removeFromBlacklist:", e);
      return false;
    }
  },

  isBlacklisted: async (userId) => {
    try {
      const user = await prisma.blacklist.findUnique({ where: { userId } });
      return !!user;
    } catch (e) {
      console.error("[DB ERROR] isBlacklisted:", e);
      return false;
    }
  },

  // ==========================================
  // 📋 LISTAR (Retorna array de IDs)
  // ==========================================
  getList: async (type) => {
    try {
      if (type === "panela") {
        const list = await prisma.panela.findMany();
        return list.map((item) => item.userId);
      }
      if (type === "blacklist") {
        const list = await prisma.blacklist.findMany();
        return list.map((item) => item.userId);
      }
      return [];
    } catch (e) {
      console.error("[DB ERROR] getList:", e);
      return [];
    }
  },
};
