const cron = require("node-cron");
const LiveNotificationManager = require("../LiveNotificationManager");

function startLiveTracker(client) {
  const manager = new LiveNotificationManager(client);

  console.log(
    "[SISTEMA DE LIVES] Job de rastreamento inicializado (Rodando a cada 3 minutos)...",
  );

  // Roda a cada 3 minutos
  cron.schedule("*/3 * * * *", async () => {
    try {
      await manager.checkAllStreams();
    } catch (error) {
      console.error(
        "[LiveTrackerJob] Erro durante a execução do ciclo de lives:",
        error,
      );
    }
  });
}

module.exports = { startLiveTracker };
