// services/seedService.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const TournamentService = require("./tournamentService");

class SeedService {
  /**
   * Gera equipes fictícias (Seed) para testes em massa sem precisar de usuários reais.
   * Insere as equipes como CONFIRMED e dispara o fechamento e sorteio do Round 1 automaticamente.
   */
  static async seedTournament(tournamentId, totalTeams = 32) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { teams: true },
    });

    if (!tournament) throw new Error("Campeonato não encontrado.");

    const createdTeams = [];

    for (let i = 1; i <= totalTeams; i++) {
      const teamName = `Equipe Teste ${i}`;
      const captainId = `99990000000000${String(i).padStart(4, "0")}`;

      const playersData = [
        {
          discordId: captainId,
          gameNick: `Capitão_${i}`,
          device: "MOBILE",
          isCaptain: true,
        },
        {
          discordId: `99990000000001${String(i).padStart(4, "0")}`,
          gameNick: `Player2_${i}`,
          device: "MOBILE",
          isCaptain: false,
        },
        {
          discordId: `99990000000002${String(i).padStart(4, "0")}`,
          gameNick: `Player3_${i}`,
          device: "MOBILE",
          isCaptain: false,
        },
        {
          discordId: `99990000000003${String(i).padStart(4, "0")}`,
          gameNick: `Player4_${i}`,
          device: "EMULATOR",
          isCaptain: false,
        },
      ];

      const team = await prisma.team.create({
        data: {
          tournamentId,
          name: teamName,
          captainId,
          status: "CONFIRMED",
          players: {
            create: playersData.map((p) => ({
              discordId: p.discordId,
              gameNick: p.gameNick,
              device: p.device,
              isCaptain: p.isCaptain,
            })),
          },
        },
        include: { players: true },
      });

      createdTeams.push(team);
    }

    // Atualiza o status do torneio para fechado e dispara a geração do Round 1 usando o TournamentService
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: "REGISTRATION_CLOSED" },
    });

    await TournamentService.generateFirstRoundMatches(tournamentId);

    return createdTeams;
  }
}

module.exports = SeedService;
