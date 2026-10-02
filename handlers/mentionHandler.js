// handlers/mentionHandler.js
const { EmbedBuilder } = require("discord.js");

module.exports = async (message) => {
  // Verifica se o bot foi mencionado de fato no conteúdo da mensagem
  if (!message.mentions.has(message.client.user.id)) return false;

  // Evita que dispare se for apenas menção por "reply" (resposta) sem o usuário digitar @Bot no texto
  // O reference indica que é uma resposta, e se o bot não estiver explicitamente no texto, ignoramos
  const isDirectMention =
    message.content.includes(`<@${message.client.user.id}>`) ||
    message.content.includes(`<@!${message.client.user.id}>`);
  if (!isDirectMention) return false;

  // --- Lendo variáveis do .env ---
  const PREFIX = process.env.PREFIX || "mc!";
  const EMOJI_BOT = process.env.EMOJI_BOT || "🤖";
  const DEVELOPER_ID = process.env.OWNER_1_ID || "578307859964624928";
  const COLOR_BASE = process.env.COLOR_BASE
    ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
    : 0x3498db;
  const BANNER_URL = process.env.BANNER_URL || "";

  const mentionEmbed = new EmbedBuilder()
    .setTitle(`${EMOJI_BOT} Olá! Eu sou o 2qn`)
    .setDescription(
      "Estou operando com estrutura otimizada para gerenciar a segurança, moderação e os sistemas automatizados deste servidor.",
    )
    .addFields(
      {
        name: "Desenvolvedor:",
        value: `<@${DEVELOPER_ID}>`,
        inline: true,
      },
      {
        name: "Prefixo do Bot:",
        value: `\`${PREFIX}\``,
        inline: true,
      },
    )
    .setColor(COLOR_BASE)
    .setTimestamp();

  if (BANNER_URL) mentionEmbed.setImage(BANNER_URL);

  await message.reply({ embeds: [mentionEmbed] });
  return true;
};
