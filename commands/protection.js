// commands/protection.js
const { EmbedBuilder } = require("discord.js");
const {
  addToPanela,
  removeFromPanela,
  addToBlacklist,
  removeFromBlacklist,
  getList,
} = require("../protectionManager");

module.exports = {
  handleProtection: async (message, command, args) => {
    // --- Lendo variáveis do .env ---
    const PREFIX = process.env.PREFIX || "mc!";
    const PANELA_LOG_ID = process.env.PANELA_LOG_ID;
    const BLACKLIST_LOG_ID = process.env.BLACKLIST_LOG_ID;

    // Apenas membros presentes na WHITELIST_IDS podem gerenciar segurança
    const whitelistEnv = process.env.WHITELIST_IDS || "";
    const WHITELIST_IDS = whitelistEnv
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    // Cores
    const COLOR_BASE = process.env.COLOR_BASE
      ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
      : 0x962dc0;
    const COLOR_SUCCESS = process.env.COLOR_SUCCESS
      ? parseInt(process.env.COLOR_SUCCESS.replace("#", ""), 16)
      : 0x00ff00;
    const COLOR_ERROR = process.env.COLOR_ERROR
      ? parseInt(process.env.COLOR_ERROR.replace("#", ""), 16)
      : 0xff0000;

    // Emojis
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_SHIELD = process.env.EMOJI_SHIELD || "🛡️";
    const EMOJI_SKULL = process.env.EMOJI_SKULL || "💀";
    const EMOJI_COMMUNITY = process.env.EMOJI_COMMUNITY || "👥";

    const createEmbed = (title, desc, color = COLOR_SUCCESS) => {
      return new EmbedBuilder()
        .setTitle(title)
        .setDescription(desc)
        .setColor(color)
        .setTimestamp();
    };

    // Bloqueia qualquer um que NÃO esteja na Whitelist (mesmo que seja Administrador)
    if (!WHITELIST_IDS.includes(message.author.id)) {
      return message.channel.send({
        embeds: [
          createEmbed(
            `${EMOJI_ERROR} Acesso Negado`,
            "Apenas a **Whitelist Oficial (Donos)** pode gerenciar os sistemas de proteção do servidor.",
            COLOR_ERROR,
          ),
        ],
      });
    }

    const action = args[0]?.toLowerCase();
    const targetId = args[1]?.replace(/<@!?(\d+)>/, "$1");

    const sendLog = async (channelId, title, desc, color) => {
      if (!channelId) return;
      const logChannel = message.guild.channels.cache.get(channelId);
      if (logChannel) {
        await logChannel.send({
          embeds: [
            createEmbed(title, desc, color).setFooter({
              text: `Executor: ${message.author.tag}`,
              iconURL: message.author.displayAvatarURL(),
            }),
          ],
        });
      }
    };

    // --- COMANDO PANELA ---
    if (command === "panela") {
      if (action === "list") {
        const list = await getList("panela");
        const description = list.length
          ? list.map((id) => `<@${id}> (\`${id}\`)`).join("\n")
          : "Ninguém na panela.";
        return message.channel.send({
          embeds: [
            createEmbed(
              `${EMOJI_COMMUNITY} Membros da Panela (Anti-ban)`,
              description,
              COLOR_BASE,
            ),
          ],
        });
      }

      if (!targetId) {
        return message.channel.send(
          `${EMOJI_ERROR} Uso: \`${PREFIX}panela add/rem <id/menção>\` ou \`${PREFIX}panela list\``,
        );
      }

      if (action === "add") {
        if (await addToPanela(targetId)) {
          await sendLog(
            PANELA_LOG_ID,
            `${EMOJI_COMMUNITY} Panela Atualizada`,
            `O usuário <@${targetId}> (\`${targetId}\`) foi **ADICIONADO** à Panela.`,
            COLOR_BASE,
          );

          return message.channel.send({
            embeds: [
              createEmbed(
                `${EMOJI_COMMUNITY} Adicionado à Panela`,
                `<@${targetId}> agora está na **Panela** e não pode ser punido por sistemas automáticos.`,
              ),
            ],
          });
        }
        return message.channel.send(
          `${EMOJI_ERROR} Este usuário já está na panela.`,
        );
      }

      if (action === "rem") {
        if (await removeFromPanela(targetId)) {
          await sendLog(
            PANELA_LOG_ID,
            `${EMOJI_SHIELD} Panela Atualizada`,
            `O usuário <@${targetId}> (\`${targetId}\`) foi **REMOVIDO** da Panela.`,
            COLOR_ERROR,
          );

          return message.channel.send({
            embeds: [
              createEmbed(
                `${EMOJI_COMMUNITY} Removido da Panela`,
                `<@${targetId}> foi removido da Panela.`,
                COLOR_ERROR,
              ),
            ],
          });
        }
        return message.channel.send(
          `${EMOJI_ERROR} Este usuário não estava na panela.`,
        );
      }
    }

    // --- COMANDO BLACKLIST ---
    if (command === "blacklist") {
      if (action === "list") {
        const list = await getList("blacklist");
        const description = list.length
          ? list.map((id) => `\`${id}\``).join("\n")
          : "Ninguém na blacklist.";
        return message.channel.send({
          embeds: [
            createEmbed(
              `${EMOJI_SKULL} Blacklist Geral`,
              description,
              0x2f3136,
            ),
          ],
        });
      }

      if (!targetId) {
        return message.channel.send(
          `${EMOJI_ERROR} Uso: \`${PREFIX}blacklist add/rem <id/menção>\` ou \`${PREFIX}blacklist list\``,
        );
      }

      if (action === "add") {
        // 1. Adiciona obrigatoriamente no banco de dados primeiro
        const added = await addToBlacklist(targetId);

        if (!added) {
          return message.channel.send(
            `${EMOJI_ERROR} Este ID já está na blacklist.`,
          );
        }

        // 2. Tenta efetuar o banimento direto no servidor
        let banStatus = "Usuário banido com sucesso!";
        try {
          await message.guild.members.ban(targetId, {
            reason: `Adicionado à Blacklist por ${message.author.tag}`,
          });
        } catch (err) {
          banStatus =
            "Adicionado à blacklist (mas não foi possível banir no momento devido a permissões/hierarquia). Ele será expulso se tentar entrar.";
        }

        await sendLog(
          BLACKLIST_LOG_ID,
          "🚫 Blacklist Atualizada",
          `O ID \`${targetId}\` foi **ADICIONADO** à Blacklist por <@${message.author.id}>.`,
          0x2f3136,
        );

        return message.channel.send({
          embeds: [
            createEmbed(
              `${EMOJI_SKULL} Blacklist Atualizada`,
              `O ID \`${targetId}\` foi adicionado à Blacklist.\n\n📌 **Status:** ${banStatus}`,
            ),
          ],
        });
      }

      if (action === "rem") {
        if (await removeFromBlacklist(targetId)) {
          try {
            await message.guild.members.unban(targetId);
          } catch (e) {}

          await sendLog(
            BLACKLIST_LOG_ID,
            "🚫 Blacklist Atualizada",
            `O ID \`${targetId}\` foi **REMOVIDO** da Blacklist por <@${message.author.id}>.`,
            COLOR_ERROR,
          );

          return message.channel.send({
            embeds: [
              createEmbed(
                `${EMOJI_SKULL} Blacklist Atualizada`,
                `O ID \`${targetId}\` foi removido da Blacklist e desbanido.`,
                COLOR_ERROR,
              ),
            ],
          });
        }
        return message.channel.send(
          `${EMOJI_ERROR} Este ID não estava na blacklist.`,
        );
      }
    }
  },
};
