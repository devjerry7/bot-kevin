// commands/botinfo.js
const { EmbedBuilder } = require("discord.js");

module.exports = {
  handleBotInfo: async (message) => {
    try {
      // --- CONFIGURAÇÕES DO .ENV ---
      const BANNER_URL = process.env.BANNER_URL;
      const COLOR_BASE = process.env.COLOR_BASE
        ? parseInt(process.env.COLOR_BASE, 16)
        : 0x00e5ff;

      const EMOJI_BOT = process.env.EMOJI_BOT || "🤖";
      const EMOJI_MONEY = process.env.EMOJI_MONEY || "💰";
      const EMOJI_SHIELD = process.env.EMOJI_SHIELD || "🛡️";
      const EMOJI_DIAMOND = process.env.EMOJI_DIAMOND || "💎";
      const EMOJI_PANEL = process.env.EMOJI_PANEL || "🎛️";
      const EMOJI_LOG = process.env.EMOJI_LOG || "📝";

      const infoEmbed = new EmbedBuilder()
        .setTitle(`${EMOJI_BOT} MC KEVIN - Sistema Central V2`)
        .setDescription(
          "Bot exclusivo de gerenciamento, segurança e economia focado 100% neste servidor.\n" +
            "Todos os sistemas são integrados e otimizados para alta performance.",
        )
        .setColor(COLOR_BASE)
        .setImage(BANNER_URL)
        .setThumbnail(
          message.client.user.displayAvatarURL({ dynamic: true, size: 512 }),
        )
        .addFields(
          {
            name: `${EMOJI_MONEY} Economia & Cassino`,
            value:
              "> **Sistema Bancário:** Carteira, Banco e Transferências (Pix).\n" +
              "> **Jobs:** Comandos de `Daily` e `Work` com cooldown.\n" +
              "> **Jogos de Azar:** `Slots` e `Mines` totalmente interativos.",
            inline: false,
          },
          {
            name: `${EMOJI_SHIELD} Segurança`,
            value:
              "> **Moderação:** Punições, Logs e Proteções automatizadas.\n" +
              "> **Chat Blindado:** Anti-Link, Anti-Spam e Filtro de Menções.\n" +
              "> **Listas:** Blacklist (Ban na entrada) e Panela (Imunidade).",
            inline: false,
          },
          {
            name: `${EMOJI_DIAMOND} Sistema VIP & PD`,
            value:
              "> **VIP Self-Service:** Benefícios, Tags e Canais exclusivos.\n" +
              "> **Gerenciamento:** Adição de amigos às calls VIPs.\n" +
              "> **Primeira Dama:** Sistema exclusivo de cargos especiais.",
            inline: false,
          },
          {
            name: `${EMOJI_PANEL} Gestão por Painéis`,
            value:
              "> A Staff não usa comandos complexos, usa Painéis Visuais:\n" +
              "> `Moderação` • `Infraestrutura` • `Cargos` • `Verificação`.",
            inline: false,
          },
          {
            name: `${EMOJI_LOG} Auditoria Total`,
            value: "> Logs detalhados de Voz, Mensagens, Punições e Edições.",
            inline: false,
          },
        )
        .setFooter({
          text: "Versão 2.0 Single-Server • Database SQLite",
          iconURL: message.guild.iconURL(),
        })
        .setTimestamp();

      await message.channel.send({ embeds: [infoEmbed] });
    } catch (error) {
      console.error("[BOTINFO ERROR] Erro ao carregar as informações:", error);
    }
  },
};
