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

// Handler do Painel de Configuração (Single Server V2)
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

    // 2. ROTEAMENTO DO PAINEL DE CONFIGURAÇÃO (Single Server)
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
        id.startsWith("btn_verify_") || // Botões de Verificação
        id.startsWith("modal_") // Formulários (Modals)
      ) {
        await configHandler(interaction);
        return;
      }
    }

    // 3. ROTEAMENTO DOS SISTEMAS PRINCIPAIS
    // Os botões de jogos (ex: btn_role_ff) serão capturados por este handler abaixo
    if (await handleGameRoles(interaction)) return;

    if (await handleVerification(interaction)) return;
    if (await handleStopGame(interaction)) return;
    if (await handleVip(interaction)) return;
    if (await handleBooster(interaction)) return;
    if (await handleChannelManagement(interaction)) return;
    if (await handleModInteractions(interaction)) return;
    if (await handleGamblingInteract(interaction)) return;
    if (await handleTicket(interaction)) return;

    // 4. Roteamento Secundário (Painel de Cargos Manual)
    try {
      if ((await handleRoleInteractions(interaction)) !== false) return;
    } catch (e) {
      console.error("Erro no handleRoleInteractions:", e);
    }
  } catch (error) {
    console.error("Erro Fatal no interactionCreate:", error);

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
