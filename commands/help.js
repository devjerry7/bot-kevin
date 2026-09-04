// commands/help.js
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "help",
  description: "Mostra a lista de comandos disponíveis.",
  async execute(message, args) {
    try {
      // --- Lendo variáveis estéticas e de configuração do .env ---
      const PREFIX = process.env.PREFIX || "mc!";
      const BANNER_URL = process.env.BANNER_URL;
      const COLOR_BASE = process.env.COLOR_BASE
        ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
        : 0x00e5ff;

      // Emojis (Reaproveitando os existentes e puxando os novos)
      const EMOJI_TOOL = process.env.EMOJI_TOOL || "🛠️";
      const EMOJI_MONEY = process.env.EMOJI_MONEY || "💰";
      const EMOJI_CART = process.env.EMOJI_CART || "🛒";
      const EMOJI_DIAMOND = process.env.EMOJI_DIAMOND || "💎";
      const EMOJI_PANEL = process.env.EMOJI_PANEL || "🎛️";
      const EMOJI_USER = process.env.EMOJI_USER || "👤";
      const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";

      const embed = new EmbedBuilder()
        .setTitle(
          `${EMOJI_TOOL} Central de Ajuda • ${message.client.user.username}`,
        )
        .setDescription(
          `Prefixo do servidor: **\`${PREFIX}\`**\nConfira abaixo as categorias e comandos disponíveis:`,
        )
        .setColor(COLOR_BASE)
        .setImage(BANNER_URL)
        .addFields(
          {
            name: `${EMOJI_MONEY} Economia`,
            value: `\`${PREFIX}saldo\`, \`${PREFIX}daily\`, \`${PREFIX}work\`, \`${PREFIX}pay\`, \`${PREFIX}rank\``,
            inline: false,
          },
          {
            name: `${EMOJI_CART} Mercado & Ações`,
            value: `\`${PREFIX}loja\`, \`${PREFIX}comprar\`, \`${PREFIX}roubar\``,
            inline: false,
          },
          {
            name: `${EMOJI_DIAMOND} VIP, Booster & PD`,
            value: `\`${PREFIX}vip\`, \`${PREFIX}booster\`, \`${PREFIX}pd\`, \`${PREFIX}setpd\`, \`${PREFIX}removepd\``,
            inline: false,
          },
          {
            name: `${EMOJI_PANEL} Painéis Administrativos`,
            value: `\`${PREFIX}canais\`, \`${PREFIX}jogos\``,
            inline: false,
          },
          {
            name: `${EMOJI_USER} Utilitários`,
            value: `\`${PREFIX}avatar\`, \`${PREFIX}botinfo\`, \`${PREFIX}help\``,
            inline: false,
          },
        )
        .setFooter({
          text: `Solicitado por ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("[HELP ERROR]:", error);
      const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
      const errorMsg = await message.channel.send(
        `${EMOJI_ERROR} Ocorreu um erro ao carregar a central de ajuda.`,
      );
      setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
    }
  },
};
