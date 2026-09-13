// events/interactionCreate.js
const {
  MessageFlags,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../config");

// --- IMPORTAÇÃO DOS HANDLERS ---
const handleSlashCommand = require("../handlers/slashHandler");
const handleStopGame = require("../handlers/stopGameHandler");
const handleVip = require("../handlers/vipHandler");
const handleGameRoles = require("../handlers/gameRoleHandler");
const handleGamblingInteract = require("../handlers/gamblingHandler");
const handleTicket = require("../handlers/ticketHandler");
const handleTempVoicePanel = require("../handlers/tempVoicePanelHandler");

// 🔔 IMPORTANDO O NOSSO NOVO SISTEMA DE NOTIFICAÇÕES
const handleNotifyRoles = require("../handlers/notifyRoleHandler");

module.exports = async (interaction) => {
  try {
    // 1. Tenta tratar Slash Commands (/config, /ping)
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction);
      return;
    }

    // ==========================================
    // 🏆 SISTEMA DE TORNEIO FREE FIRE (2x2)
    // ==========================================
    if (interaction.isButton()) {
      // 2A. CAPTURA DO BOTÃO DE INSCRIÇÃO
      if (interaction.customId === "ff_register_btn") {
        const tournament = await prisma.ffTournament.findUnique({
          where: { id: "main" },
        });

        if (!tournament || !tournament.isOpen) {
          return interaction.reply({
            content: `${config.emoji.error} As inscrições para o campeonato estão encerradas no momento!`,
            flags: MessageFlags.Ephemeral,
          });
        }

        try {
          await prisma.ffParticipant.create({
            data: {
              userId: interaction.user.id,
              username: interaction.user.username,
            },
          });

          return interaction.reply({
            content: `${config.emoji.success} Inscrição realizada com sucesso! Fique atento para o sorteio das duplas.`,
            flags: MessageFlags.Ephemeral,
          });
        } catch (error) {
          return interaction.reply({
            content: `${config.emoji.warning || "⚠️"} Você já está inscrito neste campeonato!`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      // 2B. CAPTURA DO BOTÃO DE VITÓRIA NO CHAVEAMENTO
      if (interaction.customId.startsWith("ff_win_")) {
        // Apenas admins podem definir o vencedor
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator,
          )
        ) {
          return interaction.reply({
            content: `${config.emoji.error || "❌"} Apenas administradores podem definir o vencedor da partida.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        // Extrai os dados do customId (ex: ff_win_MATCHID_TEAMID)
        const [, , matchId, winnerTeamId] = interaction.customId.split("_");

        // Atualiza a partida no banco de dados
        await prisma.ffMatch.update({
          where: { id: matchId },
          data: { status: "finished", winnerId: winnerTeamId },
        });

        // Busca o nome da equipe vencedora para a mensagem
        const winningTeam = await prisma.ffTeam.findUnique({
          where: { id: winnerTeamId },
        });

        // Refaz os botões da mensagem para desativá-los e destacar o vencedor
        const updatedComponents = interaction.message.components.map((row) => {
          const newRow = new ActionRowBuilder();
          row.components.forEach((btn) => {
            const isWinnerBtn = btn.customId.includes(winnerTeamId);
            const newBtn = ButtonBuilder.from(btn)
              .setDisabled(true)
              .setStyle(
                isWinnerBtn ? ButtonStyle.Success : ButtonStyle.Secondary,
              );
            newRow.addComponents(newBtn);
          });
          return newRow;
        });

        // Atualiza a mensagem original desativando os botões
        await interaction.update({ components: updatedComponents });

        await interaction.followUp({
          content: `${config.emoji.success || "✅"} **${winningTeam.teamName}** foi declarada vencedora desta chave!`,
        });

        // ==========================================
        // 🔄 CHECAGEM AUTOMÁTICA DE PROGRESSÃO DE ROUND
        // ==========================================
        const matchData = await prisma.ffMatch.findUnique({
          where: { id: matchId },
        });
        const currentRound = matchData.round;

        const roundMatches = await prisma.ffMatch.findMany({
          where: { round: currentRound },
        });
        const pendingInRound = roundMatches.filter(
          (m) => m.status !== "finished",
        );

        if (pendingInRound.length === 0) {
          const winnerIds = roundMatches.map((m) => m.winnerId).filter(Boolean);

          if (winnerIds.length === 1) {
            const champion = await prisma.ffTeam.findUnique({
              where: { id: winnerIds[0] },
            });

            const champEmbed = new EmbedBuilder()
              .setTitle(`👑 TEMOS UM CAMPEÃO! 👑`)
              .setDescription(
                `A equipe **${champion.teamName}** formou a dupla perfeita!\n🏆 <@${champion.player1Id}> & <@${champion.player2Id}> amassaram todos e levaram o torneio!`,
              )
              .setColor(0xffd700)
              .setThumbnail(
                "https://media.giphy.com/media/l0ExhcMymdL6TrZ84/giphy.gif",
              )
              .setFooter({ text: "Fim do Campeonato 2x2" });

            await prisma.ffTournament.update({
              where: { id: "main" },
              data: { isOpen: false },
            });
            return interaction.channel.send({ embeds: [champEmbed] });
          }

          const nextRound = currentRound + 1;
          await interaction.channel.send(
            `${config.emoji.loading || "⏳"} **Todas as partidas da Rodada ${currentRound} foram finalizadas! Gerando Chaveamento - Rodada ${nextRound}...**`,
          );

          const teams = await prisma.ffTeam.findMany({
            where: { id: { in: winnerIds } },
          });

          for (let i = 0; i < teams.length; i += 2) {
            if (teams[i + 1]) {
              const teamA = teams[i];
              const teamB = teams[i + 1];

              const newMatch = await prisma.ffMatch.create({
                data: {
                  round: nextRound,
                  teamAId: teamA.id,
                  teamBId: teamB.id,
                  status: "pending",
                },
              });

              const embed = new EmbedBuilder()
                .setTitle(
                  `⚔️ FASE ${nextRound}: ${teamA.teamName} vs ${teamB.teamName}`,
                )
                .setDescription(
                  `**${teamA.teamName}**\n<@${teamA.player1Id}> & <@${teamA.player2Id}>\n\n**VS**\n\n**${teamB.teamName}**\n<@${teamB.player1Id}> & <@${teamB.player2Id}>`,
                )
                .setColor(config.colorBase || 0x962dc0);

              const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId(`ff_win_${newMatch.id}_${teamA.id}`)
                  .setLabel(`Vitória ${teamA.teamName}`)
                  .setStyle(ButtonStyle.Secondary)
                  .setEmoji(config.emoji.success || "✅"),
                new ButtonBuilder()
                  .setCustomId(`ff_win_${newMatch.id}_${teamB.id}`)
                  .setLabel(`Vitória ${teamB.teamName}`)
                  .setStyle(ButtonStyle.Secondary)
                  .setEmoji(config.emoji.success || "✅"),
              );

              const msg = await interaction.channel.send({
                embeds: [embed],
                components: [row],
              });
              await prisma.ffMatch.update({
                where: { id: newMatch.id },
                data: { messageId: msg.id },
              });
            } else {
              interaction.channel.send(
                `*A **${teams[i].teamName}** avançou por W.O nesta fase (Chave ímpar).*`,
              );
            }
          }
        }
        return;
      }
    }

    // 3. ROTEAMENTO DOS SISTEMAS PRINCIPAIS (Botões, Menus e Modais ativos)
    if (await handleGameRoles(interaction)) return;
    if (await handleNotifyRoles(interaction)) return;
    if (await handleStopGame(interaction)) return;
    if (await handleVip(interaction)) return;
    if (await handleGamblingInteract(interaction)) return;
    if (await handleTicket(interaction)) return;
    if (await handleTempVoicePanel(interaction)) return;
  } catch (error) {
    console.error("[FATAL ERROR] Erro crítico no interactionCreate:", error);

    // Fallback para avisar o usuário sem travar o bot
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "❌ Ocorreu um erro interno ao processar sua ação.",
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }
  }
};
