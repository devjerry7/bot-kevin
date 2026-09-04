// utils/embedFactory.js
const { EmbedBuilder } = require("discord.js");

/**
 * Cria um EmbedBuilder já configurado com as cores e imagens do servidor.
 * Lê os dados diretamente do .env (Estrutura Single-Server).
 * @returns {EmbedBuilder} - O Embed pronto para uso
 */
function createGuildEmbed() {
  // Puxa as variáveis globais do .env
  const colorHex = process.env.COLOR_BASE || "#2f3136";
  const color = parseInt(colorHex.replace("#", ""), 16) || 0x2f3136;

  const bannerImage = process.env.BANNER_URL || "";
  const thumbnailImage = process.env.THUMBNAIL_URL || ""; // Se quiser adicionar no .env depois

  const embed = new EmbedBuilder().setColor(color);

  // Se tiver Banner configurado (Imagem Grande embaixo), adiciona
  if (bannerImage && bannerImage.startsWith("http")) {
    embed.setImage(bannerImage);
  }

  // Se tiver Thumbnail configurada (Imagem pequena no canto), adiciona
  if (thumbnailImage && thumbnailImage.startsWith("http")) {
    embed.setThumbnail(thumbnailImage);
  }

  return embed;
}

module.exports = { createGuildEmbed };
