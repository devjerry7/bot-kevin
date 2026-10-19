// handlers/LiveNotificationManager.js
const { EmbedBuilder } = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../../config");

const TwitchProvider = require("./providers/TwitchProvider");
const YouTubeProvider = require("./providers/YouTubeProvider");
const KickProvider = require("./providers/KickProvider");
const TikTokProvider = require("./providers/TikTokProvider");

const OFFICIAL_BANNER_URL =
  "https://cdn.discordapp.com/attachments/1553534170179833951/1561884993159045241/2QN_Banner_oficial.png?ex=6ad7fa40&is=6ad6a8c0&hm=376a002fb58d6507603ede53f3e899c7b6f4639a1e20e3085eb3b0dad0199f99&";

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

      // Busca os streamers cadastrados e ativos no banco
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

      // Executa a checagem em todos os provedores com isolamento de falha
      const allEventsPromises = this.providers.map((provider) =>
        provider.checkLives(streamersList).catch((err) => {
          console.error(
            `[LiveManager] Erro no provider ${provider.name || "Desconhecido"}:`,
            err.message,
          );
          return [];
        }),
      );

      const results = await Promise.all(allEventsPromises);
      const allEvents = results.flat();

      for (const event of allEvents) {
        if (!event || !event.streamerId || !event.platform) continue;

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

        // Validação estrita para evitar falsos positivos
        if (event.isLive === true) {
          if (!activeSession) {
            const newSession = await prisma.liveSession.create({
              data: {
                platformId: platformRecord.id,
                externalLiveId: event.platformLiveId || `live_${Date.now()}`,
                isActive: true,
              },
            });

            const embed = new EmbedBuilder()
              .setColor(config.colorBase || 0x962dc0)
              .setAuthor({
                name: `${event.displayName || platformRecord.platformUsername} está ao vivo na ${event.platform.toUpperCase()}!`,
                iconURL: event.avatarUrl || event.thumbnail || undefined,
              })
              .setTitle(
                event.title ||
                  `Transmissão de ${event.displayName || "Streamer"}`,
              )
              .setURL(event.url || "https://twitch.tv")
              .addFields(
                {
                  name: "<:jg_game2qn:1546273610971218000> Jogo / Categoria",
                  value: event.category || "Não especificado",
                  inline: true,
                },
                {
                  name: "<:pr_pessoinha2qn:1542026405481684994> Visualizadores",
                  value: `\`${Number(event.viewerCount || 0).toLocaleString("pt-BR")}\``,
                  inline: true,
                },
              )
              .setImage(OFFICIAL_BANNER_URL)
              .setTimestamp(event.startedAt || new Date())
              .setFooter({
                text: `Plataforma: ${event.platform.toUpperCase()} | 2QN Streamers`,
                iconURL: this.client.user?.displayAvatarURL(),
              });

            if (event.thumbnail) {
              embed.setThumbnail(event.thumbnail);
            }

            const mentions = [];
            if (config.notifyRoles?.live) {
              mentions.push(`<@&${config.notifyRoles.live}>`);
            }

            const gameRoleId = this.resolveGameRole(event.category);
            if (gameRoleId) {
              mentions.push(`<@&${gameRoleId}>`);
            }

            const mentionString = mentions.length > 0 ? mentions.join(" ") : "";

            const sentMessage = await channel.send({
              content: `${mentionString} **${event.displayName || "Streamer"}** acabou de iniciar uma transmissão! <:verm_botao2qn:1546265901161255085>`,
              embeds: [embed],
            });

            await prisma.liveSession.update({
              where: { id: newSession.id },
              data: { discordMessageId: sentMessage.id },
            });
          }
        } else {
          // Se a live encerrou, fecha a sessão e atualiza a mensagem no Discord
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
                    .setFooter({
                      text: "<:verm_botao2qn:1546265901161255085> Transmissão Encerrada | 2QN Streamers",
                    });

                  await msg
                    .edit({
                      content: `<:verm_botao2qn:1546265901161255085> A transmissão foi encerrada.`,
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
