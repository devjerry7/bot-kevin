// events/voiceStateUpdate.js
const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
} = require("discord.js");

// --- IMPORTAÇÃO DA STAFF ---
const staffVoiceTracker = require("../listeners/staffVoiceTracker");

module.exports = async (oldState, newState, client) => {
  const creatorChannelId = process.env.JOIN_TO_CREATE_ID;
  const categoryId = process.env.TEMP_CATEGORY_ID;

  const member = newState.member;
  const guild = newState.guild;

  // ====================================================
  // TRACKER DE VOZ DA STAFF
  // ====================================================
  if (member) {
    staffVoiceTracker(oldState, newState).catch((err) =>
      console.error("[STAFF VOICE TRACKER ERROR]", err),
    );
  }

  // ====================================================
  // SISTEMA DE CANAIS TEMPORÁRIOS (Join to Create)
  // ====================================================
  if (!creatorChannelId) return;

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
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.MoveMembers,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.DeafenMembers,
            ],
          },
        ],
      });

      await member.voice.setChannel(tempChannel);

      const COLOR_BASE = process.env.COLOR_BASE
        ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
        : 0x00e5ff;

      const embed = new EmbedBuilder()
        .setTitle(
          "<:br_registro2qn:1557798191100072119> PAINEL DE CONTROLE DA CALL",
        )
        .setDescription("Gerencie sua sala privada utilizando o menu abaixo.")
        .setColor(COLOR_BASE);

      // Menu Dropdown com todas as opções e emojis personalizados
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("vpanel_menu")
        .setPlaceholder("Selecione uma opção para gerenciar sua call...")
        .addOptions([
          new StringSelectMenuOptionBuilder()
            .setLabel("Privar Sala")
            .setDescription("Fecha a call para novos membros")
            .setValue("vpanel_lock")
            .setEmoji("1556914029841088573"), // <:br_proibido2qn:...>
          new StringSelectMenuOptionBuilder()
            .setLabel("Abrir Sala")
            .setDescription("Permite a entrada de todos na call")
            .setValue("vpanel_unlock")
            .setEmoji("1556905093729882217"), // <:br_correto2qn:...>
          new StringSelectMenuOptionBuilder()
            .setLabel("Renomear Sala")
            .setDescription("Altera o nome do canal de voz")
            .setValue("vpanel_rename")
            .setEmoji("1556905090835546173"), // <:br_incricao2qn:...>
          new StringSelectMenuOptionBuilder()
            .setLabel("Alterar Limite")
            .setDescription("Muda o limite de pessoas na sala")
            .setValue("vpanel_limit")
            .setEmoji("1542026405481684994"), // <:pr_pessoinha2qn:...>
          new StringSelectMenuOptionBuilder()
            .setLabel("Permitir Amigo")
            .setDescription("Concede acesso de entrada a um usuário")
            .setValue("vpanel_add")
            .setEmoji("1560020789015744522"), // <:br_adicao:...>
          new StringSelectMenuOptionBuilder()
            .setLabel("Expulsar Membro")
            .setDescription("Retira um usuário específico da sala")
            .setValue("vpanel_kick")
            .setEmoji("1556905095919050762"), // <:br_errado2qn:...>
        ]);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await tempChannel.send({
        content: `<@${member.id}>, seu painel de controle foi gerado!`,
        embeds: [embed],
        components: [row],
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
