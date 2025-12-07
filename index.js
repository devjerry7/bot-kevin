// index.js

// Importações principais
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const http = require("http");
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Partials,
  ActivityType, // <--- Importante para o status
} = require("discord.js");

// Importação do Gerenciador VIP
const { checkExpiredVips } = require("./vipManager"); // <--- ESTA IMPORTAÇÃO ESTAVA FALTANDO

const TOKEN = process.env.DISCORD_TOKEN;

// Inicialização do Cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
  ],
});

// --- CONFIGURAÇÕES GLOBAIS ---
client.config = {
  // Verificação
  VERIFIED_ROLE_ID: process.env.VERIFIED_ROLE_ID,
  APPROVER_ROLE_ID: process.env.APPROVER_ROLE_ID,
  SECONDARY_APPROVER_ROLE_ID: process.env.SECONDARY_APPROVER_ROLE_ID,

  // Canais de Fluxo
  APPROVAL_CHANNEL_ID: process.env.APPROVAL_CHANNEL_ID,
  APPROVED_LOG_CHANNEL_ID: process.env.APPROVED_LOG_CHANNEL_ID,
  VERIFICATION_CHANNEL_ID: process.env.VERIFICATION_CHANNEL_ID,

  // Reaction Roles Legado
  ROLE_REACTION_CHANNEL_ID: process.env.ROLE_REACTION_CHANNEL_ID,
  ROLE_REACTION_MESSAGE_ID: process.env.ROLE_REACTION_MESSAGE_ID,

  // Logs
  MEMBER_JOIN_LEAVE_LOG_ID: process.env.MEMBER_JOIN_LEAVE_LOG_ID,
  MESSAGE_EDIT_LOG_ID: process.env.MESSAGE_EDIT_LOG_ID,
  MESSAGE_DELETE_LOG_ID: process.env.MESSAGE_DELETE_LOG_ID,
  MOD_BAN_LOG_ID: process.env.MOD_BAN_LOG_ID,
  MOD_MUTE_LOG_ID: process.env.MOD_MUTE_LOG_ID,
  VOICE_LOG_ID: process.env.VOICE_LOG_ID,
  CHANNEL_UPDATE_LOG_ID: process.env.CHANNEL_UPDATE_LOG_ID,
  PD_LOG_CHANNEL_ID: process.env.PD_LOG_CHANNEL_ID,
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID,
  PANELA_LOG_ID: process.env.PANELA_LOG_ID,
  BLACKLIST_LOG_ID: process.env.BLACKLIST_LOG_ID,

  // Auto-Roles (Jogos)
  FREEFIRE_ROLE_ID: process.env.FREEFIRE_ROLE_ID,
  VALORANT_ROLE_ID: process.env.VALORANT_ROLE_ID,
  CS_ROLE_ID: process.env.CS_ROLE_ID,
  ROBLOX_ROLE_ID: process.env.ROBLOX_ROLE_ID,
  GTA_ROLE_ID: process.env.GTA_ROLE_ID,
  MINECRAFT_ROLE_ID: process.env.MINECRAFT_ROLE_ID,

  // Booster (Novos)
  BOOSTER_CATEGORY_ID: process.env.BOOSTER_CATEGORY_ID,
  BOOSTER_ANCHOR_ROLE_ID: process.env.BOOSTER_ANCHOR_ROLE_ID,

  // TICKETS
  TICKET_PARENT_CHANNEL_ID: process.env.TICKET_PARENT_CHANNEL_ID,
  TICKET_LOG_ID: process.env.TICKET_LOG_ID,

  // Mapeamento Antigo
  ROLE_MAPPING: {
    "1437889904406433974": "1437891203558277283",
    "1437889927613517975": "1437891278690975878",
  },
};

// --- CARREGAMENTO DE EVENTOS ---
const handleMessageCreate = require("./events/messageCreate");
client.on("messageCreate", handleMessageCreate);

const handleInteractionCreate = require("./events/interactionCreate");
client.on("interactionCreate", handleInteractionCreate);

const tempVoiceHandler = require("./handlers/tempVoiceHandler");
client.on("voiceStateUpdate", (oldState, newState) => {
  tempVoiceHandler(oldState, newState);
});

