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
    // Aqui estava o problema: Agora aceitamos Botões e Modais também!
    const id = interaction.customId;

    if (
      interaction.isStringSelectMenu() ||
      interaction.isChannelSelectMenu() ||
      interaction.isRoleSelectMenu() ||
      interaction.isButton() || // <--- ADICIONADO
      interaction.isModalSubmit() // <--- ADICIONADO
    ) {
      // Verifica os prefixos usados no configHandler
      if (
        id.startsWith("config_") || // Menus Principais
        id.startsWith("save_") || // Salvamento de Menus
        id.startsWith("btn_conf_") || // Botões de Configuração (Prefixo, Visual)
        id.startsWith("modal_") // Formulários (Modals)
      ) {
        await configHandler(interaction);
        return; // Impede que outros handlers tentem processar
      }
    }

    // 3. Sistema de Verificação (Entrada)
    if (await handleVerification(interaction)) return;

    // 4. Tenta tratar Jogo Stop
    if (await handleStopGame(interaction)) return;

    // 5. Tenta tratar Sistema VIP
    if (await handleVip(interaction)) return;

    // 6. Tenta tratar Sistema Booster
    if (await handleBooster(interaction)) return;

    // 7. Painel de Infraestrutura/Canais (k!canal)
    if (await handleChannelManagement(interaction)) return;

    // 8. Painel de Moderação (k!mod)
    if (await handleModInteractions(interaction)) return;

    // 9. Seleção de Jogos (Auto-Role / k!jogos)
    if (await handleGameRoles(interaction)) return;

    // 10. Jogos de Azar
    if (await handleGamblingInteract(interaction)) return;

    // 11. Sistema de Tickets
    if (await handleTicket(interaction)) return;

    // 12. Painel de Gestão de Cargos (k!cargo)
    try {
      if ((await handleRoleInteractions(interaction)) !== false) return;
    } catch (e) {
      // Ignora
    }
  } catch (error) {
    console.error("Erro Fatal no interactionCreate:", error);

    // Tenta responder apenas se ainda não houve resposta
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content:
            "❌ Ocorreu um erro interno crítico ao processar sua interação.",
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }
  }
};
