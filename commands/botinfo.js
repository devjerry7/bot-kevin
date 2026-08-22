// commands/botinfo.js
const { EmbedBuilder } = require("discord.js");

// CONFIG VISUAL PADRÃO V2
const HEADER_IMAGE =
  "https://cdn.discordapp.com/attachments/885926443220107315/1443687792637907075/Gemini_Generated_Image_ppy99dppy99dppy9.png?ex=6929fa88&is=6928a908&hm=70e19897c6ea43c36f11265164a26ce5b70e4cb2699b82c26863edfb791a577d&";
const COLOR_DIAMOND = 0x00e5ff;

module.exports = {
  handleBotInfo: async (message) => {
    const infoEmbed = new EmbedBuilder()
      .setTitle("🤖 MC KEVIN - Sistema Central V2")
      .setDescription(
        "Bot exclusivo de gerenciamento, segurança e economia focado 100% neste servidor.\n" +
          "Todos os sistemas são integrados e otimizados para alta performance.",
      )
      .setColor(COLOR_DIAMOND)
      .setImage(HEADER_IMAGE)
      .setThumbnail(
        message.client.user.displayAvatarURL({ dynamic: true, size: 512 }),
      )
      .addFields(
        {
          name: "💰 Economia & Cassino",
          value:
            "> **Sistema Bancário:** Carteira, Banco e Transferências (Pix).\n" +
            "> **Jobs:** Comandos de `Daily` e `Work` com cooldown.\n" +
            "> **Jogos de Azar:** `Slots` e `Mines` totalmente interativos.",
          inline: false,
        },
        {
          name: "🛡️ Segurança",
          value:
            "> **Moderação:** Punições, Logs e Proteções automatizadas.\n" +
            "> **Chat Blindado:** Anti-Link, Anti-Spam e Filtro de Menções.\n" +
            "> **Listas:** Blacklist (Ban na entrada) e Panela (Imunidade).",
          inline: false,
        },
        {
          name: "💎 Sistema VIP & PD",
          value:
            "> **VIP Self-Service:** Benefícios, Tags e Canais exclusivos.\n" +
            "> **Gerenciamento:** Adição de amigos às calls VIPs.\n" +
            "> **Primeira Dama:** Sistema exclusivo de cargos especiais.",
          inline: false,
        },
        {
          name: "🎛️ Gestão por Painéis",
          value:
            "> A Staff não usa comandos complexos, usa Painéis Visuais:\n" +
            "> `Moderação` • `Infraestrutura` • `Cargos` • `Verificação`.",
          inline: false,
        },
        {
          name: "📝 Auditoria Total",
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
  },
};
