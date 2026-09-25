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
        status: "REGISTRATION_OPEN", // Corrigido aqui
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
          notIn: ["FINISHED", "CANCELLED"],
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
      // Corrigido aqui
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: "REGISTRATION_FULL" },
      });
    }

    return createdTeam;
  }
}

module.exports = TournamentService;
