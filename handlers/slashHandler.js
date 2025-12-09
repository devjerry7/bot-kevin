// handlers/slashHandler.js
module.exports = async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(
      `[SLASH] Comando /${interaction.commandName} NÃO encontrado na memória.`
    );
    return await interaction.reply({
      content: "Comando não registrado no bot.",
      ephemeral: true,
    });
  }

  try {
    console.log(`[SLASH] Executando /${interaction.commandName}...`);
    await command.execute(interaction);
    console.log(`[SLASH] /${interaction.commandName} executado com sucesso.`);
  } catch (error) {
    // AQUI VAI APARECER O MOTIVO REAL NO TERMINAL
    console.error(`🔴 ERRO FATAL EM /${interaction.commandName}:`);
    console.error(error);

    const errorMsg = { content: "❌ Erro ao executar.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMsg).catch(() => {});
    } else {
      await interaction.reply(errorMsg).catch(() => {});
    }
  }
};
