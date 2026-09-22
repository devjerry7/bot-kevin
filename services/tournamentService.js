// services/tournamentService.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class TournamentService {
  /**
   * Busca o campeonato ativo atual ou cria o DRAFT padrão se não existir.
   */
  static async getOrCreateActiveTournament(creatorDiscordId) {
    let tournament = await prisma.tournament.findFirst({
      where: {
        status: {
          notIn: ["FINISHED", "CANCELLED"],
        },
      },
      include: {
        teams: {
          include: { players: true, payments: true },
        },
      },
    });

    if (!tournament) {
      tournament = await prisma.tournament.create({
        data: {
          name: "Campeonato 4x4 2QN",
          maxTeams: 32,
          playersPerTeam: 4,
          maxEmulatorsPerTeam: 2,
          registrationFee: 10.0,
          status: "DRAFT",
          createdBy: creatorDiscordId || "SYSTEM",
        },
        include: {
          teams: {
            include: { players: true, payments: true },
          },
        },
      });

      // Cria os Rounds padrão (R32, R16, Quartas, Semifinal, Final)
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
    // 1. Validação de quantidade exata de jogadores
    if (!playersData || playersData.length !== 4) {
      throw new Error("A equipe deve ter exatamente 4 jogadores.");
    }

    // 2. Validação do Capitão fazer parte da lista
    const captainInList = playersData.some((p) => p.discordId === captainId);
    if (!captainInList) {
      throw new Error("O capitão precisa estar listado entre os 4 jogadores.");
    }

    // 3. Validação de limite de Emuladores (máximo 2)
    const emulatorsCount = playersData.filter(
      (p) => p.device === "EMULATOR",
    ).length;
    if (emulatorsCount > 2) {
      throw new Error(
        `Limite de emuladores excedido! Permitido: máx 2. Enviados: ${emulatorsCount}.`,
      );
    }

    // 4. Validação de duplicidade de jogadores no campeonato ativo
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

    // 5. Verificar vagas e determinar se vai para PENDING_PAYMENT ou WAITLIST
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { teams: true },
    });

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

    // 6. Criar Equipe e Jogadores no Banco de Dados
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
            device: p.device,
            isCaptain: p.discordId === captainId,
          })),
        },
      },
      include: { players: true },
    });

    // Se lotou com essa inscrição, atualiza status do campeonato
    if (isFull && tournament.status === "REGISTRATION_OPEN") {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: "REGISTRATION_FULL" },
      });
    }

    return createdTeam;
  }
}

module.exports = TournamentService;
