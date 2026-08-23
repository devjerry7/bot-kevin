// commands/help.js
const { EmbedBuilder } = require("discord.js");

// ⚠️ ATENÇÃO: COLOQUE O LINK DO SEU BANNER NOVO AQUI ⚠️
const HEADER_IMAGE = "LINK_DO_SEU_BANNER_NOVO_AQUI";
const COLOR_DIAMOND = 0x00e5ff;
const PREFIX = "k!";

module.exports = {
  name: "help",
  description: "Mostra a lista de comandos disponíveis.",
  async execute(message, args) {
    try {
      const embed = new EmbedBuilder()
        .setTitle(`🛠️ Central de Ajuda • ${message.client.user.username}`)
        .setDescription(
          `Prefixo do servidor: **\`${PREFIX}\`**\nConfira abaixo as categorias e comandos disponíveis:`,
        )
        .setColor(COLOR_DIAMOND)
        .setImage(HEADER_IMAGE)
        .addFields(
          {
            name: "💰 Economia",
            value: `\`${PREFIX}saldo\`, \`${PREFIX}daily\`, \`${PREFIX}work\`, \`${PREFIX}pay\`, \`${PREFIX}rank\``,
            inline: false,
          },
          {
            name: "🛒 Mercado & Ações",
            value: `\`${PREFIX}loja\`, \`${PREFIX}comprar\`, \`${PREFIX}roubar\``,
            inline: false,
          },
          {
            name: "💎 VIP, Booster & PD",
            value: `\`${PREFIX}vip\`, \`${PREFIX}booster\`, \`${PREFIX}pd\`, \`${PREFIX}setpd\`, \`${PREFIX}removepd\``,
            inline: false,
          },
          {
            name: "🎛️ Painéis Administrativos",
            value: `\`${PREFIX}canais\`, \`${PREFIX}jogos\``,
            inline: false,
          },
          {
            name: "👤 Utilitários",
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
      const errorMsg = await message.channel.send(
        "❌ Ocorreu um erro ao carregar a central de ajuda.",
      );
      setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
    }
  },
};
