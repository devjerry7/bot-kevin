// services/seedService.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const TournamentService = require("./tournamentService");

class SeedService {
  static async seedTournament(tournamentId, totalTeams = 32) {
    console.log(`[SEED-LOG] ==========================================`);
    console.log(`[SEED-LOG] Iniciando seed para o torneio ID: ${tournamentId}`);
    console.log(`[SEED-LOG] Total de equipes solicitadas: ${totalTeams}`);

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { teams: true, rounds: true },
    });

    if (!tournament) {
      console.log(
        `[SEED-LOG] ERRO: Torneio ${tournamentId} não encontrado no banco.`,
      );
      throw new Error("Campeonato não encontrado.");
    }

    console.log(
      `[SEED-LOG] Torneio localizado: "${tournament.name}" | Status atual: ${tournament.status}`,
    );
    console.log(
      `[SEED-LOG] Rounds cadastrados no banco:`,
      tournament.rounds.map((r) => `R${r.roundNumber}: ${r.name} (${r.id})`),
    );

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

    console.log(
      `[SEED-LOG] Sucesso! ${createdTeams.length} equipes criadas e confirmadas.`,
    );

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: "REGISTRATION_CLOSED" },
    });
    console.log(
      `[SEED-LOG] Status do torneio alterado para REGISTRATION_CLOSED.`,
    );

    console.log(
      `[SEED-LOG] Disparando TournamentService.generateFirstRoundMatches...`,
    );
    await TournamentService.generateFirstRoundMatches(tournamentId);

    console.log(`[SEED-LOG] Processo de seed finalizado com sucesso absoluto!`);
    console.log(`[SEED-LOG] ==========================================`);
    return createdTeams;
  }
}

module.exports = SeedService;
