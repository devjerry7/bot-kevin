const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../../config");

module.exports = {
  name: "live",
  description: "Gerencia o sistema de notificações de lives.",
  async execute(message, args) {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply(
        `${config.emoji.error} Você precisa ser Administrador para usar este comando.`,
      );
    }

    const subCommand = args[0]?.toLowerCase();
    const PREFIX = config.prefix || "mc!";

    // --- SUBCOMANDO: add <plataforma> <usuario> ---
    if (subCommand === "add") {
      const platform = args[1]?.toLowerCase();
      const username = args[2];

      if (
        !["twitch", "youtube", "kick", "tiktok"].includes(platform) ||
        !username
      ) {
        return message.reply(
          `${config.emoji.error} Uso correto: \`${PREFIX}live add <twitch/youtube/kick/tiktok> <usuario>\``,
        );
      }

      // Tratamento de limpeza do nome de usuário
      const cleanUsername = username.replace("@", "").trim();

      try {
        let streamer = await prisma.streamer.findFirst({
          where: { name: { equals: cleanUsername, mode: "insensitive" } },
        });

        if (!streamer) {
          streamer = await prisma.streamer.create({
            data: { name: cleanUsername, enabled: true },
          });
        }

        const existingPlatform = await prisma.streamerPlatform.findFirst({
          where: { streamerId: streamer.id, platform },
        });

        if (existingPlatform) {
          await prisma.streamerPlatform.update({
            where: { id: existingPlatform.id },
            data: { enabled: true, platformUsername: cleanUsername },
          });
        } else {
          await prisma.streamerPlatform.create({
            data: {
              streamerId: streamer.id,
              platform,
              platformUsername: cleanUsername,
              enabled: true,
            },
          });
        }

        return message.reply(
          `${config.emoji.success} Streamer **${cleanUsername}** da plataforma **${platform}** cadastrado com sucesso! O sistema validará a existência no próximo ciclo de rastreamento.`,
        );
      } catch (error) {
        console.error("[LiveCommand] Erro ao adicionar streamer:", error);
        return message.reply(
          `${config.emoji.error} Erro interno ao tentar cadastrar o streamer no banco de dados.`,
        );
      }
    }

    // --- SUBCOMANDO: remove / rem <plataforma> <usuario> ---
    if (subCommand === "remove" || subCommand === "rem") {
      const platform = args[1]?.toLowerCase();
      const username = args[2];

      if (!platform || !username) {
        return message.reply(
          `${config.emoji.error} Uso correto: \`${PREFIX}live remove <twitch/youtube/kick/tiktok> <usuario>\``,
        );
      }

      try {
        const platformRecord = await prisma.streamerPlatform.findFirst({
          where: {
            platform,
            platformUsername: {
              equals: username.replace("@", ""),
              mode: "insensitive",
            },
          },
        });

        if (!platformRecord) {
          return message.reply(
            `${config.emoji.error} Nenhum cadastro encontrado para **${username}** na plataforma **${platform}**.`,
          );
        }

        await prisma.streamerPlatform.delete({
          where: { id: platformRecord.id },
        });

        return message.reply(
          `${config.emoji.trash} O streamer **${username}** (${platform}) foi removido do sistema de notificações.`,
        );
      } catch (error) {
        console.error("[LiveCommand] Erro ao remover streamer:", error);
        return message.reply(
          `${config.emoji.error} Erro interno ao tentar remover o streamer.`,
        );
      }
    }

    // --- SUBCOMANDO: list ---
    if (subCommand === "list") {
      try {
        const platforms = await prisma.streamerPlatform.findMany({
          include: { streamer: true },
        });

        if (platforms.length === 0) {
          return message.reply(
            `${config.emoji.warning} Nenhum streamer cadastrado no momento.`,
          );
        }

        const listText = platforms
          .map(
            (p) =>
              `• **${p.streamer.name}** (${p.platform.toUpperCase()}) — Canal: \`${p.platformUsername}\``,
          )
          .join("\n");

        const embed = new EmbedBuilder()
          .setTitle("📺 Streamers Monitorados")
          .setDescription(listText)
          .setColor(config.colorBase || 0x962dc0)
          .setTimestamp();

        return message.channel.send({ embeds: [embed] });
      } catch (error) {
        console.error("[LiveCommand] Erro ao listar streamers:", error);
        return message.reply(
          `${config.emoji.error} Erro ao buscar lista de streamers.`,
        );
      }
    }

    // Ajuda Padrão do Comando
    return message.reply(
      `📌 **Painel de Controle - Lives**\n` +
        `• \`${PREFIX}live add <twitch/youtube/kick/tiktok> <usuario>\` - Adiciona um streamer\n` +
        `• \`${PREFIX}live remove <plataforma> <usuario>\` - Remove um streamer\n` +
        `• \`${PREFIX}live list\` - Lista todos os monitorados`,
    );
  },
};
