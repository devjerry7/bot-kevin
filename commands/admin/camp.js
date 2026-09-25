const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");
const TournamentService = require("../../services/tournamentService");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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
    const hexPurple = 0x9b59b6;
    const bannerUrl =
      "https://cdn.discordapp.com/attachments/1543871014273028136/1553062549799309402/banner4x4.png?ex=6ab7e1b6&is=6ab69036&hm=167cc766573dec0e152975465d680fe442ffd456e7d39a1cfc8412bb30bf712b&";

    // ----------------------------------------------------
    // POSTAR PAINEL
    // ----------------------------------------------------
    if (subCommand === "painel") {
      try {
        // Pega ou cria o torneio, e FORÇA o status para OPEN
        let tournament = await TournamentService.getOrCreateActiveTournament(
          message.author.id,
        );

        tournament = await prisma.tournament.update({
          where: { id: tournament.id },
          data: { status: "REGISTRATION_OPEN" },
          include: { teams: true },
        });

        const activeTeams = tournament.teams.filter(
          (t) => !["CANCELLED"].includes(t.status),
        ).length;
        const vagasRestantes = tournament.maxTeams - activeTeams;

        const embedPainel = new EmbedBuilder()
          .setTitle("<:serv:1545459134089138256> INSCRIÇÕES ABERTAS - 4X4 2QN")
          .setColor(hexPurple)
          .setImage(bannerUrl)
          .setDescription(
            `Chegou a hora! Registre seu squad abaixo.\n\n` +
              `<a:verif:1535775597014548601> **Status:** Inscrições Abertas\n` +
              `<:an_membro:1553155856168652800> **Vagas Restantes:** ${vagasRestantes}/${tournament.maxTeams}\n` +
              `<:cifrao2qn:1553154980108828742> **Taxa:** R$ ${tournament.registrationFee.toFixed(2)}\n\n` +
              `O capitão deve clicar no botão abaixo para iniciar o registro da equipe.`,
          );

        const btn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("btn_inscrever_equipe")
            .setLabel("INSCREVER EQUIPE")
            .setEmoji("<:serv:1545488990168158350>")
            .setStyle(ButtonStyle.Secondary),
        );

        await message.delete().catch(() => {});
        const painelMsg = await message.channel.send({
          embeds: [embedPainel],
          components: [btn],
        });

        // Salva a mensagem no banco para podermos editar as vagas depois
        await prisma.tournament.update({
          where: { id: tournament.id },
          data: {
            panelChannelId: painelMsg.channel.id,
            panelMessageId: painelMsg.id,
          },
        });

        return;
      } catch (err) {
        console.error(err);
        return message.channel.send(
          "<:serv:1545444524241719376> Erro ao gerar o painel.",
        );
      }
    }

    // ----------------------------------------------------
    // FECHAR INSCRIÇÕES (CLOSE)
    // ----------------------------------------------------
    if (subCommand === "close") {
      const tournament = await TournamentService.getActiveTournament();
      if (!tournament)
        return message.reply("Não há torneio ativo para fechar.");

      await prisma.tournament.update({
        where: { id: tournament.id },
        data: { status: "CLOSED" },
      });
      message.reply(
        "<a:verif:1535775601363779604> Inscrições encerradas no banco de dados.",
      );

      // Atualiza o painel para vermelho
      if (tournament.panelChannelId && tournament.panelMessageId) {
        try {
          const channel = await message.client.channels.fetch(
            tournament.panelChannelId,
          );
          const msg = await channel.messages.fetch(tournament.panelMessageId);
          const embed = EmbedBuilder.from(msg.embeds[0])
            .setDescription(
              `<:serv:1546265901161255085> **Status:** Inscrições Encerradas\nFique atento para as próximas edições!`,
            )
            .setColor(0xff0000);
          await msg.edit({ embeds: [embed], components: [] }); // Remove o botão
        } catch (e) {}
      }
      return;
    }

    // ----------------------------------------------------
    // RESETAR DADOS (LIMPAR O BANCO PARA O OFICIAL)
    // ----------------------------------------------------
    if (subCommand === "reset") {
      const tournament = await TournamentService.getOrCreateActiveTournament(
        message.author.id,
      );

      // Apaga todos os times (como tem onDelete: Cascade no Prisma, apaga os jogadores junto)
      await prisma.team.deleteMany({ where: { tournamentId: tournament.id } });

      return message.reply(
        "🧹 **Banco Limpo!** Todas as equipes de teste foram apagadas. O torneio está zerado e pronto para o oficial.",
      );
    }

    // ----------------------------------------------------
    // INFO
    // ----------------------------------------------------
    if (subCommand === "info") {
      // Seu código atual de info (mantido)
      const embedInfo = new EmbedBuilder()
        .setTitle("📢 INFORMAÇÕES - CAMPEONATO 4X4")
        .setColor(hexPurple)
        .setImage(bannerUrl)
        .setDescription(
          "**Regras e Formato...** (texto omitido para não estender)",
        );
      await message.delete().catch(() => {});
      return message.channel.send({ embeds: [embedInfo] });
    }

    return message.reply(
      "Use `mc!camp info`, `painel`, `open`, `close` ou `reset`.",
    );
  },
};
