// commands/deploy-commands.js
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const commands = [];
// V2: Aponta exclusivamente para a pasta de Slash Commands
const slashCommandsPath = path.join(__dirname, "slash");

// Se a pasta 'slash' não existir, cria ela para evitar erros
if (!fs.existsSync(slashCommandsPath)) {
  fs.mkdirSync(slashCommandsPath, { recursive: true });
  console.log(
    "📁 Pasta 'commands/slash' criada. Coloque seus slash commands lá!",
  );
}

const commandFiles = fs
  .readdirSync(slashCommandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./slash/${file}`);
  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(
      `[AVISO] O comando em ${file} está faltando "data" ou "execute".`,
    );
  }
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`🌀 Atualizando ${commands.length} comando(s) de barra (/)...`);

    // Atualiza os comandos globalmente no Discord
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });

    console.log(
      "✅ Comandos de barra sincronizados com sucesso. Fim dos avisos chatos!",
    );
  } catch (error) {
    console.error("❌ Erro ao registrar comandos:", error);
  }
})();
