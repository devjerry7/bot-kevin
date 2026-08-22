// index.js

// --- 1. IMPORTAÇÕES ---
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
  ActivityType,
  Collection, // <--- OBRIGATÓRIO: Importação da Coleção
} = require("discord.js");

// Importações dos Gerenciadores
const { checkExpiredVips } = require("../services/vipManager");

// Importações dos Eventos Principais
const handleMessageCreate = require("./events/messageCreate");
const handleInteractionCreate = require("./events/interactionCreate");
const tempVoiceHandler = require("./handlers/tempVoiceHandler");

const TOKEN = process.env.DISCORD_TOKEN;

// --- 2. INICIALIZAÇÃO DO CLIENTE ---
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

// --- 3. CONFIGURAÇÕES GLOBAIS ---
// Mantém compatibilidade com o sistema antigo
client.config = process.env;

// --- 4. CARREGAMENTO DE COMANDOS (A CORREÇÃO PRINCIPAL) ---
// Isso cria a memória de comandos para o /config funcionar
client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
// Verifica se a pasta existe antes de tentar ler
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const command = require(filePath);
      // Só carrega se for um comando Slash moderno (com data e execute)
      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
        console.log(
          `[CMD] Comando /${command.data.name} carregado com sucesso.`,
        );
      }
    } catch (error) {
      console.error(`[CMD ERROR] Erro ao carregar ${file}:`, error);
    }
  }
} else {
  console.warn("[CMD WARN] Pasta 'commands' não encontrada!");
}

// --- 5. EVENTOS ---

// Mensagens (Comandos k!)
client.on("messageCreate", handleMessageCreate);

// Interações (Slash Commands, Botões, Menus)
// Toda a lógica foi movida para events/interactionCreate.js para organização
client.on("interactionCreate", handleInteractionCreate);

// Voz Temporária (Criar Sala)
client.on("voiceStateUpdate", (oldState, newState) => {
  tempVoiceHandler(oldState, newState);
});

// --- 6. CARREGAMENTO DE LOGGERS AUTOMÁTICOS ---
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
      console.error(`[LOGS] Erro ao carregar ${file}:`, e);
    }
  }
  console.log(`[LOGS] Módulos de auditoria carregados.`);
}

// --- 7. FUNÇÕES AUXILIARES ---

// Postar Painel de Verificação
async function postVerificationPanel(client) {
  const VERIFY_BUTTON_ID = "start_verification";
  const channelId = client.config.VERIFICATION_CHANNEL_ID;

  if (!channelId) return;

  const channel = client.channels.cache.get(channelId);
  if (!channel)
    return console.error(`[VERIFICAÇÃO] Canal ${channelId} não encontrado.`);

  const HEADER_IMAGE =
    "https://i.pinimg.com/736x/4d/68/8e/4d688edfeedd4bec17b856d2a2ad7241.jpg";
  const THUMBNAIL_URL =
    "https://i.pinimg.com/736x/4d/68/8e/4d688edfeedd4bec17b856d2a2ad7241.jpg";

  try {
    const messages = await channel.messages.fetch({ limit: 50 });
    const panelExists = messages.find(
      (m) =>
        m.author.id === client.user.id &&
        m.components.some((row) =>
          row.components.some((btn) => btn.customId === VERIFY_BUTTON_ID),
        ),
    );

    if (panelExists) {
      // console.log(`[VERIFICAÇÃO] Painel já existe.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("<:certo_froid:1443643346722754692> KEVIN - VERIFICAÇÃO")
      .setDescription(
        "**inf**\n **Gostaria de entrar e tomar uma xicara de chá?**\n\nClique no botão abaixo para iniciar seu processo de acesso.",
      )
      .setColor(0x007fff)
      .setThumbnail(THUMBNAIL_URL)
      .setImage(HEADER_IMAGE);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(VERIFY_BUTTON_ID)
        .setLabel("Verificar")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:verify:1527688037704794275>"),
    );

    await channel.send({ embeds: [embed], components: [row] });
    console.log("[VERIFICAÇÃO] Novo painel postado.");
  } catch (e) {
    console.error("[VERIFICAÇÃO ERROR]", e);
  }
}

// Tratamento de Erros Críticos
process.on("uncaughtException", (err) =>
  console.error(`[CRÍTICO] Uncaught Exception:`, err),
);
process.on("unhandledRejection", (reason) =>
  console.error(`[CRÍTICO] Unhandled Rejection:`, reason),
);

// --- 8. EVENTO READY (Inicialização) ---
client.once("ready", async () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}!`);
  console.log(`[STATUS] Bot pronto.`);

  // Posta painel de verificação se configurado
  await postVerificationPanel(client);

  // Inicia Verificador de VIPs expirados
  console.log("[SISTEMA VIP] Iniciando verificador...");
  checkExpiredVips(client);
  setInterval(() => {
    checkExpiredVips(client);
  }, 3600 * 1000);

  // Status Rotativo
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

// --- 9. SERVIDOR HTTP ---
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("MC KEVIN Bot is Online!\n");
});
const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Health check rodando na porta ${port}`));

// --- 10. LOGIN ---
client.login(TOKEN);
