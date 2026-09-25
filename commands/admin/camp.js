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
  description: "Gerencia o campeonato 4x4 (Admin)",

  async execute(message, args) {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply("Apenas administradores podem usar este comando.");
    }

    const subCommand = args[0]?.toLowerCase();
    const hexPurple = 0x9b59b6; // Cor roxa
    const bannerUrl =
      "https://cdn.discordapp.com/attachments/1543871014273028136/1553062549799309402/banner4x4.png?ex=6ab7e1b6&is=6ab69036&hm=167cc766573dec0e152975465d680fe442ffd456e7d39a1cfc8412bb30bf712b&";

    // ==========================================
    // mc!camp info -> Postar em 📢・informações-camp
    // ==========================================
    if (subCommand === "info") {
      const embedInfo = new EmbedBuilder()
        .setTitle("<:emoji_aqui:ID> INFORMAÇÕES - CAMPEONATO 4X4")
        .setColor(hexPurple)
        .setImage(bannerUrl)
        .setDescription(
          "**Formato e Regras:**\n" +
            "• **Fases:** Mata-mata (R32 até Semifinal: MD1 | Final: MD3)\n" +
            "• **Formação:** 4 Jogadores por equipe\n" +
            "• **Plataforma:** Máximo de 2 Emuladores por time\n" +
            "• **Inscrição:** R$ 10,00 por equipe\n\n" +
            "**Como se inscrever:**\n" +
            "1. Vá ao canal de inscrições.\n" +
            "2. O capitão clica no botão e seleciona os 3 membros da equipe.\n" +
            "3. Preencha os nicks do jogo no formulário.\n" +
            "4. Realize o pagamento via PIX e envie o comprovante no painel.",
        );

      await message.delete().catch(() => {});
      return message.channel.send({ embeds: [embedInfo] });
    }

    // ==========================================
    // mc!camp painel -> Postar em 📝・inscrições
    // ==========================================
    if (subCommand === "painel") {
      try {
        // Força a criação/abertura do torneio no banco ao postar o painel
        const tournament = await TournamentService.getOrCreateActiveTournament(
          message.author.id,
        );

        const embedPainel = new EmbedBuilder()
          .setTitle("<:emoji_aqui:ID> INSCRIÇÕES ABERTAS - 4X4")
          .setColor(hexPurple)
          .setImage(bannerUrl)
          .setDescription(
            `**Status:** Abertas\n` +
              `**Vagas:** ${tournament.maxTeams} Equipes\n` +
              `**Taxa:** R$ ${tournament.registrationFee.toFixed(2)}\n\n` +
              `O capitão deve clicar no botão abaixo para iniciar o registro da equipe.`,
          );

        const btn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("btn_inscrever_equipe")
            .setLabel("INSCREVER EQUIPE")
            .setEmoji("<:emoji_aqui:ID>") // Coloque o ID do seu emoji customizado aqui
            .setStyle(ButtonStyle.Primary),
        );

        await message.delete().catch(() => {});
        return message.channel.send({
          embeds: [embedPainel],
          components: [btn],
        });
      } catch (err) {
        console.error("[CAMP CMD ERROR]", err);
        return message.reply(
          "Erro ao gerar o painel. Verifique o banco de dados.",
        );
      }
    }

    return message.reply(
      "Comando inválido. Use `mc!camp info` ou `mc!camp painel`.",
    );
  },
};
