// commands/protection.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
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

    // Cores
    const COLOR_BASE = process.env.COLOR_BASE
      ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
      : 0x00e5ff;
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

    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.channel.send({
        embeds: [
          createEmbed(
            `${EMOJI_ERROR} Sem Permissão`,
            "Apenas Administradores podem gerenciar a Proteção.",
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
                `${EMOJI_COMMUNITY} Adicionado`,
                `<@${targetId}> agora está na **Panela** e não pode ser banido pelo bot.`,
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
                `${EMOJI_COMMUNITY} Removido`,
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
            createEmbed(`${EMOJI_SKULL} Blacklist`, description, 0x2f3136),
          ],
        });
      }

      if (!targetId) {
        return message.channel.send(
          `${EMOJI_ERROR} Uso: \`${PREFIX}blacklist add/rem <id>\` ou \`${PREFIX}blacklist list\``,
        );
      }

      if (action === "add") {
        const member = await message.guild.members
          .fetch(targetId)
          .catch(() => null);

        if (member) {
          if (!member.bannable) {
            return message.channel.send(
              `${EMOJI_ERROR} Não consigo banir este usuário agora (cargo alto), mas adicionei à lista.`,
            );
          }
          await member.ban({
            reason: `Blacklist adicionada por ${message.author.tag}`,
          });
        }

        if (await addToBlacklist(targetId)) {
          await sendLog(
            BLACKLIST_LOG_ID,
            "🚫 Blacklist Atualizada",
            `O ID \`${targetId}\` foi **ADICIONADO** à Blacklist.`,
            0x2f3136,
          );

          return message.channel.send({
            embeds: [
              createEmbed(
                `${EMOJI_SKULL} Blacklist`,
                `O ID \`${targetId}\` foi adicionado à Blacklist e será banido se entrar.`,
              ),
            ],
          });
        }
        return message.channel.send(
          `${EMOJI_ERROR} Este ID já está na blacklist.`,
        );
      }

      if (action === "rem") {
        if (await removeFromBlacklist(targetId)) {
          try {
            await message.guild.members.unban(targetId);
          } catch (e) {}

          await sendLog(
            BLACKLIST_LOG_ID,
            "🚫 Blacklist Atualizada",
            `O ID \`${targetId}\` foi **REMOVIDO** da Blacklist.`,
            COLOR_ERROR,
          );

          return message.channel.send({
            embeds: [
              createEmbed(
                `${EMOJI_SKULL} Blacklist`,
                `O ID \`${targetId}\` foi removido da Blacklist.`,
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
