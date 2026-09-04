// handlers/chatProtectionHandler.js
const { EmbedBuilder } = require("discord.js");

module.exports = async (message) => {
  if (message.author.bot) return false;
  if (message.guild.ownerId === message.author.id) return false;

  // Carrega a whitelist diretamente do .env
  const whitelistEnv = process.env.WHITELIST_IDS || "";
  const WHITELIST_IDS = whitelistEnv ? whitelistEnv.split(",") : [];

  if (WHITELIST_IDS.includes(message.author.id)) return false;

  const { content, channel } = message;
  const contentLower = content.toLowerCase();
  let violationType = null;
  let warningMessage = "";

  // --- ANTI-INVITE ---
  const inviteRegex = /(discord\.(gg|io|me|li)|discord(app)?\.com\/invite)/i;

  if (!violationType && inviteRegex.test(contentLower)) {
    violationType = "INVITE_LINK";
    warningMessage = `🚫 **${message.author}, Tá fazendo div? Está com nós ou tá com os cara?**`;
  }

  // --- AÇÃO PUNITIVA ---
  if (violationType) {
    try {
      const COLOR_ERROR = process.env.COLOR_ERROR
        ? parseInt(process.env.COLOR_ERROR.replace("#", ""), 16)
        : 0xff0000;

      // 1. Deleta a mensagem
      if (message.deletable) {
        await message.delete().catch(() => {});
      }

      // 2. Envia a Bronca
      const embed = new EmbedBuilder()
        .setDescription(warningMessage)
        .setColor(COLOR_ERROR);

      const msg = await channel.send({ embeds: [embed] });

      // Apaga a bronca depois de 5 segundos
      setTimeout(() => msg.delete().catch(() => {}), 5000);

      return true; // Interrompe o fluxo
    } catch (error) {
      console.error(`[CHAT PROTECTION ERROR]: ${error.message}`);
    }
  }

  return false; // Tudo limpo
};
