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

  // Montando o design idêntico usando "Fields" para simular o texto na esquerda
  const embed = new EmbedBuilder()
    .setTitle("🔔 CENTRAL DE NOTIFICAÇÕES")
    .setDescription(
      "Pegue sua tag abaixo para receber notificações específicas no servidor e não perder nada importante:",
    )
    .setColor(COLOR_BASE)
    .addFields(
      {
        name: "🎁 SORTEIOS",
        value:
          "Receba alertas sobre novos sorteios, eventos e prêmios da comunidade.",
        inline: false,
      },
      {
        name: "🎉 INTERAÇÕES",
        value:
          "Seja notificado sobre eventos, brincadeiras, avisos e salinhas.",
        inline: false,
      },
      {
        name: "🔴 LIVES",
        value:
          "Saiba na hora quando a galera entrar ao vivo para assistir e interagir.",
        inline: false,
      },
    )
    .setFooter({
      text: "Sistema de Auto-Role",
      iconURL: message.guild.iconURL(),
    });

  if (BANNER_URL) embed.setImage(BANNER_URL);

  // Criando a fileira de 3 botões perfeitamente alinhada
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
