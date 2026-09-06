// index.js

// --- 1. IMPORTAÇÕES ---
require("./config.js");
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const http = require("http");
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
  Collection,
} = require("discord.js");

// Importações dos Gerenciadores
const { checkExpiredVips } = require("./services/vipManager");

// Importações dos Eventos Principais
const handleMessageCreate = require("./events/messageCreate");
const handleInteractionCreate = require("./events/interactionCreate");
const handleVoiceState = require("./events/voiceStateUpdate");

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

// --- 3. CARREGAMENTO DE SLASH COMMANDS ---
client.commands = new Collection();
const slashCommandsPath = path.join(__dirname, "commands", "slash");

if (fs.existsSync(slashCommandsPath)) {
  const commandFiles = fs
    .readdirSync(slashCommandsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(slashCommandsPath, file);
    try {
      const command = require(filePath);
      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
        console.log(`[CMD] Comando /${command.data.name} carregado.`);
      }
    } catch (error) {
      console.error(`[CMD ERROR] Erro ao carregar ${file}:`, error);
    }
  }
}

// --- 4. EVENTOS BASE ---
client.on("messageCreate", handleMessageCreate);
client.on("interactionCreate", handleInteractionCreate);
client.on("voiceStateUpdate", (oldState, newState) =>
  handleVoiceState(oldState, newState, client),
);

// Tratamento de Erros Críticos (Impede que o bot desligue do nada)
process.on("uncaughtException", (err) =>
  console.error(`[CRÍTICO] Uncaught Exception:`, err),
);
process.on("unhandledRejection", (reason) =>
  console.error(`[CRÍTICO] Unhandled Rejection:`, reason),
);

// --- 5. EVENTO READY ---
client.once("ready", async () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}!`);

  console.log("[SISTEMA VIP] Iniciando verificador...");
  checkExpiredVips(client);
  setInterval(() => {
    checkExpiredVips(client);
  }, 3600 * 1000);

  // Status rotativo
  const activities = [
    { name: `🎮 MC KEVIN`, type: ActivityType.Streaming },
    { name: `🚨 Monitorando Servidor`, type: ActivityType.Streaming },
    { name: `💎 Sistema V2 Ativo`, type: ActivityType.Streaming },
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

// --- 6. SERVIDOR HTTP (Health Check para Hosts) ---
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("MC KEVIN Bot is Online!\n");
});
const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Health check rodando na porta ${port}`));

// --- 7. LOGIN ---
client.login(TOKEN);
