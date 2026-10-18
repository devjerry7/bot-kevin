// events/interactionCreate.js
const {
  EmbedBuilder,
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

// <a:am_trofelzinho:1556881756521766934> IMPORTANDO O HANDLER DO CAMPEONATO 4X4 (2QN)
const handleTournamentInteractions = require("../handlers/tournamentHandler");

// 💸 IMPORTANDO O HANDLER DE PAGAMENTO E PIX
const handlePaymentInteractions = require("../handlers/paymentHandler");

// 🚨 IMPORTANDO O HANDLER DE DENÚNCIAS
const handleReportInteractions = require("../handlers/reportHandler");

// ⚔️ SERVIÇO DE INFRAESTRUTURA DE CONFRONTOS NO DISCORD
const DiscordMatchService = require("../services/discordMatchService");

// 📊 SERVIÇO DO TORNEIO (Para salvar o vencedor da partida 4x4)
const TournamentService = require("../services/tournamentService");

module.exports = async (interaction) => {
  try {
    // ==========================================
    // 📊 SISTEMA DE LOGS DE ENTRADA (CONSOLE)
    // ==========================================
    const userTag = interaction.user ? interaction.user.tag : "Desconhecido";
    const userId = interaction.user ? interaction.user.id : "ID_DESCONHECIDO";
    const guildName = interaction.guild ? interaction.guild.name : "DM/Privado";

    if (interaction.isChatInputCommand()) {
      console.log(
        `[LOG / COMANDO] /${interaction.commandName} executado por ${userTag} (${userId}) em [${guildName}]`,
      );
    } else if (interaction.isButton()) {
      console.log(
        `[LOG / BOTÃO] Botão clicado: "${interaction.customId}" por ${userTag} (${userId}) em [${guildName}]`,
      );
    } else if (
      interaction.isStringSelectMenu() ||
      interaction.isAnySelectMenu()
    ) {
      console.log(
        `[LOG / MENU] Menu selecionado: "${interaction.customId}" por ${userTag} (${userId}) em [${guildName}]`,
      );
    } else if (interaction.isModalSubmit()) {
      console.log(
        `[LOG / MODAL] Modal enviado: "${interaction.customId}" por ${userTag} (${userId}) em [${guildName}]`,
      );
    }

    // 1. Tenta tratar Slash Commands (/config, /ping)
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith("bolao_")) {
      return require("../handlers/bolaoInteractionHandler")(interaction);
    }

    // ==========================================
    // <a:am_trofelzinho:1556881756521766934> MENU DE SELEÇÃO DE CONFRONTOS (4X4)
    // ==========================================
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "select_start_match") {
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator,
          )
        ) {
          return interaction.reply({
            content: `${config.emoji.error || "<:verm_x2qn:1545444524241719376>"} Apenas administradores podem iniciar os confrontos.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const matchId = interaction.values[0];

        try {
          const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
              teamA: { include: { players: true } },
              teamB: { include: { players: true } },
            },
          });

          if (!match) {
            return interaction.editReply(
              "<:verm_x2qn:1545444524241719376> Partida não encontrada no banco de dados.",
            );
          }

          const infra = await DiscordMatchService.setupMatchInfrastructure(
            interaction.guild,
            match,
            "Confronto",
          );

          if (!infra) {
            return interaction.editReply(
              "<:ama_cuidado2qn:1545494059081142403> Esta partida é um BYE e não possui infraestrutura de Discord.",
            );
          }

          await interaction.editReply(
            `<a:ver_verifcado2qn:1535775624864473169> Infraestrutura criada com sucesso! Categoria, calls e canal de texto gerados para **${match.teamA.name} x ${match.teamB.name}**.`,
          );

          const adminLogChannel = await interaction.client.channels
            .fetch(DiscordMatchService.CHANNELS.ADMIN_LOGS)
            .catch(() => null);

          if (adminLogChannel) {
            const matchNum = match.matchNumber || 1;
            await adminLogChannel.send(
              `📢 **Confronto Iniciado:** Jogo ${matchNum} (${match.teamA.name} vs ${match.teamB.name}) liberado por <@${interaction.user.id}>.`,
            );
          }
        } catch (err) {
          console.error("[ERRO MATCH START]", err);
          await interaction.editReply(
            "<:verm_x2qn:1545444524241719376> Erro ao criar a infraestrutura do confronto no Discord. Verifique os logs do console.",
          );
        }
        return;
      }
    }

    // ==========================================
    // <a:am_trofelzinho:1556881756521766934> SISTEMA DE TORNEIO FREE FIRE (LEGADO & 4X4)
    // ==========================================
    if (interaction.isButton()) {
      // 2C. CAPTURA DO BOTÃO DE INICIAR CONFRONTO (LEGADO - MANTIDO PARA COMPATIBILIDADE)
      if (interaction.customId.startsWith("start_match_")) {
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator,
          )
        ) {
          return interaction.reply({
            content: `${config.emoji.error || "<:verm_x2qn:1545444524241719376>"} Apenas administradores podem iniciar os confrontos.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const matchId = interaction.customId.replace("start_match_", "");

        try {
          const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
              teamA: { include: { players: true } },
              teamB: { include: { players: true } },
            },
          });

          if (!match) {
            return interaction.editReply(
              "<:verm_x2qn:1545444524241719376> Partida não encontrada no banco de dados.",
            );
          }

          const infra = await DiscordMatchService.setupMatchInfrastructure(
            interaction.guild,
            match,
            "Rodada 1",
          );

          if (!infra) {
            return interaction.editReply(
              "<:ama_cuidado2qn:1545494059081142403> Esta partida é um BYE e não possui infraestrutura de Discord.",
            );
          }

          await interaction.editReply(
            `<a:ver_verifcado2qn:1535775624864473169> Infraestrutura criada com sucesso! Categoria, calls e canal de texto gerados para **${match.teamA.name} x ${match.teamB.name}**.`,
          );

          const adminLogChannel = await interaction.client.channels
            .fetch(DiscordMatchService.CHANNELS.ADMIN_LOGS)
            .catch(() => null);

          if (adminLogChannel) {
            const matchNum = match.matchNumber || 1;
            await adminLogChannel.send(
              `📢 **Confronto Iniciado:** Jogo ${matchNum} (${match.teamA.name} vs ${match.teamB.name}) liberado por <@${interaction.user.id}>.`,
            );
          }
        } catch (err) {
          console.error("[ERRO MATCH START]", err);
          await interaction.editReply(
            "<:verm_x2qn:1545444524241719376> Erro ao criar a infraestrutura do confronto no Discord. Verifique os logs do console.",
          );
        }
        return;
      }

      // 2D. CAPTURA DO BOTÃO DE DECLARAÇÃO DE VITÓRIA (4X4 - COM SUPORTE A MD3)
      if (interaction.customId.startsWith("match_win_")) {
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator,
          )
        ) {
          return interaction.reply({
            content: `${config.emoji.error || "<:verm_x2qn:1545444524241719376>"} Apenas administradores podem declarar o vencedor da partida.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const parts = interaction.customId.split("_");
        const matchId = parts[2];
        const winnerTeamId = parts[3];

        try {
          const result = await TournamentService.recordMatchWinner(
            matchId,
            winnerTeamId,
          );

          const updatedMatch = result.updatedMatch;
          const teamA = updatedMatch.teamA;
          const teamB = updatedMatch.teamB;

          // Busca o nome do round para saber se é BO3 (Grande Final)
          let roundName = "Fase Eliminatória";
          let isBo3 = false;
          if (updatedMatch.roundId) {
            const rData = await prisma.round.findUnique({
              where: { id: updatedMatch.roundId },
            });
            if (rData) {
              roundName = rData.name;
              isBo3 = rData.matchType === "BO3";
            }
          }

          // Se for MD3 e o jogo ainda não acabou (nenhuma equipe chegou a 2 vitórias)
          if (isBo3 && updatedMatch.status !== "FINISHED") {
            await interaction.editReply(
              `<a:ver_verifcado2qn:1535775624864473169> Ponto computado com sucesso!\n` +
                `📊 **Placar Atual da Grande Final (MD3):**\n` +
                `• **${teamA.name}**: ${updatedMatch.scoreTeamA} vitória(s)\n` +
                `• **${teamB.name}**: ${updatedMatch.scoreTeamB} vitória(s)\n\n` +
                `*A série continua até uma equipe alcançar 2 vitórias.*`,
            );
            return;
          }

          // Se o jogo foi concluído (BO1 ou MD3 finalizada com 2 vitórias)
          const winningTeam = updatedMatch.winnerTeam;
          const winningTeamName = winningTeam
            ? winningTeam.name
            : "Equipe Vencedora";
          let losingTeamName = "Equipe Derrotada";
          if (teamA && teamB && winningTeam) {
            losingTeamName =
              teamA.id === winningTeam.id ? teamB.name : teamA.name;
          }

          // Desativa os botões da mensagem do canal do confronto
          try {
            const disabledComponents = interaction.message.components.map(
              (row) => {
                const newRow = new ActionRowBuilder();
                row.components.forEach((btn) => {
                  const isWinner = btn.customId.includes(winningTeam.id);
                  const newBtn = ButtonBuilder.from(btn)
                    .setDisabled(true)
                    .setStyle(
                      isWinner ? ButtonStyle.Success : ButtonStyle.Secondary,
                    );
                  newRow.addComponents(newBtn);
                });
                return newRow;
              },
            );

            await interaction.message.edit({ components: disabledComponents });
          } catch (e) {
            // Caso a mensagem já tenha sido apagada
          }

          await interaction.editReply(
            `<a:ver_verifcado2qn:1535775624864473169> Série finalizada! Vitória definitiva registrada para **${winningTeamName}**.`,
          );

          // Envia Embed oficial nos resultados públicos
          const resultadosChannel = await interaction.client.channels
            .fetch(DiscordMatchService.CHANNELS.RESULTADOS)
            .catch(() => null);

          if (resultadosChannel) {
            const matchNum = updatedMatch.matchNumber || 1;
            const resultEmbed = new EmbedBuilder()
              .setTitle(
                `<a:am_trofelzinho:1556881756521766934> RESULTADO DO CONFRONTO — JOGO ${matchNum}`,
              )
              .setColor(0x9b59b6)
              .setDescription(
                `Fase: **${roundName}**\n\n` +
                  `<:ama_coroa2qn:1535775618615087154> **Equipe Vencedora:** ${winningTeamName} (${updatedMatch.scoreTeamA}x${updatedMatch.scoreTeamB})\n` +
                  `<:verm_x2qn:1545444524241719376> **Equipe Derrotada:** ${losingTeamName}\n\n` +
                  `*A equipe vencedora avançou na competição!*`,
              )
              .setTimestamp();

            await resultadosChannel.send({ embeds: [resultEmbed] });
          }

          // Se tivermos um CAMPEÃO DO TORNEIO
          if (result.champion) {
            const champ = result.champion;
            const champEmbed = new EmbedBuilder()
              .setTitle(
                `<:ama_coroa2qn:1535775618615087154> TEMOS OS CAMPEÕES DO CAMPEONATO 4X4! <:ama_coroa2qn:1535775618615087154>`,
              )
              .setDescription(
                `A equipe **${champ.name}** dominou o campeonato inteiro e levou o caneco!\n\n` +
                  `<:ama_trofeu2qn:1545459134089138256> **Line Campeã:**\n` +
                  champ.players
                    .map((p) => `• <@${p.discordId}> (${p.gameNick})`)
                    .join("\n"),
              )
              .setColor(0xffd700)
              .setTimestamp();

            if (resultadosChannel) {
              await resultadosChannel.send({ embeds: [champEmbed] });
            }
          }

          // Se a rodada acabou e gerou o próximo round
          if (result.nextRoundInfo) {
            if (resultadosChannel) {
              await resultadosChannel.send(
                `🔄 **Todas as partidas da rodada foram concluídas!** A **${result.nextRoundInfo.round.name}** foi gerada automaticamente.`,
              );
            }
          }

          // Limpeza da categoria e canais do Discord após 10 segundos
          const channel = interaction.channel;
          if (channel && channel.parent) {
            const category = channel.parent;
            await interaction.followUp({
              content: `🧹 Este canal e a categoria de voz serão deletados em 10 segundos...`,
              flags: MessageFlags.Ephemeral,
            });

            setTimeout(async () => {
              try {
                for (const [, childChannel] of category.children.cache) {
                  await childChannel.delete().catch(() => {});
                }
                await category.delete().catch(() => {});
              } catch (delErr) {
                console.error("[ERRO CLEANUP CATEGORY]", delErr);
              }
            }, 10000);
          }
        } catch (err) {
          console.error("[ERRO MATCH WIN]", err);
          await interaction.editReply(
            `<:verm_x2qn:1545444524241719376> Erro ao registrar o vencedor: ${err.message}`,
          );
        }
        return;
      }

      // 2A. CAPTURA DO BOTÃO DE INSCRIÇÃO (Legado)
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
            content: `${config.emoji.warning || "<:ama_cuidado2qn:1545494059081142403>"} Você já está inscrito neste campeonato!`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      // 2B. CAPTURA DO BOTÃO DE VITÓRIA NO CHAVEAMENTO (Legado)
      if (interaction.customId.startsWith("ff_win_")) {
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator,
          )
        ) {
          return interaction.reply({
            content: `${config.emoji.error || "<:verm_x2qn:1545444524241719376>"} Apenas administradores podem definir o vencedor da partida.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const [, , matchId, winnerTeamId] = interaction.customId.split("_");

        await prisma.ffMatch.update({
          where: { id: matchId },
          data: { status: "finished", winnerId: winnerTeamId },
        });

        const winningTeam = await prisma.ffTeam.findUnique({
          where: { id: winnerTeamId },
        });

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

        await interaction.update({ components: updatedComponents });

        await interaction.followUp({
          content: `${config.emoji.success || "<a:ver_verifcado2qn:1535775624864473169>"} **${winningTeam.teamName}** foi declarada vencedora desta chave!`,
        });

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
              .setTitle(
                `<:ama_coroa2qn:1535775618615087154> TEMOS UM CAMPEÃO! <:ama_coroa2qn:1535775618615087154>`,
              )
              .setDescription(
                `A equipe **${champion.teamName}** formou a dupla perfeita!\n<a:am_trofelzinho:1556881756521766934> <@${champion.player1Id}> & <@${champion.player2Id}> amassaram todos e levaram o torneio!`,
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
                  `<:emojiespada:1555686156434411680> FASE ${nextRound}: ${teamA.teamName} vs ${teamB.teamName}`,
                )
                .setDescription(
                  `**${teamA.teamName}**\n<@${teamA.player1Id}> & <@${teamA.player2Id}>\n\n**VS**\n\n**${teamB.teamName}**\n<@${teamB.player1Id}> & <@${teamB.player2Id}>`,
                )
                .setColor(config.colorBase || 0x962dc0);

              const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId(`ff_win_${newMatch.id}_${teamA.id}`)
                  .setLabel(`Win ${teamA.teamName}`)
                  .setStyle(ButtonStyle.Secondary)
                  .setEmoji(
                    config.emoji.success ||
                      "<a:ver_verifcado2qn:1535775624864473169>",
                  ),
                new ButtonBuilder()
                  .setCustomId(`ff_win_${newMatch.id}_${teamB.id}`)
                  .setLabel(`Win ${teamB.teamName}`)
                  .setStyle(ButtonStyle.Secondary)
                  .setEmoji(
                    config.emoji.success ||
                      "<a:ver_verifcado2qn:1535775624864473169>",
                  ),
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
              const soloTeam = teams[i];
              await prisma.ffMatch.create({
                data: {
                  round: nextRound,
                  teamAId: soloTeam.id,
                  teamBId: null,
                  status: "finished",
                  winnerId: soloTeam.id,
                },
              });

              await interaction.channel.send(
                `*A **${soloTeam.teamName}** avançou por W.O nesta fase (Chave ímpar) e já está garantida na próxima!*`,
              );
            }
          }
        }
        return;
      }
    }

    // 3. ROTEAMENTO DOS SISTEMAS PRINCIPAIS (Botões, Menus e Modais ativos)
    if (await handleReportInteractions(interaction)) return;
    if (await handleTournamentInteractions(interaction)) return;
    if (await handlePaymentInteractions(interaction)) return;
    if (await handleGameRoles(interaction)) return;
    if (await handleNotifyRoles(interaction)) return;
    if (await handleStopGame(interaction)) return;
    if (await handleVip(interaction)) return;
    if (await handleGamblingInteract(interaction)) return;
    if (await handleTicket(interaction)) return;
    if (await handleTempVoicePanel(interaction)) return;
  } catch (error) {
    console.error("[FATAL ERROR] Erro crítico no interactionCreate:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content:
            "<:verm_x2qn:1545444524241719376> Ocorreu um erro interno ao processar sua ação.",
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }
  }
};
