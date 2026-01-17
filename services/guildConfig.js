// src/services/guildConfig.js
const { PrismaClient } = require("@prisma/client");

// Instancia o cliente do banco
const prisma = new PrismaClient();

const guildConfig = {
  // Busca a configuração. Se não existir, cria uma nova.
  async get(guildId) {
    // Tenta achar no banco
    let config = await prisma.guildConfiguration.findUnique({
      where: { guildId },
    });

    // Se não existir, cria o registro inicial
    if (!config) {
      config = await prisma.guildConfiguration.create({
        data: { guildId },
      });
    }

    return config;
  },

  // Atualiza qualquer campo da tabela
  async update(guildId, data) {
    return await prisma.guildConfiguration.update({
      where: { guildId },
      data: data,
    });
  },

  // Ajuda a ler listas (caso precisemos no futuro)
  async getList(guildId, key) {
    const config = await this.get(guildId);
    const value = config[key];

    if (!value) return [];
    return value.split(",").map((id) => id.trim());
  },
};

module.exports = { guildConfig };
