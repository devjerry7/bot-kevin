// events/voiceStateUpdate.js
const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

module.exports = async (oldState, newState, client) => {
  const creatorChannelId = process.env.JOIN_TO_CREATE_ID;
  const categoryId = process.env.TEMP_CATEGORY_ID;

  if (!creatorChannelId) return;

  const member = newState.member;
  const guild = newState.guild;

  if (newState.channelId === creatorChannelId) {
    try {
      const channelName = `🎙️ | Sala de ${member.user.username}`;

      const tempChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: categoryId || null,
        permissionOverwrites: [
          {
            id: guild.id,
            allow: [PermissionFlagsBits.Connect],
          },
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.Connect, // 🔥 ADICIONADO AQUI PARA O DONO NÃO PERDER ACESSO
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.MoveMembers,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.DeafenMembers,
            ],
          },
        ],
      });

      await member.voice.setChannel(tempChannel);

      const EMOJI_LOCK = process.env.EMOJI_LOCK || "🔒";
      const EMOJI_UNLOCK = process.env.EMOJI_UNLOCK || "🔓";
      const EMOJI_RENAME = process.env.EMOJI_RENAME || "✏️";
      const COLOR_BASE = process.env.COLOR_BASE
        ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
        : 0x00e5ff;

      const embed = new EmbedBuilder()
        .setTitle("🎛️ PAINEL DE CONTROLE DA CALL")
        .setDescription(
          "Gerencie sua sala privada utilizando os botões abaixo.",
        )
        .setColor(COLOR_BASE);

      // Botões transparentes (Secondary)
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("vpanel_lock")
          .setLabel("Privar")
          .setEmoji(EMOJI_LOCK)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("vpanel_unlock")
          .setLabel("Abrir")
          .setEmoji(EMOJI_UNLOCK)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("vpanel_rename")
          .setLabel("Renomear")
          .setEmoji(EMOJI_RENAME)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("vpanel_limit")
          .setLabel("Limite")
          .setEmoji("👥")
          .setStyle(ButtonStyle.Secondary),
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("vpanel_add")
          .setLabel("Permitir Amigo")
          .setEmoji("➕")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("vpanel_kick")
          .setLabel("Expulsar")
          .setEmoji("👢")
          .setStyle(ButtonStyle.Secondary),
      );

      await tempChannel.send({
        content: `<@${member.id}>, seu painel de controle foi gerado!`,
        embeds: [embed],
        components: [row1, row2],
      });
    } catch (error) {
      console.error("[VOICE ERROR] Erro ao criar canal temporário:", error);
    }
  }

  if (oldState.channel && oldState.channel.id !== creatorChannelId) {
    const oldChannel = oldState.channel;
    if (oldChannel.parentId === categoryId && oldChannel.members.size === 0) {
      try {
        await oldChannel.delete();
      } catch (e) {}
    }
  }
};
