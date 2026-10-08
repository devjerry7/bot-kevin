// services/tournamentService.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class TournamentService {
  /**
   * Busca apenas o campeonato que está com inscrições abertas.
   * Usado principalmente no fluxo de botões/modais acessados pelos jogadores.
   */
  static async getActiveTournament() {
    return await prisma.tournament.findFirst({
      where: {
        status: "REGISTRATION_OPEN",
      },
      include: {
        teams: {
          include: { players: true, payments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Busca o campeonato ativo atual ou cria um padrão se não existir.
   * Promove de DRAFT para REGISTRATION_OPEN automaticamente.
   */
  static async getOrCreateActiveTournament(creatorDiscordId) {
    let tournament = await prisma.tournament.findFirst({
      where: {
        status: {
          in: [
            "DRAFT",
            "REGISTRATION_OPEN",
            "REGISTRATION_CLOSED",
            "IN_PROGRESS",
          ],
        },
      },
      include: {
        teams: {
          include: { players: true, payments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Se o campeonato encontrado estiver em DRAFT, atualiza para REGISTRATION_OPEN
    if (tournament && tournament.status === "DRAFT") {
      tournament = await prisma.tournament.update({
        where: { id: tournament.id },
        data: { status: "REGISTRATION_OPEN" },
        include: {
          teams: {
            include: { players: true, payments: true },
          },
        },
      });
    }

    // Se não existir, cria
    if (!tournament) {
      tournament = await prisma.tournament.create({
        data: {
          name: "Campeonato 4x4 2QN",
          maxTeams: 32,
          playersPerTeam: 4,
          maxEmulatorsPerTeam: 2,
          registrationFee: 10.0,
          status: "REGISTRATION_OPEN",
          createdBy: creatorDiscordId || "SYSTEM",
        },
        include: {
          teams: {
            include: { players: true, payments: true },
          },
        },
      });

      // Cria os Rounds padrão
      const roundsData = [
        { roundNumber: 1, name: "32avos (R32)", matchType: "BO1" },
        { roundNumber: 2, name: "Oitavas (R16)", matchType: "BO1" },
        { roundNumber: 3, name: "Quartas de Final", matchType: "BO1" },
        { roundNumber: 4, name: "Semifinal", matchType: "BO1" },
        { roundNumber: 5, name: "Grande Final", matchType: "BO3" },
      ];

      for (const r of roundsData) {
        await prisma.round.create({
          data: {
            tournamentId: tournament.id,
            ...r,
          },
        });
      }
    }

    return tournament;
  }

  /**
   * Valida e inscreve uma nova equipe com seus 4 jogadores e nicks do jogo.
   */
  static async registerTeam({
    tournamentId,
    teamName,
    captainId,
    playersData,
  }) {
    if (!playersData || playersData.length !== 4) {
      throw new Error("A equipe deve ter exatamente 4 jogadores.");
    }

    const captainInList = playersData.some((p) => p.discordId === captainId);
    if (!captainInList) {
      throw new Error("O capitão precisa estar listado entre os 4 jogadores.");
    }

    const emulatorsCount = playersData.filter(
      (p) => p.device === "EMULATOR",
    ).length;
    if (emulatorsCount > 2) {
      throw new Error(
        `Limite de emuladores excedido! Permitido: máx 2. Enviados: ${emulatorsCount}.`,
      );
    }

    const allRegisteredPlayers = await prisma.player.findMany({
      where: {
        team: {
          tournamentId: tournamentId,
          status: { notIn: ["CANCELLED"] },
        },
      },
    });

    const registeredUserIds = new Set(
      allRegisteredPlayers.map((p) => p.discordId),
    );
    for (const player of playersData) {
      if (registeredUserIds.has(player.discordId)) {
        throw new Error(
          `O jogador <@${player.discordId}> já está inscrito em outra equipe neste campeonato!`,
        );
      }
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { teams: true },
    });

    if (!tournament) {
      throw new Error("Campeonato não encontrado no banco de dados.");
    }

    const activeTeams = tournament.teams.filter((t) =>
      ["CONFIRMED", "PENDING_PAYMENT", "PAYMENT_REVIEW", "ACTIVE"].includes(
        t.status,
      ),
    );

    const isFull = activeTeams.length >= tournament.maxTeams;
    const initialStatus = isFull ? "WAITLIST" : "PENDING_PAYMENT";

    let waitlistOrder = null;
    if (isFull) {
      const currentWaitlist = tournament.teams.filter(
        (t) => t.status === "WAITLIST",
      );
      waitlistOrder = currentWaitlist.length + 1;
    }

    const createdTeam = await prisma.team.create({
      data: {
        tournamentId,
        name: teamName,
        captainId,
        status: initialStatus,
        waitlistOrder,
        players: {
          create: playersData.map((p) => ({
            discordId: p.discordId,
            gameNick: p.gameNick,
            device: p.device || "MOBILE",
            isCaptain: p.discordId === captainId,
          })),
        },
      },
      include: { players: true },
    });

    if (isFull && tournament.status === "REGISTRATION_OPEN") {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: "REGISTRATION_FULL" },
      });
    }

    return createdTeam;
  }

  /**
   * Atualiza o status de uma equipe e dispara a automação de fechamento/sorteio se atingir o limite.
   */
  static async updateTeamStatus(teamId, status) {
    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: { status },
      include: {
        players: true,
        tournament: {
          include: { teams: true },
        },
      },
    });

    // Se a equipe foi confirmada, verifica se atingiu o limite máximo (ex: 32)
    if (status === "CONFIRMED") {
      const tournament = updatedTeam.tournament;
      const confirmedTeams = tournament.teams.filter(
        (t) => t.status === "CONFIRMED",
      );

      if (
        confirmedTeams.length >= tournament.maxTeams &&
        tournament.status !== "IN_PROGRESS" &&
        tournament.status !== "FINISHED"
      ) {
        // Fecha as inscrições automaticamente
        await prisma.tournament.update({
          where: { id: tournament.id },
          data: { status: "REGISTRATION_CLOSED" },
        });

        // Gera automaticamente as partidas do Round 1 (Sorteio Fisher-Yates)
        await this.generateFirstRoundMatches(tournament.id);
      }
    }

    return updatedTeam;
  }

  /**
   * Retorna um relatório cirúrgico de auditoria e integridade das equipes do campeonato.
   */
  static async getTournamentAuditReport(tournamentId) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        teams: {
          include: { players: true, payments: true },
        },
      },
    });

    if (!tournament) throw new Error("Campeonato não encontrado.");

    const totalTeams = tournament.teams.length;
    const confirmed = tournament.teams.filter((t) => t.status === "CONFIRMED");
    const pendingPayment = tournament.teams.filter((t) =>
      ["PENDING_PAYMENT", "PAYMENT_REVIEW"].includes(t.status),
    );
    const waitlist = tournament.teams.filter((t) => t.status === "WAITLIST");

    const teamsAudit = tournament.teams.map((t) => {
      const emulatorsCount = t.players.filter(
        (p) => p.device === "EMULATOR",
      ).length;
      const isComplete = t.players.length === tournament.playersPerTeam;
      return {
        id: t.id,
        name: t.name,
        status: t.status,
        emulatorsCount,
        isComplete,
        hasEmulatorsOverflow: emulatorsCount > tournament.maxEmulatorsPerTeam,
      };
    });

    const emulatorOverflows = teamsAudit.filter((t) => t.hasEmulatorsOverflow);
    const incompleteTeams = teamsAudit.filter((t) => !t.isComplete);

    return {
      tournamentName: tournament.name,
      status: tournament.status,
      maxTeams: tournament.maxTeams,
      totalRegistered: totalTeams,
      confirmedCount: confirmed.length,
      pendingPaymentCount: pendingPayment.length,
      waitlistCount: waitlist.length,
      emulatorOverflows,
      incompleteTeams,
      teamsAudit,
    };
  }

  /**
   * Fecha as inscrições do campeonato manualmente pela moderação.
   */
  static async closeTournament(tournamentId) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) throw new Error("Campeonato não encontrado.");

    return await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: "REGISTRATION_CLOSED" },
    });
  }

  /**
   * Embaralha as equipes confirmadas e gera as partidas do Round 1.
   */
  static async generateFirstRoundMatches(tournamentId) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        teams: {
          where: { status: "CONFIRMED" },
        },
        rounds: {
          where: { roundNumber: 1 },
        },
      },
    });

    if (!tournament) throw new Error("Campeonato não encontrado.");
    if (!tournament.rounds || tournament.rounds.length === 0) {
      throw new Error(
        "Primeira rodada (Round 1) não encontrada no campeonato.",
      );
    }

    const round1 = tournament.rounds[0];
    const confirmedTeams = tournament.teams;

    if (confirmedTeams.length < 2) {
      throw new Error(
        `Número insuficiente de equipes confirmadas (${confirmedTeams.length}). É necessário pelo menos 2 equipes.`,
      );
    }

    // Embaralhamento aleatório (Algoritmo Fisher-Yates)
    const shuffled = [...confirmedTeams];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const createdMatches = [];
    let matchCounter = 1;

    // Agrupa de 2 em 2 para montar cada confronto
    for (let i = 0; i < shuffled.length; i += 2) {
      const teamA = shuffled[i];
      const teamB = shuffled[i + 1]; // Pode ser undefined se o número de equipes for ímpar

      const match = await prisma.match.create({
        data: {
          roundId: round1.id,
          matchNumber: matchCounter++,
          teamAId: teamA.id,
          teamBId: teamB ? teamB.id : null,
          status: teamB ? "PENDING" : "FINISHED",
          winnerTeam: teamB ? undefined : { connect: { id: teamA.id } },
        },
        include: {
          teamA: { include: { players: true } },
          teamB: teamB ? { include: { players: true } } : true,
          winnerTeam: true,
        },
      });

      createdMatches.push(match);
    }

    // Atualiza status do campeonato para IN_PROGRESS
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: "IN_PROGRESS" },
    });

    return createdMatches;
  }

  /**
   * Define o vencedor de uma partida, atualiza o status e verifica se a rodada foi concluída
   * para gerar automaticamente a próxima fase ou coroar o campeão.
   * Instrumentado com logs detalhados para auditoria de fluxo e blindagem de status.
   */
  static async recordMatchWinner(matchId, winnerTeamId) {
    console.log(
      `[LOG] recordMatchWinner chamado - matchId: ${matchId}, winnerTeamId: ${winnerTeamId}`,
    );

    if (!winnerTeamId) {
      console.log(`[LOG] Erro: Nenhuma equipe vencedora foi informada.`);
      throw new Error("Nenhuma equipe vencedora foi informada.");
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        round: {
          include: {
            tournament: {
              include: {
                rounds: { orderBy: { roundNumber: "asc" } },
              },
            },
          },
        },
        teamA: { include: { players: true } },
        teamB: { include: { players: true } },
      },
    });

    console.log(
      `[LOG] Match encontrada no banco:`,
      match
        ? {
            id: match.id,
            status: match.status,
            winnerId: match.winnerTeamId,
            teamAId: match.teamAId,
            teamBId: match.teamBId,
          }
        : null,
    );

    if (!match) {
      console.log(`[LOG] Erro: Partida não encontrada para o id ${matchId}`);
      throw new Error("Partida não encontrada.");
    }

    // Blindagem de status
    if (match.status === "FINISHED") {
      if (match.winnerTeamId) {
        console.log(
          `[LOG] Erro: A partida ${matchId} já está finalizada e possui vencedor`,
        );
        throw new Error("Esta partida já foi finalizada.");
      } else {
        console.log(
          `[LOG] Aviso: A partida ${matchId} está com status FINISHED mas sem vencedor. Reativando.`,
        );
      }
    }

    if (
      match.teamBId &&
      winnerTeamId !== match.teamAId &&
      winnerTeamId !== match.teamBId
    ) {
      console.log(
        `[LOG] Erro: A equipe ${winnerTeamId} não pertence à partida ${matchId}`,
      );
      throw new Error(
        "A equipe vencedora informada não faz parte desta partida.",
      );
    }

    // Atualiza a partida atual usando a relação winnerTeam
    let updatedMatch;
    try {
      console.log(
        `[LOG] Tentando atualizar a partida ${matchId} com winnerTeamId: ${winnerTeamId} e status: FINISHED`,
      );
      updatedMatch = await prisma.match.update({
        where: {
          id: matchId,
        },
        data: {
          status: "FINISHED",
          winnerTeam: {
            connect: { id: winnerTeamId },
          },
        },
        include: {
          winnerTeam: true,
        },
      });
      console.log(`[LOG] Partida atualizada com sucesso:`, updatedMatch.id);
    } catch (err) {
      console.log(`[LOG] Erro no prisma.match.update:`, err.message);
      throw new Error(
        "Erro ao atualizar a partida no banco de dados: " + err.message,
      );
    }

    const round = match.round;
    const tournament = round.tournament;

    // Verifica se todas as partidas da rodada atual foram finalizadas
    const roundMatches = await prisma.match.findMany({
      where: { roundId: round.id },
    });

    const pendingMatches = roundMatches.filter((m) => m.status !== "FINISHED");
    console.log(
      `[LOG] Total de partidas na rodada ${round.id}: ${roundMatches.length}. Pendentes: ${pendingMatches.length}`,
    );

    let nextRoundInfo = null;
    let champion = null;

    if (pendingMatches.length === 0) {
      console.log(`[LOG] Rodada concluída! Buscando vencedores...`);
      const winnerIds = roundMatches
        .map((m) => m.winnerTeamId || m.winnerId)
        .filter(Boolean);
      console.log(`[LOG] IDs vencedores da rodada:`, winnerIds);

      // Se sobrou apenas 1 vencedor, temos o GRANDE CAMPEÃO!
      if (winnerIds.length === 1) {
        console.log(
          `[LOG] Encontrado 1 único vencedor. Coroando campeão: ${winnerIds[0]}`,
        );
        champion = await prisma.team.findUnique({
          where: { id: winnerIds[0] },
          include: { players: true },
        });

        await prisma.tournament.update({
          where: { id: tournament.id },
          data: { status: "FINISHED" },
        });
        console.log(
          `[LOG] Torneio ${tournament.id} atualizado para status FINISHED.`,
        );
      } else {
        const nextRoundNumber = round.roundNumber + 1;
        console.log(`[LOG] Buscando próxima rodada número: ${nextRoundNumber}`);
        const nextRound = tournament.rounds.find(
          (r) => r.roundNumber === nextRoundNumber,
        );

        if (nextRound) {
          console.log(
            `[LOG] Próxima rodada encontrada: ${nextRound.id} (${nextRound.name})`,
          );
          const winningTeams = await prisma.team.findMany({
            where: { id: { in: winnerIds } },
            include: { players: true },
          });

          const createdNextMatches = [];
          let nextMatchCounter = 1;

          for (let i = 0; i < winningTeams.length; i += 2) {
            const teamA = winningTeams[i];
            const teamB = winningTeams[i + 1];

            console.log(
              `[LOG] Criando próxima partida para Team A: ${teamA?.name} e Team B: ${teamB?.name || "BYE"}`,
            );
            const nextMatch = await prisma.match.create({
              data: {
                roundId: nextRound.id,
                matchNumber: nextMatchCounter++,
                teamAId: teamA.id,
                teamBId: teamB ? teamB.id : null,
                status: teamB ? "PENDING" : "FINISHED",
                winnerTeam: teamB ? undefined : { connect: { id: teamA.id } },
              },
              include: {
                teamA: { include: { players: true } },
                teamB: teamB ? { include: { players: true } } : true,
                winnerTeam: true,
              },
            });

            createdNextMatches.push(nextMatch);
          }

          nextRoundInfo = {
            round: nextRound,
            matches: createdNextMatches,
          };
        } else {
          console.log(
            `[LOG] Nenhuma próxima rodada encontrada para o número ${nextRoundNumber}`,
          );
        }
      }
    } else {
      console.log(
        `[LOG] Ainda há ${pendingMatches.length} partidas pendentes nesta rodada. Aguardando.`,
      );
    }

    return {
      updatedMatch,
      isRoundCompleted: pendingMatches.length === 0,
      champion,
      nextRoundInfo,
    };
  }
}

module.exports = TournamentService;
