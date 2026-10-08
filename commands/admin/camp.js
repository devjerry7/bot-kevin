// commands/admin/camp.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
            .setEmoji("<:2qn:1542026409067937824>")
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
                    .map((t) => `• ${t.name} (${t.emulatorsCount} emuladores)`)
                    .join("\n") +
                  `\n\n`
                : `<:azu_serv2qn:1542177571750551592> Nenhum alerta de emuladores.\n\n`) +
              (report.incompleteTeams.length > 0
                ? `<:ama_cuidado2qn:1545494059081142403> **Equipes Incompletas (<4 jogadores):**\n` +
                  report.incompleteTeams.map((t) => `• ${t.name}`).join("\n")
                : `<:azu_serv2qn:1542177571750551592> Todas as equipes estão completas.`),
          );

        return message.reply({ embeds: [embedStatus] });
      } catch (err) {
        console.error(err);
        return message.reply("Erro ao gerar o relatório de status do torneio.");
      }
    }

    // ----------------------------------------------------
    // PAINEL DE CONTROLE DOS CONFRONTOS (DINÂMICO POR RODADA)
    // ----------------------------------------------------
    if (subCommand === "confrontos") {
      console.log(
        "\n[LOG-CAMP] >>> Iniciando execução de mc!camp confrontos...",
      );
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

        console.log(
          "[LOG-CAMP] Torneio encontrado no banco:",
          tournament
            ? {
                id: tournament.id,
                status: tournament.status,
                totalTeams: tournament.teams.length,
              }
            : "Nenhum torneio ativo encontrado!",
        );

        if (!tournament) {
          console.log("[LOG-CAMP] ABORTANDO: Torneio nulo.");
          return message.reply(
            "<:ama_cuidado2qn:1545494059081142403> Nenhum torneio ativo encontrado.",
          );
        }

        // Busca todas as rodadas do torneio em ordem
        let rounds = await prisma.round.findMany({
          where: { tournamentId: tournament.id },
          orderBy: { roundNumber: "asc" },
          include: {
            matches: {
              include: { teamA: true, teamB: true },
            },
          },
        });

        // Se não houver rounds criados, cria os padrão
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

        // Determina a rodada ativa (a primeira com partidas PENDING ou a mais avançada com partidas)
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
        console.log(
          `[LOG-CAMP] Rodada ativa detectada: ${activeRound.name} (ID: ${activeRound.id}) | Partidas: ${matches.length}`,
        );

        // Se estivermos no Round 1 e não houver partidas criadas, gera o sorteio inicial
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

          // Recarrega as partidas do Round 1 recém criadas
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

        console.log(
          "[LOG-CAMP] Quantidade de partidas prontas para renderizar:",
          matches.length,
        );
        matches.forEach((m, idx) => {
          console.log(
            `[LOG-CAMP]   -> Partida [${idx + 1}] ID: ${m.id} | Num: ${m.matchNumber} | Status: ${m.status} | TeamA: ${m.teamA?.name} | TeamB: ${m.teamB?.name || "BYE"}`,
          );
        });

        const adminChannel = await message.client.channels
          .fetch(DiscordMatchService.CHANNELS.ADMIN_LOGS)
          .catch(() => null);

        const targetChannel = adminChannel || message.channel;

        let descriptionList = `Abaixo estão listados os confrontos da fase **${activeRound.name}**.\nClique no botão correspondente para **iniciar o confronto.**\n\n`;

        const components = [];
        let currentRow = new ActionRowBuilder();

        matches.forEach((match, i) => {
          const matchNum = match.matchNumber || i + 1;
          const teamAName = match.teamA?.name || "Equipe A";
          const teamBName = match.teamB?.name;

          if (teamBName) {
            const statusBadge =
              match.status === "FINISHED"
                ? "✅ [Finalizada]"
                : match.status === "IN_PROGRESS"
                  ? "⚔️ [Em Andamento]"
                  : "⏳ [Pendente]";
            descriptionList += `${statusBadge} **[Jogo #${matchNum}]** ${teamAName} **VS** ${teamBName}\n`;

            if (currentRow.components.length < 4) {
              currentRow.addComponents(
                new ButtonBuilder()
                  .setCustomId(`start_match_${match.id}`)
                  .setLabel(
                    `Jogo #${matchNum}: ${teamAName} vs ${teamBName}`.substring(
                      0,
                      80,
                    ),
                  )
                  .setStyle(
                    match.status === "FINISHED"
                      ? ButtonStyle.Success
                      : ButtonStyle.Secondary,
                  )
                  .setDisabled(match.status === "FINISHED"),
              );
            } else {
              components.push(currentRow);
              currentRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId(`start_match_${match.id}`)
                  .setLabel(
                    `Jogo #${matchNum}: ${teamAName} vs ${teamBName}`.substring(
                      0,
                      80,
                    ),
                  )
                  .setStyle(
                    match.status === "FINISHED"
                      ? ButtonStyle.Success
                      : ButtonStyle.Secondary,
                  )
                  .setDisabled(match.status === "FINISHED"),
              );
            }
          } else {
            descriptionList += `👤 **[Jogo #${matchNum}]** ${teamAName} avança automaticamente (BYE)\n`;
          }
        });

        if (currentRow.components.length > 0) {
          components.push(currentRow);
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
          components: components.length > 0 ? components : [],
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
            "• Partidas, rodadas e confrontos apagados.\n" +
            "• Equipes e inscrições limpas do banco.\n" +
            "• Tópicos de PIX e partidas removidos do Discord.\n" +
            "• Torneio redefinido e pronto para um novo ciclo de inscrições.",
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
          "<:serv:1545459134089138256> INFORMAÇÕES - CAMPEONATO 4X4 2QN",
        )
        .setColor(hexPurple)
        .setImage(bannerUrl)
        .setDescription(
          `\n\n<:serv:1545488990168158350> **Formato e Regras:**\n` +
            `• Disputa no formato **4x4** (4 jogadores por time).\n` +
            `• **Máximo de 2 emuladores** por equipe.\n` +
            `• Capacidade máxima de **${maxTeams} Equipes**.\n\n` +
            `<:serv:1553154980108828742> **Taxa de Inscrição:**\n` +
            `• Valor: **R$ ${fee}** por equipe.\n\n` +
            `<:serv:1545468689405583370> **Como Participar:**\n` +
            `1. Clique no botão **INSCREVER EQUIPE** em <#1553186399967256629>.\n` +
            `2. Preencha os dados dos 4 jogadores e seus dispositivos.\n` +
            `3. Realize o PIX, entre no tópico gerado e envie o comprovante.`,
        );

      await message.delete().catch(() => {});
      return message.channel.send({ embeds: [embedInfo] });
    }

    return message.reply(
      "Use `mc!camp info`, `painel`, `status`, `confrontos`, `close` ou `reset`.",
    );
  },
};
