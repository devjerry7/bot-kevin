// commands/admin/setupdenuncia.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");

module.exports = {
  name: "setupdenuncia",
  aliases: ["setup-denuncia", "paineldenuncia"],
  description: "Posta o painel oficial de denúncias e reclamações do torneio",
  async execute(message, args) {
    // Validação de permissão de Administrador
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply(
        "<:verm_x2qn:1545444524241719376> Apenas administradores podem executar este comando.",
      );
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

    await message.channel.send({
      embeds: [embed],
      components: [row],
    });
  },
};