// --- CARREGAMENTO DE LOGGERS ---
const loggersPath = path.join(__dirname, "events", "loggers");
if (fs.existsSync(loggersPath)) {
  const loggerFiles = fs
    .readdirSync(loggersPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of loggerFiles) {
    try {
      const logger = require(path.join(loggersPath, file));
      if (logger.name && logger.execute) {
        client.on(logger.name, (...args) => logger.execute(client, ...args));
      }
    } catch (e) {
      console.error(`[LOGS] Erro em ${file}:`, e);
    }
  }
  console.log(`[LOGS] Módulos carregados.`);
}

// --- FUNÇÃO: POSTAR PAINEL DE VERIFICAÇÃO ---
async function postVerificationPanel(client) {
  const VERIFY_BUTTON_ID = "start_verification";
  const channel = client.channels.cache.get(
    client.config.VERIFICATION_CHANNEL_ID
  );

  if (!channel) return console.error("Canal de verificação não encontrado.");

  const HEADER_IMAGE =
    "https://i.pinimg.com/736x/4d/68/8e/4d688edfeedd4bec17b856d2a2ad7241.jpg";
  const THUMBNAIL_URL =
    "https://i.pinimg.com/736x/4d/68/8e/4d688edfeedd4bec17b856d2a2ad7241.jpg";

  // 1. Busca histórico para evitar duplicatas
  try {
    const messages = await channel.messages.fetch({ limit: 50 });
    const panelExists = messages.find(
      (m) =>
        m.author.id === client.user.id &&
        m.components.some((row) =>
          row.components.some((btn) => btn.customId === VERIFY_BUTTON_ID)
        )
    );

    if (panelExists) {
      console.log(`[VERIFICAÇÃO] Painel já existe. Nenhuma ação necessária.`);
      return;
    }
  } catch (e) {
    console.error(e);
  }

  // 2. Se não existe, cria o novo
  const embed = new EmbedBuilder()
    .setTitle("<:certo_froid:1443643346722754692> KEVIN - VERIFICAÇÃO")
    .setDescription(
      "SÓ MLK BOM, OS MENO MAIS QUENTE!!\n **FORA PANELEIROS**\n\nClique no botão abaixo para iniciar seu processo de acesso."
    )
    .setColor(0x007fff)
    .setThumbnail(THUMBNAIL_URL)
    .setImage(HEADER_IMAGE);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(VERIFY_BUTTON_ID)
      .setLabel("Verificar")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("<:mov_ok:1439456247794634845>")
  );

  await channel.send({ embeds: [embed], components: [row] });
  console.log("[VERIFICAÇÃO] Novo painel postado.");
}

// --- HANDLERS DE ESTABILIDADE ---
process.on("uncaughtException", (err) =>
  console.error(`[CRÍTICO] Uncaught Exception:`, err)
);
process.on("unhandledRejection", (reason) =>
  console.error(`[CRÍTICO] Unhandled Rejection:`, reason)
);

// --- EVENTO READY ---
client.once("ready", async () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}!`);
  console.log(`[STATUS] Bot pronto.`);

  // Posta painel APÓS estar pronto
  await postVerificationPanel(client);

  // Inicia VIP APÓS estar pronto
  console.log("[SISTEMA VIP] Iniciando verificador...");
  checkExpiredVips(client);
  setInterval(() => {
    checkExpiredVips(client);
  }, 3600 * 1000);

  // --- STATUS ROTATIVO ---
  const activities = [
    { name: `🎮 Monitorando 171 usuários`, type: ActivityType.Streaming },
    { name: `🚨 Segurança`, type: ActivityType.Streaming },
    { name: `🍀 Analisando dados do sistema`, type: ActivityType.Streaming },
    { name: `💎 ETERNO KEVIN`, type: ActivityType.Streaming },
  ];

  let i = 0;
  setInterval(() => {
    client.user.setPresence({
      activities: [{ name: activities[i].name, type: activities[i].type }],
      status: "online",
    });
    i = ++i % activities.length;
  }, 10000);
});

// --- SERVER HTTP ---
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("MC KEVIN Bot is Online!\n");
});
const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Render health check na porta ${port}`));

// --- LOGIN ---
client.login(TOKEN);
