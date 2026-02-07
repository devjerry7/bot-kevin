// src/handlers/configHandler.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { guildConfig } = require("../services/guildConfig");

module.exports = async (interaction) => {
  const { customId, values, guild, fields } = interaction;

  // 1. Abertura do Painel via Menu Principal (/config)
  if (customId === "config_main_menu" && values[0] === "cat_verify") {
    await showVerificationPanel(interaction);
    return;
  }

  // 2. Botão "Personalizar Aparência" (Modal)
  if (customId === "btn_verify_customize") {
    const modal = new ModalBuilder()
      .setCustomId("modal_verify_save")
      .setTitle("🎨 Personalizar Painel");

    const titleInput = new TextInputBuilder()
      .setCustomId("input_verify_title")
      .setLabel("Título do Embed")
      .setPlaceholder("Ex: Verificação Obrigatória")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const descInput = new TextInputBuilder()
      .setCustomId("input_verify_desc")
      .setLabel("Descrição")
      .setPlaceholder("Ex: Clique para liberar acesso...")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const imageInput = new TextInputBuilder()
      .setCustomId("input_verify_image")
      .setLabel("URL do Banner (Imgur/Gif)")
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descInput),
      new ActionRowBuilder().addComponents(imageInput)
    );

    await interaction.showModal(modal);
    return;
  }

  // 3. Salvando Aparência (Modal Submit)
  if (customId === "modal_verify_save") {
    const title = fields.getTextInputValue("input_verify_title");
    const description = fields.getTextInputValue("input_verify_desc");
    const image = fields.getTextInputValue("input_verify_image");

    const updateData = {};
    if (title) updateData.verificationTitle = title;
    if (description) updateData.verificationDescription = description;
    if (image) updateData.verificationImage = image;

    if (Object.keys(updateData).length > 0) {
      await guildConfig.update(guild.id, updateData);
      return interaction.reply({
        content: "✅ Aparência salva! Use 'Enviar Painel' para ver.",
        ephemeral: true,
      });
    }
    return interaction.reply({ content: "⚠️ Nada alterado.", ephemeral: true });
  }

  // 4. Botão "Enviar Painel"
  if (customId === "btn_verify_send") {
    await sendVerificationPanelToChannel(interaction);
    return;
  }

  // --- SALVAMENTO DAS CONFIGURAÇÕES (Menus) ---

  // Canal de Entrada
  if (customId === "save_verify_chnnel") {
    await guildConfig.update(guild.id, { verificationChannelId: values[0] });
    return interaction.reply({
      content: `✅ **Canal de Entrada** definido para: <#${values[0]}>`,
      ephemeral: true,
    });
  }

  // Canal de Aprovação
  if (customId === "save_approval_channel") {
    await guildConfig.update(guild.id, { approvalChannelId: values[0] });
    return interaction.reply({
      content: `✅ **Canal de Aprovação** definido para: <#${values[0]}>`,
      ephemeral: true,
    });
  }

  // Cargo que o usuário ganha (Membro)
  if (customId === "save_verified_role") {
    await guildConfig.update(guild.id, { verifiedRoleId: values[0] });
    return interaction.reply({
      content: `✅ **Cargo de Membro** definido para: <@&${values[0]}>`,
      ephemeral: true,
    });
  }

  // Cargo que pode aprovar (Staff) - NOVO!
  if (customId === "save_approver_role") {
    await guildConfig.update(guild.id, { approverRoleId: values[0] });
    return interaction.reply({
      content: `✅ **Cargo de Dono/Aprovador** definido para: <@&${values[0]}>`,
      ephemeral: true,
    });
  }
};

/**
 * Monta o Painel de Configuração (Respeitando o limite de 5 linhas do Discord)
 */
async function showVerificationPanel(interaction) {
  const embed = new EmbedBuilder()
    .setTitle("✅ Configuração: Sistema de Verificação")
    .setDescription("Configure quem entra, quem aprova e onde tudo acontece.")
    .setColor("#00FF00")
    .addFields(
      {
        name: "1️⃣ Onde acontece?",
        value: "Defina o Canal de Entrada e o Canal dos donos.",
      },
      {
        name: "2️⃣ Quem é quem?",
        value: "Defina o Cargo que o membro ganha e o Cargo que aprova.",
      },
      {
        name: "3️⃣ Finalizar",
        value: "Personalize o visual e envie a mensagem.",
      }
    );

  // Linha 1: Canal de Entrada (Onde o membro clica)
  const row1 = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId("save_verify_channel")
      .setPlaceholder("1️⃣ Canal PÚBLICO (Entrada)")
      .setChannelTypes(ChannelType.GuildText)
  );

  // Linha 2: Canal de Aprovação (Onde a staff recebe)
  const row2 = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId("save_approval_channel")
      .setPlaceholder("2️⃣ Canal PRIVADO (donos)")
      .setChannelTypes(ChannelType.GuildText)
  );

  // Linha 3: Cargo de Verificado (Prêmio)
  const row3 = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId("save_verified_role")
      .setPlaceholder("3️⃣ Cargo Entregue (Membro)")
  );

  // Linha 4: Cargo de Aprovador (Quem tem poder) - ADICIONADO
  const row4 = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId("save_approver_role")
      .setPlaceholder("4️⃣ Cargo que Aprova (donoSSSSSSS)")
  );

  // Linha 5: Botões de Ação
  const row5 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_verify_customize")
      .setLabel("🎨 Aparência")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("btn_verify_send")
      .setLabel("Enviar Painel")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🚀")
  );

  await interaction.update({
    embeds: [embed],
    components: [row1, row2, row3, row4, row5], // Usamos exatamente 5 linhas
  });
}

/**
 * Envia a mensagem final para o canal
 */
async function sendVerificationPanelToChannel(interaction) {
  const config = await guildConfig.get(interaction.guild.id);

  if (!config.verificationChannelId) {
    return interaction.reply({
      content: "❌ Configure o **Canal de Entrada** primeiro!",
      ephemeral: true,
    });
  }

  const channel = interaction.guild.channels.cache.get(
    config.verificationChannelId
  );
  if (!channel) {
    return interaction.reply({
      content: "❌ Canal não encontrado.",
      ephemeral: true,
    });
  }

  const verifyEmbed = new EmbedBuilder()
    .setTitle(config.verificationTitle || "🔐 Verificação")
    .setDescription(
      config.verificationDescription || "Clique no botão abaixo para iniciar."
    )
    .setColor(config.embedColor || "#2f3136")
    .setImage(config.verificationImage || null)
    .setFooter({
      text: interaction.guild.name,
      iconURL: interaction.guild.iconURL(),
    });

  const verifyButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("start_verification")
      .setLabel("Iniciar Verificação")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("✅")
  );

  await channel.send({ embeds: [verifyEmbed], components: [verifyButton] });
  return interaction.reply({
    content: `✅ Enviado para ${channel}!`,
    ephemeral: true,
  });
}
