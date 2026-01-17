// handlers/configHandler.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelType,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { guildConfig } = require("../services/guildConfig"); // Certifique-se que o caminho está certo

module.exports = async (interaction) => {
  const { customId, values, guild } = interaction;

  // Se a interação foi apenas selecionar uma categoria no Menu Principal (/config)
  if (customId === "config_main_menu") {
    const selected = values[0];

    if (selected === "cat_verify") {
      await showVerificationPanel(interaction);
    }
    // Se tivéssemos outras categorias, o else if viria aqui
    return;
  }

  // --- LÓGICA DE SALVAMENTO (SAVE) ---
  // Aqui processamos quando o usuário escolhe um canal/cargo nos menus abaixo

  // 1. Canal de Entrada (Onde tem o botão verificar)
  if (customId === "save_verify_channel") {
    await guildConfig.update(guild.id, "verificationChannelId", values[0]);
    return interaction.reply({
      content: `✅ **Canal de Verificação** definido para: <#${values[0]}>`,
      ephemeral: true,
    });
  }

  // 2. Canal de Aprovação (Onde caem as fichas para staff)
  if (customId === "save_approval_channel") {
    await guildConfig.update(guild.id, "approvalChannelId", values[0]);
    return interaction.reply({
      content: `✅ **Canal de Aprovação** definido para: <#${values[0]}>`,
      ephemeral: true,
    });
  }

  // 3. Canal de Logs (Aprovados/Reprovados)
  if (customId === "save_log_channel") {
    await guildConfig.update(guild.id, "approvedLogChannelId", values[0]);
    return interaction.reply({
      content: `✅ **Canal de Logs** definido para: <#${values[0]}>`,
      ephemeral: true,
    });
  }

  // 4. Cargo de Verificado (Quem passou)
  if (customId === "save_verified_role") {
    await guildConfig.update(guild.id, "verifiedRoleId", values[0]);
    return interaction.reply({
      content: `✅ **Cargo de Verificado** definido para: <@&${values[0]}>`,
      ephemeral: true,
    });
  }
};

/**
 * Função auxiliar que desenha o Painel de Verificação
 */
async function showVerificationPanel(interaction) {
  // Busca configs atuais para mostrar o estado atual (opcional, mas profissional)
  // const currentConfig = await guildConfig.get(interaction.guild.id);

  const embed = new EmbedBuilder()
    .setTitle("✅ Configuração: Sistema de Verificação")
    .setDescription(
      "Configure abaixo os canais e cargos automáticos do sistema de entrada."
    )
    .setColor("#00FF00")
    .addFields(
      {
        name: "1️⃣ Canal de Entrada",
        value: "Onde fica o botão para iniciar verificação.",
      },
      {
        name: "2️⃣ Canal de Aprovação",
        value: "Canal privado onde a Staff recebe as fichas.",
      },
      {
        name: "3️⃣ Canal de Logs",
        value: "Onde avisa quem foi aprovado/reprovado.",
      },
      { name: "4️⃣ Cargo Verificado", value: "Cargo entregue após aprovação." }
    );

  // Menu 1: Selecionar Canal de Entrada
  const row1 = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId("save_verify_channel")
      .setPlaceholder("1️⃣ Selecione o Canal de Entrada")
      .setChannelTypes(ChannelType.GuildText)
  );

  // Menu 2: Selecionar Canal de Aprovação
  const row2 = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId("save_approval_channel")
      .setPlaceholder("2️⃣ Selecione o Canal de Aprovação (Staff)")
      .setChannelTypes(ChannelType.GuildText)
  );

  // Menu 3: Selecionar Canal de Logs
  const row3 = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId("save_log_channel")
      .setPlaceholder("3️⃣ Selecione o Canal de Logs")
      .setChannelTypes(ChannelType.GuildText)
  );

  // Menu 4: Selecionar Cargo Verificado
  const row4 = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId("save_verified_role")
      .setPlaceholder("4️⃣ Selecione o Cargo de Verificado")
  );

  await interaction.update({
    embeds: [embed],
    components: [row1, row2, row3, row4],
  });
}
