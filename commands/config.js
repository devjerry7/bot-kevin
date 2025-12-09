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
    .setDescription("⚙️ Painel de Configuração Geral (SaaS)."),

  async execute(interaction) {
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

    // Defer para evitar erro 10062
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle("⚙️ Painel de Controle - Bot Kevin")
      .setDescription("Configure cada aspecto do bot neste servidor.")
      .setColor("#2f3136")
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setFooter({ text: "Sistema SaaS Profissional v2.0" });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("config_main_menu")
      .setPlaceholder("📂 Selecione uma categoria...")
      .addOptions(
        {
          label: "Aparência & Identidade",
          description: "Prefixo, Cores, Banners.",
          value: "cat_appearance",
          emoji: "🎨",
        },
        {
          label: "Economia",
          description: "Nome da moeda, Emoji.",
          value: "cat_economy",
          emoji: "💰",
        },
        {
          label: "Boas-Vindas",
          description: "Canais, Mensagens e Imagens.",
          value: "cat_welcome",
          emoji: "👋",
        },
        {
          label: "Logs de Auditoria",
          description: "Canais de log geral.",
          value: "cat_logs",
          emoji: "📝",
        },
        {
          label: "Sistema VIP",
          description: "Cargos e Categorias VIP.",
          value: "cat_vip",
          emoji: "💎",
        },
        {
          label: "Staff & Permissões",
          description: "Hierarquia de Staff.",
          value: "cat_staff",
          emoji: "🛡️",
        },
        {
          label: "Verificação",
          description: "Fluxo de entrada.",
          value: "cat_verify",
          emoji: "✅",
        },
        {
          label: "Proteção",
          description: "Logs de segurança.",
          value: "cat_protection",
          emoji: "👮",
        },
        {
          label: "Tickets",
          description: "Logs HTML e Categorias.",
          value: "cat_ticket",
          emoji: "🎫",
        },
        {
          label: "Jogos & Boosters",
          description: "Auto-Roles de Jogos.",
          value: "cat_games",
          emoji: "🎮",
        }
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};
