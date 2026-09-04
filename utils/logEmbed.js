// utils/logEmbed.js
const { EmbedBuilder } = require("discord.js");

module.exports = async (
  client,
  channelId,
  title,
  description,
  color,
  fields = [],
  thumbnail = null,
) => {
  // 1. Validação Básica (Se não tiver ID configurado no .env, ignora silenciosamente)
  if (!channelId) return;

  // 2. Busca o Canal
  const logChannel = client.channels.cache.get(channelId);

  if (!logChannel) {
    console.warn(
      `[LOG SYSTEM] Canal com ID "${channelId}" não encontrado no servidor.`,
    );
    return;
  }

  // 3. Constrói o Embed
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp()
    .setFooter({
      text: `MC KEVIN Logs • Segurança e Moderação`,
      iconURL: client.user.displayAvatarURL(),
    });

  if (fields.length > 0) embed.addFields(fields);
  if (thumbnail) embed.setThumbnail(thumbnail);

  // 4. Envia o Log
  try {
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error(
      `[LOG SYSTEM] Erro ao enviar log para o canal ${logChannel.name}:`,
      error,
    );
  }
};
