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

  // --- A MÁGICA ESTÁ AQUI ---
  // Agora aceita tanto: update(id, { canal: 123 }) QUANTO update(id, "canal", "123")
  async update(guildId, keyOrData, value = null) {
    let dataToUpdate = keyOrData;

    // Se o segundo argumento for uma string (ex: "verificationChannelId")
    // Nós transformamos ele num objeto automaticamente
    if (typeof keyOrData === "string") {
      dataToUpdate = { [keyOrData]: value };
    }

    return await prisma.guildConfiguration.update({
      where: { guildId },
      data: dataToUpdate,
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
