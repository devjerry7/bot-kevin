// src/services/guildConfig.js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const guildConfig = {
  // Busca a config. Se não existir, cria uma nova padrão.
  async get(guildId) {
    let config = await prisma.guildConfiguration.findUnique({
      where: { guildId },
    });

    if (!config) {
      config = await prisma.guildConfiguration.create({
        data: { guildId },
      });
    }

    return config;
  },

  // --- CORREÇÃO AQUI ---
  // Usamos UPSERT para garantir que salva mesmo se for a primeira vez
  async update(guildId, keyOrData, value = null) {
    let dataToUpdate = keyOrData;

    // Transforma (chave, valor) em objeto { chave: valor }
    if (typeof keyOrData === "string") {
      dataToUpdate = { [keyOrData]: value };
    }

    console.log(`[DEBUG] Salvando Config na Guilda ${guildId}:`, dataToUpdate);

    return await prisma.guildConfiguration.upsert({
      where: { guildId },
      // Se já existe, atualiza isso:
      update: dataToUpdate,
      // Se NÃO existe, cria com o ID + os dados novos:
      create: {
        guildId,
        ...dataToUpdate,
      },
    });
  },

  async getList(guildId, key) {
    const config = await this.get(guildId);
    const value = config[key];

    if (!value) return [];
    return value.split(",").map((id) => id.trim());
  },
};

module.exports = { guildConfig };
