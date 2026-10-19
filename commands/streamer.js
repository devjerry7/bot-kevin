// commands/streamer.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const streamerConfig = require("../config/streamerConfig");

module.exports = {
  name: "streamer",
  description:
    "Gerencia o programa de streamers, vínculos de plataformas e metas.",
  async execute(message, args) {
    const prefix = "mc!";
    const subCommand = args[0] ? args[0].toLowerCase() : "";

    const COLOR_BASE = process.env.COLOR_BASE
      ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
      : 0x962dc0;
    const COLOR_ERROR = 0xff0000;

    const createEmbed = (title, description, color = COLOR_BASE) => {
      return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
    };

    // ====================================================
    // SUBCOMANDO: LISTAR TODOS OS STREAMERS
    // Uso: mc!streamer list / listar
    // ====================================================
    if (subCommand === "list" || subCommand === "listar") {
      try {
        const streamers = await prisma.streamer.findMany({
          include: { platforms: true },
        });

        if (streamers.length === 0) {
          return message.channel.send({
            embeds: [
              createEmbed(
                "<a:br_2qn:1559272726739558562> NENHUM STREAMER CADASTRADO",
                "Ainda não há nenhum streamer vinculado ao sistema.",
                COLOR_ERROR,
              ),
            ],
          });
        }

        const streamerFormattedList = streamers
          .map((s) => {
            const userMention = s.discordUserId
              ? `<@${s.discordUserId}>`
              : `\`${s.displayName}\``;
            const platforms =
              s.platforms.length > 0
                ? s.platforms
                    .map(
                      (p) =>
                        `\`${p.platform.toUpperCase()}\`: ${p.platformUsername}`,
                    )
                    .join(" | ")
                : "Sem plataformas vinculadas";

            return `• **${userMention}**\n  └ ${platforms}`;
          })
          .join("\n\n");

        return message.channel.send({
          embeds: [
            createEmbed(
              "<:br_registro2qn:1557798191100072119> STREAMERS MONITORADOS",
              `Lista de todos os criadores de conteúdo cadastrados no servidor:\n\n${streamerFormattedList}`,
            ),
          ],
        });
      } catch (error) {
        console.error("[STREAMER LIST ERROR]:", error);
        return message.channel.send({
          embeds: [
            createEmbed(
              "<:br_errado2qn:1556905095919050762> Erro no Banco",
              "Ocorreu um erro ao buscar a lista de streamers.",
              COLOR_ERROR,
            ),
          ],
        });
      }
    }

    // ====================================================
    // SUBCOMANDO: ADICIONAR / VINCULAR CANAL DO STREAMER (Admin)
    // Uso: mc!streamer add @Membro twitch nome_do_canal
    // ====================================================
    if (subCommand === "add" || subCommand === "adicionar") {
      if (
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return message.channel.send({
          embeds: [
            createEmbed(
              "<:br_errado2qn:1556905095919050762> Permissão Negada",
              "Apenas administradores podem vincular canais de streamers.",
              COLOR_ERROR,
            ),
          ],
        });
      }

      const targetMember = message.mentions.members.first();
      const platform = args[2] ? args[2].toLowerCase() : "";
      const platformUsername = args[3];

      const validPlatforms = ["twitch", "youtube", "kick", "tiktok"];

      if (
        !targetMember ||
        !platform ||
        !platformUsername ||
        !validPlatforms.includes(platform)
      ) {
        return message.channel.send({
          embeds: [
            createEmbed(
              "<:ama_cuidado2qn:1545494059081142403> Uso Incorreto",
              `Use o formato correto:\n\`${prefix}streamer add @Membro <twitch|youtube|kick|tiktok> <username>\``,
              COLOR_ERROR,
            ),
          ],
        });
      }

      try {
        let streamerRecord = await prisma.streamer.findFirst({
          where: { discordUserId: targetMember.id },
        });

        if (!streamerRecord) {
          streamerRecord = await prisma.streamer.create({
            data: {
              discordUserId: targetMember.id,
              displayName: targetMember.user.tag,
              enabled: true,
            },
          });
        }

        await prisma.streamerPlatform.upsert({
          where: {
            streamerId_platform: {
              streamerId: streamerRecord.id,
              platform: platform,
            },
          },
          update: {
            platformUsername: platformUsername,
            platformUserId: platformUsername,
            enabled: true,
          },
          create: {
            streamerId: streamerRecord.id,
            platform: platform,
            platformUsername: platformUsername,
            platformUserId: platformUsername,
            enabled: true,
          },
        });

        return message.channel.send({
          embeds: [
            createEmbed(
              "<a:ver_verifcado2qn:1535775624864473169> Streamer Vinculado com Sucesso!",
              `<:pr_pessoinha2qn:1542026405481684994> **Membro:** ${targetMember}\n🌐 **Plataforma:** \`${platform.toUpperCase()}\`\n🔗 **Canal/Usuário:** \`${platformUsername}\``,
            ),
          ],
        });
      } catch (error) {
        console.error("[STREAMER ADD ERROR]:", error);
        return message.channel.send({
          embeds: [
            createEmbed(
              "<:br_errado2qn:1556905095919050762> Erro no Banco",
              "Ocorreu um erro ao salvar o vínculo no banco de dados.",
              COLOR_ERROR,
            ),
          ],
        });
      }
    }

    // ====================================================
    // SUBCOMANDO: REMOVER PLATAFORMA / STREAMER (Admin)
    // Uso: mc!streamer remove @Membro <plataforma>
    // ====================================================
    if (subCommand === "remove" || subCommand === "remover") {
      if (
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return message.channel.send({
          embeds: [
            createEmbed(
              "<:br_errado2qn:1556905095919050762> Permissão Negada",
              "Apenas administradores podem remover canais de streamers.",
              COLOR_ERROR,
            ),
          ],
        });
      }

      const targetMember = message.mentions.members.first();
      const platform = args[2] ? args[2].toLowerCase() : "";

      if (!targetMember) {
        return message.channel.send({
          embeds: [
            createEmbed(
              "<:ama_cuidado2qn:1545494059081142403> Uso Incorreto",
              `Use o formato correto:\n\`${prefix}streamer remove @Membro [plataforma]\``,
              COLOR_ERROR,
            ),
          ],
        });
      }

      try {
        const streamerRecord = await prisma.streamer.findFirst({
          where: { discordUserId: targetMember.id },
        });

        if (!streamerRecord) {
          return message.channel.send({
            embeds: [
              createEmbed(
                "<:ama_cuidado2qn:1545494059081142403> Não Encontrado",
                "Este usuário não possui cadastro no programa de streamers.",
                COLOR_ERROR,
              ),
            ],
          });
        }

        if (platform) {
          await prisma.streamerPlatform.deleteMany({
            where: {
              streamerId: streamerRecord.id,
              platform: platform,
            },
          });
        } else {
          await prisma.streamer.delete({
            where: { id: streamerRecord.id },
          });
        }

        return message.channel.send({
          embeds: [
            createEmbed(
              "<a:ver_verifcado2qn:1535775624864473169> Removido com Sucesso!",
              platform
                ? `A plataforma \`${platform.toUpperCase()}\` foi desvinculada do membro ${targetMember}.`
                : `O streamer ${targetMember} foi completamente removido do sistema.`,
            ),
          ],
        });
      } catch (error) {
        console.error("[STREAMER REMOVE ERROR]:", error);
        return message.channel.send({
          embeds: [
            createEmbed(
              "<:br_errado2qn:1556905095919050762> Erro no Banco",
              "Ocorreu um erro ao remover o vínculo no banco de dados.",
              COLOR_ERROR,
            ),
          ],
        });
      }
    }

    // ====================================================
    // SUBCOMANDO: GERAR LINK DE CONVITE EXCLUSIVO
    // Uso: mc!streamer link
    // ====================================================
    if (subCommand === "link" || subCommand === "convite") {
      const streamerRecord = await prisma.streamer.findFirst({
        where: { discordUserId: message.author.id },
      });

      if (!streamerRecord || !streamerRecord.enabled) {
        return message.channel.send({
          embeds: [
            createEmbed(
              "<:br_errado2qn:1556905095919050762> Não Autorizado",
              "Você não possui um canal vinculado no sistema de streamers.",
              COLOR_ERROR,
            ),
          ],
        });
      }

      try {
        const invite = await message.channel.createInvite({
          maxAge: 0,
          maxUses: 0,
          unique: true,
          reason: `Convite exclusivo do streamer ${message.author.tag}`,
        });

        return message.channel.send({
          embeds: [
            createEmbed(
              "<:br_link2qn:1555677611148054649> Seu Link de Convite Exclusivo",
              `Divulgue este link na sua live para contabilizar novos membros na sua meta:\n\n<:br_link2qn:1555677611148054649> **${invite.url}**`,
            ),
          ],
        });
      } catch (error) {
        console.error("[STREAMER INVITE ERROR]:", error);
        return message.channel.send({
          embeds: [
            createEmbed(
              "<:br_errado2qn:1556905095919050762> Erro",
              "Não foi possível gerar o link de convite. Verifique as permissões do bot.",
              COLOR_ERROR,
            ),
          ],
        });
      }
    }

    // ====================================================
    // SUBCOMANDO: CONSULTAR PERFIL / METAS
    // Uso: mc!streamer (ou mc!streamer @Membro)
    // ====================================================
    const targetId = message.mentions.users.first()?.id || message.author.id;

    const streamerData = await prisma.streamer.findFirst({
      where: { discordUserId: targetId },
      include: { platforms: true },
    });

    if (!streamerData) {
      return message.channel.send({
        embeds: [
          createEmbed(
            "<a:br_2qn:1559272726739558562> Informação",
            `Este usuário não possui canal de live vinculado.\nUse \`${prefix}streamer add @Membro plataforma usuario\` para vincular.`,
            COLOR_ERROR,
          ),
        ],
      });
    }

    const totalHoursInCall = (
      (streamerData.weeklyVoiceMinutes || 0) / 60
    ).toFixed(1);
    const goalHours = streamerConfig.goals.weeklyVoiceHours;
    const goalInvites = streamerConfig.goals.weeklyInvites;

    const platformsList =
      streamerData.platforms.length > 0
        ? streamerData.platforms
            .map(
              (p) =>
                `• **${p.platform.toUpperCase()}**: \`${p.platformUsername}\``,
            )
            .join("\n")
        : "Nenhuma plataforma vinculada.";

    const embed = createEmbed(
      `<:br_registro2qn:1557798191100072119> Perfil de Streamer — ${streamerData.displayName || streamerData.name}`,
      `Estatísticas de monitoramento:\n\n` +
        `<:br_incricao2qn:1556905090835546173> **Plataformas Vinculadas:**\n${platformsList}\n\n` +
        `<:br_relogio2qn:1556898949011603487> **Tempo em Call na Semana:** \`${totalHoursInCall}h\` / \`${goalHours}h\` meta\n` +
        `<:br_link2qn:1555677611148054649> **Membros Recrutados:** \`${streamerData.weeklyInvites || 0}\` / \`${goalInvites}\` meta\n\n` +
        `<:br_aviso2qn:1556905092374863883> **Status:** ${streamerData.enabled ? "🟢 Monitorando" : "<:verm_botao2qn:1546265901161255085> Inativo"}`,
    );

    return message.channel.send({ embeds: [embed] });
  },
};
