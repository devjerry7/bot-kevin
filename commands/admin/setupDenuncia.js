// commands/admin/setupDenuncia.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-denuncia")
    .setDescription(
      "Posta o painel oficial de denúncias e reclamações do torneio.",
    ),

  async execute(interaction) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator,
      )
    ) {
      return interaction.reply({
        content:
          "<:verm_x2qn:1545444524241719376> Apenas administradores podem executar este comando.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(
        "<a:verm_alerta2qn:1555456678256975974> PAINEL OFICIAL DE DENÚNCIAS — TORNEIO 4X4",
      )
      .setColor(0xe74c3c)
      .setDescription(
        `Presenciou alguma irregularidade ou descumprimento das regras durante o torneio? Abra uma denúncia formal com a nossa equipe de moderação.\n\n` +
          `**<:br_registro2qn:1557798191100072119> Regras e Diretrizes:**\n` +
          `• **Uso de Hacks/Cheats:** Proibição imediata e banimento permanente.\n` +
          `• **Emuladores Excedidos:** Máximo de 2 emuladores por equipe.\n` +
          `• **Jogador Gatuno:** Apenas jogadores inscritos na line podem jogar.\n` +
          `• **Provas Obrigatórias:** Tenha prints ou vídeos comprovando a infração.\n\n` +
          `*Clique no botão abaixo para abrir seu tópico privado de denúncia.*`,
      )
      .setFooter({ text: "2qn" })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("btn_open_report_ticket")
        .setLabel("Abrir Denúncia")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<a:verm_alerta2qn:1555456678256975974>"),
    );

    await interaction.channel.send({
      embeds: [embed],
      components: [row],
    });

    return interaction.reply({
      content:
        "<a:ver_verifcado2qn:1535775624864473169> Painel de denúncias postado com sucesso neste canal!",
      flags: MessageFlags.Ephemeral,
    });
  },
};
