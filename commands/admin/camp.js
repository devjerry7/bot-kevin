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
      "https://cdn.discordapp.com/attachments/1553534170179833951/1554904332820811907/banner-4x4.png?backend=b2&ex=6abe9501&is=6abd4381&hm=b001ceec28465e6503027ed906c4db45ee9ed4faac57f84c17924b3d3af399a6&";

    // ----------------------------------------------------
    // POSTAR PAINEL
    // ----------------------------------------------------
    if (subCommand === "painel") {
      try {
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
              `<a:2qn:1553155625738051604> **Status:** Inscrições Abertas\n` +
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
          await msg.edit({ embeds: [embed], components: [] });
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

      await prisma.team.deleteMany({ where: { tournamentId: tournament.id } });

      return message.reply(
        "🧹 **Banco Limpo!** Todas as equipes de teste foram apagadas. O torneio está zerado e pronto para o oficial.",
      );
    }

    // ----------------------------------------------------
    // INFO
    // ----------------------------------------------------
    if (subCommand === "info") {
      const tournament = await TournamentService.getActiveTournament();
      const fee = tournament ? tournament.registrationFee.toFixed(2) : "10.00";
      const maxTeams = tournament ? tournament.maxTeams : 32;

      const embedInfo = new EmbedBuilder()
        .setTitle(
          "<:serv:1545459134089138256> INFORMAÇÕES - CAMPEONATO 4X4 2QN",
        )
        .setColor(hexPurple)
        .setImage(bannerUrl)
        .setDescription(
          `Bem-vindo ao nosso Campeonato Oficial 4x4!\n\n` +
            `<:serv:1545459134089138256> **Formato e Estrutura:**\n` +
            `• Disputa no formato **4x4**.\n` +
            `• Capacidade máxima de **${maxTeams} Equipes**.\n` +
            `<:cifrao2qn:1553154980108828742> **Taxa de Inscrição e Pagamento:**\n` +
            `• Valor: **R$ ${fee}** por equipe.\n` +
            `• O envio do comprovante deve ser feito através do tópico privado gerado pelo bot após o pré-registro.\n\n` +
            `📌 **Como Participar:**\n` +
            `1. Clique no botão **INSCREVER EQUIPE** em <#1553186399967256629>\n` +
            `2. Selecione os 3 membros do seu squad.\n` +
            `3. Preencha o formulário informando o nome do time e os nicks corretos.\n` +
            `4. Realize o PIX, abra o tópico criado pelo bot e envie o comprovante para validação da equipe.`,
        );

      await message.delete().catch(() => {});
      return message.channel.send({ embeds: [embedInfo] });
    }

    return message.reply("Use `mc!camp info`, `painel`, `close` ou `reset`.");
  },
};
