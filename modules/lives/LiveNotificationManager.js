const { EmbedBuilder } = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../../config"); // Puxa direto do seu config.js central

const TwitchProvider = require("./providers/TwitchProvider");
const YouTubeProvider = require("./providers/YouTubeProvider");
const KickProvider = require("./providers/KickProvider");
const TikTokProvider = require("./providers/TikTokProvider");

class LiveNotificationManager {
  constructor(client) {
    this.client = client;
    this.providers = [
      new TwitchProvider(),
      new YouTubeProvider(),
      new KickProvider(),
      new TikTokProvider(),
    ];
  }

  // Mapeia o nome do jogo/categoria da live para a chave correspondente no config.gameRoles
  resolveGameRole(categoryName) {
    if (!categoryName) return null;
    const lowerCategory = categoryName.toLowerCase();

    if (lowerCategory.includes("free fire") || lowerCategory.includes("ff"))
      return config.gameRoles?.ff;
    if (lowerCategory.includes("valorant") || lowerCategory.includes("val"))
      return config.gameRoles?.val;
    if (
      lowerCategory.includes("counter-strike") ||
      lowerCategory.includes("cs2") ||
      lowerCategory.includes("cs:go")
    )
      return config.gameRoles?.cs;
    if (
      lowerCategory.includes("gta") ||
      lowerCategory.includes("grand theft auto")
    )
      return config.gameRoles?.gta;
    if (lowerCategory.includes("roblox")) return config.gameRoles?.roblox;
    if (lowerCategory.includes("minecraft") || lowerCategory.includes("mine"))
      return config.gameRoles?.mine;
    if (
      lowerCategory.includes("league of legends") ||
      lowerCategory.includes("lol")
    )
      return config.gameRoles?.lol;
    if (lowerCategory.includes("fortnite")) return config.gameRoles?.fortnite;
    if (lowerCategory.includes("among us")) return config.gameRoles?.amongus;
    if (lowerCategory.includes("clash royale")) return config.gameRoles?.clash;
    if (lowerCategory.includes("stumble guys"))
      return config.gameRoles?.stumble;
    if (lowerCategory.includes("standoff")) return config.gameRoles?.standoff;
    if (lowerCategory.includes("gartic")) return config.gameRoles?.gartic;
    if (lowerCategory.includes("blood strike"))
      return config.gameRoles?.bloodstrike;

    return null;
  }

  async checkAllStreams() {
    try {
      const channelId = config.liveChannelId || process.env.LIVE_CHANNEL_ID;
      if (!channelId) return;

      const channel = await this.client.channels
        .fetch(channelId)
        .catch(() => null);
      if (!channel) return;

      // Busca os streamers cadastrados no Prisma junto com o perfil do streamer
      const platformsData = await prisma.streamerPlatform.findMany({
        where: { enabled: true, streamer: { enabled: true } },
        include: { streamer: true },
      });

      if (platformsData.length === 0) return;

      const streamersList = platformsData.map((p) => ({
        streamerId: p.streamerId,
        platform: p.platform,
        platformUserId: p.platformUserId,
        platformUsername: p.platformUsername,
      }));

      // Executa a checagem em todos os provedores
      const allEventsPromises = this.providers.map((provider) =>
        provider.checkLives(streamersList).catch((err) => {
          console.error(
            `[LiveManager] Erro no provider ${provider.name}:`,
            err.message,
          );
          return [];
        }),
      );

      const results = await Promise.all(allEventsPromises);
      const allEvents = results.flat();

      for (const event of allEvents) {
        const platformRecord = platformsData.find(
          (p) =>
            p.streamerId === event.streamerId &&
            p.platform.toLowerCase() === event.platform.toLowerCase(),
        );

        if (!platformRecord) continue;

        const activeSession = await prisma.liveSession.findFirst({
          where: {
            platformId: platformRecord.id,
            isActive: true,
          },
        });

        if (event.isLive) {
          if (!activeSession) {
            const newSession = await prisma.liveSession.create({
              data: {
                platformId: platformRecord.id,
                externalLiveId: event.platformLiveId || `live_${Date.now()}`,
                isActive: true,
              },
            });

            // --- ESTRUTURA VISUAL APRIMORADA ---
            const embed = new EmbedBuilder()
              .setColor(config.colorBase || 0x962dc0)
              .setAuthor({
                name: `${event.displayName} está ao vivo na ${event.platform.toUpperCase()}!`,
                iconURL: event.avatarUrl || event.thumbnail || undefined, // Exibe o avatar do criador
              })
              .setTitle(event.title || `Transmissão de ${event.displayName}`)
              .setURL(event.url)
              .addFields(
                {
                  name: "🎮 Jogo / Categoria",
                  value: event.category || "Não especificado",
                  inline: true,
                },
                {
                  name: "👥 Visualizadores",
                  value: `\`${Number(event.viewerCount || 0).toLocaleString("pt-BR")}\``,
                  inline: true,
                },
              )
              .setTimestamp(event.startedAt || new Date())
              .setFooter({
                text: `Plataforma: ${event.platform.toUpperCase()} • Sistema de Lives`,
                iconURL: this.client.user?.displayAvatarURL(),
              });

            // Define a miniatura grande da live se houver
            if (event.thumbnail) {
              embed.setImage(event.thumbnail);
            }

            // Montagem inteligente das menções de cargos
            const mentions = [];

            // 1. Cargo geral de lives
            if (config.notifyRoles?.live) {
              mentions.push(`<@&${config.notifyRoles.live}>`);
            }

            // 2. Cargo específico do jogo transmitido
            const gameRoleId = this.resolveGameRole(event.category);
            if (gameRoleId) {
              mentions.push(`<@&${gameRoleId}>`);
            }

            const mentionString = mentions.length > 0 ? mentions.join(" ") : "";

            const sentMessage = await channel.send({
              content: `${mentionString} **${event.displayName}** acabou de iniciar uma transmissão! 🔴`,
              embeds: [embed],
            });

            await prisma.liveSession.update({
              where: { id: newSession.id },
              data: { discordMessageId: sentMessage.id },
            });
          }
        } else {
          // Se a live encerrou e havia uma sessão ativa, fechamos e editamos a mensagem
          if (activeSession) {
            try {
              if (activeSession.discordMessageId) {
                const msg = await channel.messages
                  .fetch(activeSession.discordMessageId)
                  .catch(() => null);
                if (msg && msg.embeds[0]) {
                  const oldEmbed = msg.embeds[0];
                  const finishedEmbed = EmbedBuilder.from(oldEmbed)
                    .setColor(0x2f3136)
                    .setTitle(`[ENCERRADA] ${oldEmbed.title}`)
                    .setFooter({ text: "🔴 Transmissão Encerrada" });

                  await msg
                    .edit({
                      content: `🔴 A transmissão de **${event.displayName}** foi encerrada.`,
                      embeds: [finishedEmbed],
                    })
                    .catch(() => {});
                }
              }
            } catch (err) {
              console.error(
                "[LiveManager] Erro ao atualizar mensagem de encerramento:",
                err,
              );
            }

            await prisma.liveSession.update({
              where: { id: activeSession.id },
              data: {
                isActive: false,
                endedAt: new Date(),
              },
            });
          }
        }
      }
    } catch (error) {
      console.error(
        "[LiveNotificationManager] Erro crítico no ciclo de checagem:",
        error,
      );
    }
  }
}

module.exports = LiveNotificationManager;
