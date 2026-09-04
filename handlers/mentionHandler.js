// handlers/mentionHandler.js
const { EmbedBuilder } = require("discord.js");

module.exports = async (message) => {
  if (!message.mentions.has(message.client.user.id)) return false;

  // --- Lendo variáveis do .env ---
  const PREFIX = process.env.PREFIX || "mc!";
  const EMOJI_BOT = process.env.EMOJI_BOT || "🤖";
  const DEVELOPER_ID = process.env.OWNER_1_ID || "578307859964624928";
  const COLOR_BASE = process.env.COLOR_BASE
    ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
    : 0x3498db;
  const BANNER_URL = process.env.BANNER_URL || "";

  const mentionEmbed = new EmbedBuilder()
    .setTitle(`${EMOJI_BOT} Olá! Eu sou o MC KEVIN.`)
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
