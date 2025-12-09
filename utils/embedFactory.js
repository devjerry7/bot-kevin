// utils/embedFactory.js
const { EmbedBuilder } = require("discord.js");
const { getGuildConfig } = require("./guildConfigManager");

/**
 * Cria um EmbedBuilder já configurado com as cores e imagens do servidor.
 * @param {string} guildId - ID do servidor
 * @returns {Promise<EmbedBuilder>} - O Embed pronto para uso
 */
async function createGuildEmbed(guildId) {
  // 1. Busca a configuração do banco
  const config = await getGuildConfig(guildId);

  // 2. Define os padrões caso o cliente não tenha configurado
  const color = config.embedColor || "#2f3136"; // Cinza escuro padrão

  // 3. Cria o Embed
  const embed = new EmbedBuilder().setColor(color);

  // 4. Se tiver Banner configurado (Imagem Grande embaixo), adiciona
  if (config.bannerImage && config.bannerImage.startsWith("http")) {
    embed.setImage(config.bannerImage);
  }

  // 5. Se tiver Thumbnail configurada (Imagem pequena no canto), adiciona
  if (config.thumbnailImage && config.thumbnailImage.startsWith("http")) {
    embed.setThumbnail(config.thumbnailImage);
  }

  return embed;
}

module.exports = { createGuildEmbed };
