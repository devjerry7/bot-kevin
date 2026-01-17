// commands/config.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("⚙️ Painel de Configuração - Verificação."),

  async execute(interaction) {
    // 1. Verificação de Segurança (Apenas Admin)
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return interaction.reply({
        content: "⛔ Sem permissão.",
        ephemeral: true,
      });
    }

    // 2. Defer (Evita o erro "A interação falhou" se demorar)
    await interaction.deferReply({ ephemeral: true });

    // 3. O Embed Principal
    const embed = new EmbedBuilder()
      .setTitle("⚙️ Configuração do Sistema")
      .setDescription("Selecione abaixo o módulo que deseja configurar.")
      .setColor("#2f3136")
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setFooter({ text: "Painel de Controle v2.0" });

    // 4. O Menu (Limpo, apenas com Verificação)
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("config_main_menu") // Importante: Vamos procurar esse ID no interactionCreate
      .setPlaceholder("📂 Selecione uma opção...")
      .addOptions({
        label: "Sistema de Verificação",
        description: "Canais de entrada, aprovação, logs e cargos.",
        value: "cat_verify", // Esse é o valor que o backend vai receber
        emoji: "✅",
      });

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};
