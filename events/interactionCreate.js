// events/interactionCreate.js
const { MessageFlags } = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../config");

// --- IMPORTAÇÃO DOS HANDLERS ---
const handleSlashCommand = require("../handlers/slashHandler");
const handleStopGame = require("../handlers/stopGameHandler");
const handleVip = require("../handlers/vipHandler");
const handleGameRoles = require("../handlers/gameRoleHandler");
const handleGamblingInteract = require("../handlers/gamblingHandler");
const handleTicket = require("../handlers/ticketHandler");
const handleTempVoicePanel = require("../handlers/tempVoicePanelHandler");

// 🔔 IMPORTANDO O NOSSO NOVO SISTEMA DE NOTIFICAÇÕES
const handleNotifyRoles = require("../handlers/notifyRoleHandler");

module.exports = async (interaction) => {
  try {
    // 1. Tenta tratar Slash Commands (/config, /ping)
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction);
      return;
    }

    // 2. CAPTURA DO BOTÃO DE INSCRIÇÃO DO CAMPEONATO 2x2 FREE FIRE
    if (interaction.isButton() && interaction.customId === "ff_register_btn") {
      const tournament = await prisma.ffTournament.findUnique({
        where: { id: "main" },
      });

      if (!tournament || !tournament.isOpen) {
        return interaction.reply({
          content: `${config.emoji.error} As inscrições para o campeonato estão encerradas no momento!`,
          flags: MessageFlags.Ephemeral,
        });
      }

      try {
        await prisma.ffParticipant.create({
          data: {
            userId: interaction.user.id,
            username: interaction.user.username,
          },
        });

        return interaction.reply({
          content: `${config.emoji.success} Inscrição realizada com sucesso! Fique atento para o sorteio das duplas.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (error) {
        return interaction.reply({
          content: `${config.emoji.warning || "⚠️"} Você já está inscrito neste campeonato!`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // 3. ROTEAMENTO DOS SISTEMAS PRINCIPAIS (Botões, Menus e Modais ativos)
    if (await handleGameRoles(interaction)) return;
    if (await handleNotifyRoles(interaction)) return;
    if (await handleStopGame(interaction)) return;
    if (await handleVip(interaction)) return;
    if (await handleGamblingInteract(interaction)) return;
    if (await handleTicket(interaction)) return;
    if (await handleTempVoicePanel(interaction)) return;
  } catch (error) {
    console.error("[FATAL ERROR] Erro crítico no interactionCreate:", error);

    // Fallback para avisar o usuário sem travar o bot
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "❌ Ocorreu um erro interno ao processar sua ação.",
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }
  }
};
