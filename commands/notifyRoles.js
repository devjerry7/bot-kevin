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

  // Puxando os emojis customizados do .env (Se não achar, usa os normais de segurança)
  const EMOJI_SORTEIO = process.env.EMOJI_NOTIFY_SORTEIO || "🎁";
  const EMOJI_INTERACAO = process.env.EMOJI_NOTIFY_INTERACAO || "🎉";
  const EMOJI_LIVE = process.env.EMOJI_NOTIFY_LIVE || "🔴";
  const EMOJI_ICON = process.env.EMOJI_NOTIFY_ICON || "🔔";

  // Design limpo, objetivo e com seus emojis no texto
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJI_ICON} CENTRAL DE NOTIFICAÇÕES`)
    .setDescription(
      "Pegue sua tag abaixo para receber notificações sobre:\n\n" +
        `${EMOJI_SORTEIO} **SORTEIOS**\n` +
        "Receba notificações de sorteios.\n\n" +
        `${EMOJI_INTERACAO} **INTERAÇÕES**\n` +
        "Receba notificações de interações e eventos.\n\n" +
        `${EMOJI_LIVE} **LIVES**\n` +
        "Receba notificações de transmissões ao vivo.",
    )
    .setColor(COLOR_BASE)
    .setFooter({
      text: "2qn",
      iconURL: message.guild.iconURL(),
    });

  if (BANNER_URL) embed.setImage(BANNER_URL);

  // Colocando seus emojis customizados nos botões
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_notify_giveaway")
      .setLabel("Sorteios")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(EMOJI_SORTEIO),
    new ButtonBuilder()
      .setCustomId("btn_notify_interaction")
      .setLabel("Interações")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(EMOJI_INTERACAO),
    new ButtonBuilder()
      .setCustomId("btn_notify_live")
      .setLabel("Lives")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(EMOJI_LIVE),
  );

  await message.channel.send({
    embeds: [embed],
    components: [row],
  });

  if (message.deletable) await message.delete().catch(() => {});
};

module.exports = { handleNotifyRolesPanel };
