// commands/ticketPanel.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");

const BTN_OPEN = "btn_ticket_open";

module.exports = {
  BTN_OPEN,

  handleTicketPanel: async (message) => {
    // --- Lendo variáveis do .env ---
    const COLOR_BASE = process.env.COLOR_BASE
      ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
      : 0x3498db;
    const BANNER_URL = process.env.BANNER_TICKET || process.env.BANNER_URL;
    const PARENT_ID = process.env.TICKET_PARENT_CHANNEL_ID;
    const EMOJI_TICKET = process.env.EMOJI_TICKET || "🎫";
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_SUCCESS = process.env.EMOJI_SUCCESS || "✅";

    // Verifica permissão de moderação
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return message.reply(`${EMOJI_ERROR} Apenas Moderação.`);
    }

    if (!PARENT_ID) {
      return message.reply(
        `${EMOJI_ERROR} Canal Pai de Tickets não configurado ou não encontrado no \`.env\`.`,
      );
    }

    const targetChannel = message.guild.channels.cache.get(PARENT_ID);

    if (!targetChannel) {
      return message.reply(
        `${EMOJI_ERROR} Canal configurado não encontrado no servidor.`,
      );
    }

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJI_TICKET} Central de Atendimento`)
      .setDescription(
        "Precisa de algo?\n\n" +
          "**Clique no botão abaixo**.\n\n" +
          "Um atendimento privado será aberto neste mesmo canal.",
      )
      .setColor(COLOR_BASE)
      .setImage(BANNER_URL)
      .setThumbnail(message.guild.iconURL())
      .setFooter({ text: "Sistema de Suporte via Threads" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BTN_OPEN)
        .setLabel("Abrir Chamado")
        .setEmoji(EMOJI_TICKET)
        .setStyle(ButtonStyle.Secondary),
    );

    await targetChannel.send({ embeds: [embed], components: [row] });

    if (message.channel.id !== targetChannel.id) {
      message.reply(`${EMOJI_SUCCESS} Painel enviado para ${targetChannel}.`);
    }

    if (message.deletable) message.delete().catch(() => {});
  },
};
