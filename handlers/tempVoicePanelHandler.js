// handlers/tempVoicePanelHandler.js
const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  PermissionFlagsBits,
  UserSelectMenuBuilder,
} = require("discord.js");

module.exports = async (interaction) => {
  if (
    !interaction.isButton() &&
    !interaction.isStringSelectMenu() &&
    !interaction.isModalSubmit() &&
    !interaction.isUserSelectMenu()
  )
    return;

  let customId = interaction.customId;

  // Se for o menu dropdown principal, pegamos o valor selecionado (ex: "vpanel_lock")
  if (interaction.isStringSelectMenu() && customId === "vpanel_menu") {
    customId = interaction.values[0];
  }

  if (
    !customId.startsWith("vpanel_") &&
    !customId.startsWith("vmodal_") &&
    !customId.startsWith("vselect_")
  )
    return;

  // Pega o canal exato onde a interação foi acionada
  const channel = interaction.channel;
  const member = interaction.member;

  const EMOJI_ERROR = "<:br_errado2qn:1556905095919050762>";

  if (!channel) {
    return interaction.reply({
      content: `${EMOJI_ERROR} Canal não encontrado para este painel.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // Valida se quem executou é o dono da sala (possui ManageChannels explícito nela)
  const isOwner = channel
    .permissionsFor(member)
    ?.has(PermissionFlagsBits.ManageChannels);
  if (!isOwner) {
    return interaction.reply({
      content: `${EMOJI_ERROR} Apenas o **dono** desta sala específica pode usar este painel!`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // 🔒 Privar Call
  if (customId === "vpanel_lock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: false,
    });
    await channel.permissionOverwrites.edit(member.id, { Connect: true });

    const replyMethod = interaction.isStringSelectMenu()
      ? interaction.update
      : interaction.reply;
    return replyMethod({
      content:
        "<:br_proibido2qn:1556914029841088573> Sua call foi **privada** com sucesso!",
      flags: MessageFlags.Ephemeral,
    });
  }

  // 🔓 Abrir Call
  if (customId === "vpanel_unlock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, {
      Connect: true,
    });

    const replyMethod = interaction.isStringSelectMenu()
      ? interaction.update
      : interaction.reply;
    return replyMethod({
      content:
        "<:br_correto2qn:1556905093729882217> Sua call foi **aberta** para todos!",
      flags: MessageFlags.Ephemeral,
    });
  }

  // ✏️ Modal para Mudar Nome
  if (customId === "vpanel_rename") {
    const modal = new ModalBuilder()
      .setCustomId("vmodal_rename")
      .setTitle("Alterar Nome da Sala");
    const nameInput = new TextInputBuilder()
      .setCustomId("new_name")
      .setLabel("Novo nome:")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(30)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && customId === "vmodal_rename") {
    const newName = interaction.fields.getTextInputValue("new_name");
    await channel.setName(newName);
    return interaction.reply({
      content: `<:br_incricao2qn:1556905090835546173> Nome alterado para **${newName}**!`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // 👥 Modal para Alterar Limite
  if (customId === "vpanel_limit") {
    const modal = new ModalBuilder()
      .setCustomId("vmodal_limit")
      .setTitle("Alterar Limite de Pessoas");
    const limitInput = new TextInputBuilder()
      .setCustomId("new_limit")
      .setLabel("Limite (0 a 99):")
      .setStyle(TextInputStyle.Short)
      .setMaxLength(2)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && customId === "vmodal_limit") {
    const limit = parseInt(
      interaction.fields.getTextInputValue("new_limit"),
      10,
    );
    if (isNaN(limit) || limit < 0 || limit > 99) {
      return interaction.reply({
        content:
          "<:br_errado2qn:1556905095919050762> Insira um valor entre 0 e 99.",
        flags: MessageFlags.Ephemeral,
      });
    }
    await channel.setUserLimit(limit);
    return interaction.reply({
      content: `<:pr_pessoinha2qn:1542026405481684994> Limite da call alterado para **${limit === 0 ? "Ilimitado" : limit}**!`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // ➕ Permitir Amigo
  if (customId === "vpanel_add") {
    const select = new UserSelectMenuBuilder()
      .setCustomId("vselect_add")
      .setPlaceholder("Selecione quem pode entrar...")
      .setMinValues(1)
      .setMaxValues(1);
    const row = new ActionRowBuilder().addComponents(select);

    const replyMethod = interaction.isStringSelectMenu()
      ? interaction.update
      : interaction.reply;
    return replyMethod({
      content: "Selecione o usuário que deseja **permitir** na call:",
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  }

  if (interaction.isUserSelectMenu() && customId === "vselect_add") {
    const targetId = interaction.values[0];
    await channel.permissionOverwrites.edit(targetId, { Connect: true });
    return interaction.update({
      content: `<:br_correto2qn:1556905093729882217> Permissão concedida para <@${targetId}> entrar na call!`,
      components: [],
    });
  }

  // 👢 Expulsar Usuário
  if (customId === "vpanel_kick") {
    const select = new UserSelectMenuBuilder()
      .setCustomId("vselect_kick")
      .setPlaceholder("Selecione quem deseja expulsar...")
      .setMinValues(1)
      .setMaxValues(1);
    const row = new ActionRowBuilder().addComponents(select);

    const replyMethod = interaction.isStringSelectMenu()
      ? interaction.update
      : interaction.reply;
    return replyMethod({
      content: "Selecione o usuário que deseja **expulsar** da call:",
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  }

  if (interaction.isUserSelectMenu() && customId === "vselect_kick") {
    const targetId = interaction.values[0];
    const targetMember = await interaction.guild.members
      .fetch(targetId)
      .catch(() => null);

    if (targetMember && targetMember.voice.channel?.id === channel.id) {
      await targetMember.voice.disconnect();
      return interaction.update({
        content: `<:br_errado2qn:1556905095919050762> <@${targetId}> foi expulso da call com sucesso!`,
        components: [],
      });
    }
    return interaction.update({
      content:
        "<:br_errado2qn:1556905095919050762> O usuário selecionado não está na sua call.",
      components: [],
    });
  }
};
