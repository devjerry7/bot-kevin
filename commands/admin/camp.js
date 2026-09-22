// commands/admin/camp.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");
const TournamentService = require("../../services/tournamentService");

module.exports = {
  name: "camp",
  description: "Gerencia e posta o painel do Campeonato 4x4",
  async execute(message, args) {
    try {
      if (
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return message.reply(
          "❌ Apenas administradores podem usar este comando.",
        );
      }

      const action = args[0]?.toLowerCase();

      if (action === "painel") {
        const tournament = await TournamentService.getOrCreateActiveTournament(
          message.author.id,
        );

        const embed = new EmbedBuilder()
          .setTitle("🏆 CAMPEONATO 4X4 2QN — INSCRIÇÕES ABERTAS")
          .setDescription(
            `Bem-vindo ao campeonato oficial 4x4 da comunidade 2QN!\n\n` +
              `📌 **Informações Gerais:**\n` +
              `• **Vagas:** ${tournament.maxTeams} Equipes\n` +
              `• **Jogadores por Time:** ${tournament.playersPerTeam}\n` +
              `• **Máximo de Emuladores:** ${tournament.maxEmulatorsPerTeam} por equipe\n` +
              `• **Taxa de Inscrição:** R$ ${tournament.registrationFee.toFixed(2)}\n` +
              `• **Formato:** Eliminatório (MD1 nas fases / MD3 na Grande Final)\n\n` +
              ` Clique no botão abaixo para registrar sua equipe!`,
          )
          .setColor(0x00ffcc)
          .setFooter({ text: "2QN Tournament Manager" })
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("btn_inscrever_equipe")
            .setLabel("🏆 INSCREVER EQUIPE")
            .setStyle(ButtonStyle.Success),
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        return message.reply(
          "✅ Painel do campeonato enviado com sucesso neste canal!",
        );
      }

      return message.reply(
        "🛠️ **Comandos do Campeonato:**\n" +
          "`mc!camp painel` - Posta o painel com o botão de inscrição no canal atual.",
      );
    } catch (err) {
      console.error("[ERRO COMANDO CAMP]", err);
      return message.reply(
        "❌ Ocorreu um erro ao carregar o comando do campeonato.",
      );
    }
  },
};
