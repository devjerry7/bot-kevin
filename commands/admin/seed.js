// commands/admin/seed.js
const SeedService = require("../../services/seedService");
const TournamentService = require("../../services/tournamentService");

module.exports = {
  name: "seed",
  description:
    "Gera 32 equipes fictícias e inicia o torneio para testes em massa.",
  async execute(message, args) {
    const loadingMsg = await message.reply(
      "⚙️ Gerando 32 equipes de teste, fechando inscrições e sorteando o Round 1...",
    );

    try {
      // Busca o campeonato ativo atual ou cria um padrão se não existir
      const tournament = await TournamentService.getOrCreateActiveTournament(
        message.author.id,
      );

      // Executa o serviço de seed para popular 32 equipes e gerar o Round 1
      const seededTeams = await SeedService.seedTournament(tournament.id, 32);

      await loadingMsg.edit(
        `✅ **Sucesso!** ${seededTeams.length} equipes fictícias foram criadas, as inscrições foram fechadas e as chaves do **Round 1** foram geradas automaticamente!`,
      );
    } catch (error) {
      console.error("[ERRO SEED COMMAND]", error);
      await loadingMsg.edit(
        `❌ Erro ao executar o seed do torneio: \`${error.message}\``,
      );
    }
  },
};
