// commands/notifyRoles.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");

const handleNotifyRolesPanel = async (message) => {
  if (
    !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    return message.reply(
      `${EMOJI_ERROR} Apenas administradores podem postar o painel de notificações.`,
    );
  }

  const COLOR_BASE = process.env.COLOR_BASE
    ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
    : 0x962dc0;
  const BANNER_URL = process.env.BANNER_URL;

  // Design limpo, objetivo e com espaçamento forçado (\n\n)
  const embed = new EmbedBuilder()
    .setTitle("🔔 CENTRAL DE NOTIFICAÇÕES")
    .setDescription(
      "Pegue sua tag abaixo para receber notificações sobre:\n\n" +
        "🎁 **SORTEIOS**\n" +
        "Receba notificações de sorteios.\n\n" +
        "🎉 **INTERAÇÕES**\n" +
        "Receba notificações de interações e eventos.\n\n" +
        "🔴 **LIVES**\n" +
        "Receba notificações de transmissões ao vivo.",
    )
    .setColor(COLOR_BASE)
    .setFooter({
      text: "Sistema de Auto-Role",
      iconURL: message.guild.iconURL(),
    });

  if (BANNER_URL) embed.setImage(BANNER_URL);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_notify_giveaway")
      .setLabel("Sorteios")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🎁"),
    new ButtonBuilder()
      .setCustomId("btn_notify_interaction")
      .setLabel("Interações")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🎉"),
    new ButtonBuilder()
      .setCustomId("btn_notify_live")
      .setLabel("Lives")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🔴"),
  );

  await message.channel.send({
    embeds: [embed],
    components: [row],
  });

  if (message.deletable) await message.delete().catch(() => {});
};

module.exports = { handleNotifyRolesPanel };
