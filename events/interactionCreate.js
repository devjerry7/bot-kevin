// events/interactionCreate.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  ChannelType,
  MessageFlags,
} = require("discord.js");

// --- IMPORTAÇÃO DOS HANDLERS ---
const handleSlashCommand = require("../handlers/slashHandler");
const handleVerification = require("../handlers/verificationHandler");
const handleStopGame = require("../handlers/stopGameHandler");
const handleVip = require("../handlers/vipHandler");
const handleBooster = require("../handlers/boosterHandler");
const handleChannelManagement = require("../handlers/channelHandler");
const handleModInteractions = require("../handlers/modHandler");
const handleGameRoles = require("../handlers/gameRoleHandler");
const handleGamblingInteract = require("../handlers/gamblingHandler");
const handleTicket = require("../handlers/ticketHandler");

// Handler do Painel de Configuração (SaaS)
const configHandler = require("../handlers/configHandler");

// O Handler de Gestão de Cargos (k!cargo)
const { handleRoleInteractions } = require("../commands/rolePanel");

module.exports = async (interaction) => {
  try {
    // 1. Tenta tratar Slash Commands (/config, /ping)
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction);
      return;
    }

    // 2. ROTEAMENTO DO PAINEL DE CONFIGURAÇÃO (SaaS)
    const id = interaction.customId;

    if (
      interaction.isStringSelectMenu() ||
      interaction.isChannelSelectMenu() ||
      interaction.isRoleSelectMenu() ||
      interaction.isButton() ||
      interaction.isModalSubmit()
    ) {
      // Verifica os prefixos usados no configHandler
      if (
        id.startsWith("config_") || // Menus Principais
        id.startsWith("save_") || // Salvamento de Menus
        id.startsWith("btn_conf_") || // Botões de Configuração
        id.startsWith("btn_verify_") || // <--- ADICIONEI ESSA LINHA AQUI! (Botões de Verificação)
        id.startsWith("modal_") // Formulários (Modals)
      ) {
        await configHandler(interaction);
        return;
      }
    }

    // ... Resto dos handlers (Verificação, Stop, Vip, etc) ...
    // (Pode manter o resto do arquivo igual estava)

    // 3. Sistema de Verificação (Entrada)
    if (await handleVerification(interaction)) return;
    if (await handleStopGame(interaction)) return;
    if (await handleVip(interaction)) return;
    if (await handleBooster(interaction)) return;
    if (await handleChannelManagement(interaction)) return;
    if (await handleModInteractions(interaction)) return;
    if (await handleGameRoles(interaction)) return;
    if (await handleGamblingInteract(interaction)) return;
    if (await handleTicket(interaction)) return;

    try {
      if ((await handleRoleInteractions(interaction)) !== false) return;
    } catch (e) {}
  } catch (error) {
    console.error("Erro Fatal no interactionCreate:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "❌ Ocorreu um erro interno crítico.",
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }
  }
};
