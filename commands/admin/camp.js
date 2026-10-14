// commands/admin/camp.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  PermissionsBitField,
} = require("discord.js");
const TournamentService = require("../../services/tournamentService");
const DiscordMatchService = require("../../services/discordMatchService");
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
            .setEmoji("<:2qnlogo:1559289750601334815>")
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
    // LISTAR TIMES INSCRITOS
    // ----------------------------------------------------
    if (subCommand === "times" || subCommand === "lista") {
      try {
        const tournament = await prisma.tournament.findFirst({
          where: {
            status: {
              in: ["REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"],
            },
          },
          include: {
            teams: {
              include: {
                players: true,
              },
            },
          },
        });

        if (!tournament || !tournament.teams || tournament.teams.length === 0) {
          return message.reply(
            "<:ama_cuidado2qn:1545494059081142403> Nenhum torneio ativo encontrado ou nenhuma equipe cadastrada no momento.",
          );
        }

        const embedTeams = new EmbedBuilder()
          .setTitle(
            `<:serv:1545459134089138256> EQUIPES INSCRITAS - ${tournament.name || "TORNEIO 4X4"}`,
          )
          .setColor(hexPurple)
          .setTimestamp();

        let description = `Total de equipes cadastradas: **${tournament.teams.length} / ${tournament.maxTeams}**\n\n`;

        tournament.teams.forEach((team, index) => {
          const playersList =
            team.players && team.players.length > 0
              ? team.players
                  .map(
                    (p) => `• <@${p.discordId}> (${p.gameNick || p.username})`,
                  )
                  .join("\n")
              : "Nenhum jogador cadastrado.";

          description += `**${index + 1}. ${team.name}** [Status: \`${team.status}\`]\n${playersList}\n\n`;
        });

        if (description.length > 4096) {
          description = description.substring(0, 4093) + "...";
        }

        embedTeams.setDescription(description);
        return message.reply({ embeds: [embedTeams] });
      } catch (err) {
        console.error("[LOG-CAMP] Erro ao listar equipes:", err);
        return message.reply("❌ Erro ao buscar a lista de equipes inscritas.");
      }
    }

    // ----------------------------------------------------
    // STATUS / RELATÓRIO DE INTEGRIDADE
    // ----------------------------------------------------
    if (subCommand === "status") {
      try {
        const tournament =
          (await TournamentService.getActiveTournament()) ||
          (await TournamentService.getOrCreateActiveTournament(
            message.author.id,
          ));
        const report = await TournamentService.getTournamentAuditReport(
          tournament.id,
        );

        const embedStatus = new EmbedBuilder()
          .setTitle(
            `<:serv:1545459134089138256> RELATÓRIO DE INTEGRIDADE - ${report.tournamentName}`,
          )
          .setColor(hexPurple)
          .setDescription(
            `<:rx_2qn:1542026409067937824> **Status do Torneio:** \`${report.status}\`\n` +
              `<:rx_pessoinhas2qn:1553155856168652800> **Total Inscritos:** ${report.totalRegistered} / ${report.maxTeams}\n` +
              `<a:rx_verfi2qn:1553155625738051604> **Confirmados:** ${report.confirmedCount}\n` +
              `<:marr_tempo2qn:1545445362255400960> **Pagamento Pendente/Revisão:** ${report.pendingPaymentCount}\n` +
              `<:verd_notas2qn:1545488990168158350> **Lista de Espera:** ${report.waitlistCount}\n\n` +
              (report.emulatorOverflows.length > 0
                ? `<:ama_cuidado2qn:1545494059081142403> **Alerta de Emuladores (>2):**\n` +
                  report.emulatorOverflows
                    .map(
                      (t) =>
                        `<:br_pontinho2qn:1545828067035848814> ${t.name} (${t.emulatorsCount} emuladores)`,
                    )
                    .join("\n") +
                  `\n\n`
                : `<:azu_serv2qn:1542177571750551592> Nenhum alerta de emuladores.\n\n`) +
              (report.incompleteTeams.length > 0
                ? `<:ama_cuidado2qn:1545494059081142403> **Equipes Incompletas (<4 jogadores):**\n` +
                  report.incompleteTeams
                    .map(
                      (t) => `<:br_pontinho2qn:1545828067035848814> ${t.name}`,
                    )
                    .join("\n")
                : `<:azu_serv2qn:1542177571750551592> Todas as equipes estão completas.`),
          );

        return message.reply({ embeds: [embedStatus] });
      } catch (err) {
        console.error(err);
        return message.reply("Erro ao gerar o relatório de status do torneio.");
      }
    }

    // ----------------------------------------------------
    // PAINEL DE CONTROLE DOS CONFRONTOS (DROPDOWN MENU)
    // ----------------------------------------------------
    if (subCommand === "confrontos") {
      try {
        let tournament = await prisma.tournament.findFirst({
          where: {
            status: {
              in: ["REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"],
            },
          },
          include: {
            teams: true,
          },
        });

        if (!tournament) {
          return message.reply(
            "<:ama_cuidado2qn:1545494059081142403> Nenhum torneio ativo encontrado.",
          );
        }

        let rounds = await prisma.round.findMany({
          where: { tournamentId: tournament.id },
          orderBy: { roundNumber: "asc" },
          include: {
            matches: {
              include: { teamA: true, teamB: true },
            },
          },
        });

        if (!rounds || rounds.length === 0) {
          const roundsData = [
            { roundNumber: 1, name: "32avos (R32)", matchType: "BO1" },
            { roundNumber: 2, name: "Oitavas (R16)", matchType: "BO1" },
            { roundNumber: 3, name: "Quartas de Final", matchType: "BO1" },
            { roundNumber: 4, name: "Semifinal", matchType: "BO1" },
            { roundNumber: 5, name: "Grande Final", matchType: "BO3" },
          ];
          for (const r of roundsData) {
            await prisma.round.create({
              data: { tournamentId: tournament.id, ...r },
            });
          }
          rounds = await prisma.round.findMany({
            where: { tournamentId: tournament.id },
            orderBy: { roundNumber: "asc" },
            include: {
              matches: { include: { teamA: true, teamB: true } },
            },
          });
        }

        let activeRound = rounds.find((r) =>
          r.matches.some((m) => m.status === "PENDING"),
        );
        if (!activeRound) {
          const roundsWithMatches = rounds.filter((r) => r.matches.length > 0);
          if (roundsWithMatches.length > 0) {
            activeRound = roundsWithMatches[roundsWithMatches.length - 1];
          } else {
            activeRound = rounds.find((r) => r.roundNumber === 1) || rounds[0];
          }
        }

        let matches = activeRound.matches;

        if (activeRound.roundNumber === 1 && matches.length === 0) {
          const activeTeams = tournament.teams.filter(
            (t) => !["CANCELLED"].includes(t.status),
          );

          if (activeTeams.length < 2) {
            return message.reply(
              "<:ama_cuidado2qn:1545494059081142403> É preciso ter pelo menos 2 equipes cadastradas para gerar os confrontos.",
            );
          }

          const shuffledTeams = [...activeTeams].sort(
            () => Math.random() - 0.5,
          );

          let matchCounter = 1;
          for (let i = 0; i < shuffledTeams.length; i += 2) {
            const teamA = shuffledTeams[i];
            const teamB = shuffledTeams[i + 1] || null;

            await prisma.match.create({
              data: {
                tournamentId: tournament.id,
                roundId: activeRound.id,
                matchNumber: matchCounter++,
                teamAId: teamA.id,
                teamBId: teamB ? teamB.id : null,
                status: teamB ? "PENDING" : "FINISHED",
                winnerTeam: teamB ? undefined : { connect: { id: teamA.id } },
              },
            });
          }

          await prisma.tournament.update({
            where: { id: tournament.id },
            data: { status: "IN_PROGRESS" },
          });

          rounds = await prisma.round.findMany({
            where: { tournamentId: tournament.id },
            orderBy: { roundNumber: "asc" },
            include: {
              matches: { include: { teamA: true, teamB: true } },
            },
          });
          activeRound = rounds.find((r) => r.roundNumber === 1);
          matches = activeRound.matches;
        }

        const groupedMatchesMap = new Map();

        matches.forEach((m) => {
          const matchNum = m.matchNumber;
          if (!groupedMatchesMap.has(matchNum)) {
            groupedMatchesMap.set(matchNum, []);
          }
          groupedMatchesMap.get(matchNum).push(m);
        });

        const sortedMatchNumbers = Array.from(groupedMatchesMap.keys()).sort(
          (a, b) => a - b,
        );

        const adminChannel = await message.client.channels
          .fetch(DiscordMatchService.CHANNELS.ADMIN_LOGS)
          .catch(() => null);

        const targetChannel = adminChannel || message.channel;

        let descriptionList = `Abaixo estão listados os confrontos da fase **${activeRound.name}**.\nSelecione a partida no menu abaixo para **iniciar o confronto.**\n\n`;

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("select_start_match")
          .setPlaceholder("Selecione um confronto para iniciar...")
          .setMinValues(1)
          .setMaxValues(1);

        let hasPendingMatches = false;

        sortedMatchNumbers.forEach((matchNum) => {
          const matchGroup = groupedMatchesMap.get(matchNum);

          const activeOrPendingMatch =
            matchGroup.find((m) => m.status === "IN_PROGRESS") ||
            matchGroup.find((m) => m.status === "PENDING") ||
            matchGroup[matchGroup.length - 1];

          const isGroupFinished = matchGroup.every(
            (m) => m.status === "FINISHED",
          );
          const isGroupInProgress = matchGroup.some(
            (m) => m.status === "IN_PROGRESS",
          );

          const teamAName = activeOrPendingMatch.teamA?.name || "Equipe A";
          const teamBName = activeOrPendingMatch.teamB?.name;

          if (teamBName) {
            const statusBadge = isGroupFinished
              ? "<a:ver_verifcado2qn:1535775624864473169> [Finalizada]"
              : isGroupInProgress
                ? "<:jg_espada2qn:1555686156434411680> [Em Andamento]"
                : "<:marr_tempo2qn:1545445362255400960> [Pendente]";

            descriptionList += `${statusBadge} **[Jogo ${matchNum}]** ${teamAName} **VS** ${teamBName}\n`;

            if (!isGroupFinished) {
              hasPendingMatches = true;
              selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel(
                    `Jogo ${matchNum}: ${teamAName} vs ${teamBName}`.substring(
                      0,
                      100,
                    ),
                  )
                  .setValue(activeOrPendingMatch.id)
                  .setDescription(
                    isGroupInProgress
                      ? "Confronto em andamento (já iniciado)"
                      : "Clique para criar a infraestrutura privada",
                  ),
              );
            }
          } else {
            descriptionList += `👤 **[Jogo ${matchNum}]** ${teamAName} avança automaticamente (BYE)\n`;
          }
        });

        const components = [];
        if (hasPendingMatches) {
          components.push(new ActionRowBuilder().addComponents(selectMenu));
        }

        const embedConfrontos = new EmbedBuilder()
          .setTitle(
            `<:jg_game2qn:1546273610971218000> PAINEL DE CONTROLE - ${activeRound.name.toUpperCase()}`,
          )
          .setColor(hexPurple)
          .setImage(bannerUrl)
          .setDescription(descriptionList);

        await targetChannel.send({
          embeds: [embedConfrontos],
          components,
        });

        return message.reply(
          `<a:rx_verfi2qn:1553155625738051604> Painel de confrontos (${activeRound.name}) gerado e enviado com sucesso no canal de administração!`,
        );
      } catch (err) {
        console.error("[LOG-CAMP] ERRO CRÍTICO NO SUBCOMANDO CONFRONTOS:", err);
        return message.reply("Erro ao gerar o painel de confrontos.");
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
        data: { status: "REGISTRATION_CLOSED" },
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
    // RESETAR DADOS (LIMPEZA GERAL DO TORNEIO)
    // ----------------------------------------------------
    if (subCommand === "reset") {
      try {
        const tournament = await prisma.tournament.findFirst({
          where: {
            status: {
              in: ["REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"],
            },
          },
        });

        if (!tournament) {
          return message.reply("Não há torneio ativo para resetar.");
        }

        try {
          const fetchedThreads =
            await message.guild.channels.fetchActiveThreads();
          for (const thread of fetchedThreads.threads.values()) {
            if (
              thread.name.startsWith("pix-") ||
              thread.name.startsWith("match-") ||
              thread.name.startsWith("partida-")
            ) {
              await thread.delete().catch(() => {});
            }
          }
        } catch (e) {}

        await prisma.$transaction(async (tx) => {
          await tx.match.deleteMany({ where: { tournamentId: tournament.id } });
          await tx.round.deleteMany({ where: { tournamentId: tournament.id } });
          await tx.team.deleteMany({ where: { tournamentId: tournament.id } });

          await tx.tournament.update({
            where: { id: tournament.id },
            data: {
              status: "REGISTRATION_OPEN",
              panelChannelId: null,
              panelMessageId: null,
            },
          });
        });

        return message.reply(
          "🧹 **Reset Geral Realizado com Sucesso!**\n" +
            "<:br_pontinho2qn:1545828067035848814> Partidas, rodadas e confrontos apagados.\n" +
            "<:br_pontinho2qn:1545828067035848814> Equipes e inscrições limpas do banco.\n" +
            "<:br_pontinho2qn:1545828067035848814> Tópicos de PIX e partidas removidos do Discord.\n" +
            "<:br_pontinho2qn:1545828067035848814> Torneio redefinido e pronto para um novo ciclo de inscrições.",
        );
      } catch (err) {
        console.error("[LOG-CAMP] Erro ao executar reset geral:", err);
        return message.reply(
          "❌ Ocorreu um erro ao tentar resetar o torneio no banco de dados.",
        );
      }
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
          "<a:am_trofeu2qn:1556881758723776605> INFORMAÇÕES - CAMPEONATO 4X4 2QN",
        )
        .setColor(hexPurple)
        .setImage(bannerUrl)
        .setDescription(
          `\n\n<:serv:1545488990168158350> **Formato e Regras:**\n` +
            `<:br_pontinho2qn:1545828067035848814> Disputa no formato **4x4** (4 jogadores por time).\n` +
            `<:br_pontinho2qn:1545828067035848814> Máximo de **2 emuladores** por equipe.\n` +
            `<:br_pontinho2qn:1545828067035848814> Limite de **${maxTeams} equipes**.\n\n` +
            `<:serv:1553154980108828742> **Inscrição:**\n` +
            `<:br_pontinho2qn:1545828067035848814> **R$ ${fee} por equipe**.\n` +
            `<:br_pontinho2qn:1545828067035848814> Inscrição confirmada após o envio do comprovante PIX.\n\n` +
            `<a:am_trofeu2qn:1556881758723776605> **Premiação:**\n` +
            `<:br_pontinho2qn:1545828067035848814> **R$ 200,00** para o campeonato.\n\n` +
            `<:br_calendario2qn:1545457506392875118> **Data do campeonato:**\n` +
            `<:br_pontinho2qn:1545828067035848814> Será divulgada após o encerramento das inscrições.\n\n` +
            `<:am_presente2qn:1546265787776503888> **Sorteio para membros:**\n` +
            `<:br_pontinho2qn:1545828067035848814> Durante a final, haverá sorteio para os membros da 2QN.\n\n` +
            `<:serv:1545468689405583370> **Como Participar:**\n` +
            `1. Clique em **INSCREVER EQUIPE** em <#1553186399967256629>.\n` +
            `2. Preencha os dados dos 4 jogadores e seus dispositivos.\n` +
            `3. Realize o PIX e envie o comprovante no tópico gerado.`,
        );

      await message.delete().catch(() => {});
      return message.channel.send({ embeds: [embedInfo] });
    }

    return message.reply(
      "Use `mc!camp info`, `painel`, `times`, `status`, `confrontos`, `close` ou `reset`.",
    );
  },
};
