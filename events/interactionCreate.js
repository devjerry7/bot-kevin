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

// 🏆 IMPORTANDO O HANDLER DO CAMPEONATO 4X4 (2QN)
const handleTournamentInteractions = require("../handlers/tournamentHandler");

// 💸 IMPORTANDO O HANDLER DE PAGAMENTO E PIX
const handlePaymentInteractions = require("../handlers/paymentHandler");

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

    // ==========================================
    // 🏆 SISTEMA DE TORNEIO FREE FIRE (LEGADO & 4X4)
    // ==========================================
    if (interaction.isButton()) {
      // 2C. CAPTURA DO BOTÃO DE INICIAR CONFRONTO (4X4 - PAINEL DA ADMINISTRAÇÃO)
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
            await adminLogChannel.send(
              `📢 **Confronto Iniciado:** Jogo #${match.id.slice(-4)} (${match.teamA.name} vs ${match.teamB.name}) liberado por <@${interaction.user.id}>.`,
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

      // 2D. CAPTURA DO BOTÃO DE DECLARAÇÃO DE VITÓRIA (4X4 - NOVO SISTEMA)
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

        // Formato do ID: match_win_MATCHID_WINNERTEAMID
        const parts = interaction.customId.split("_");
        const matchId = parts[2];
        const winnerTeamId = parts[3];

        try {
          // Processa a vitória no TournamentService e avança a chave se necessário
          const result = await TournamentService.recordMatchWinner(
            matchId,
            winnerTeamId,
          );

          const winningTeamName = result.updatedMatch.winner
            ? result.updatedMatch.winner.name
            : "Equipe Vencedora";

          // Desativa os botões da mensagem do canal do confronto
          try {
            const disabledComponents = interaction.message.components.map(
              (row) => {
                const newRow = new ActionRowBuilder();
                row.components.forEach((btn) => {
                  const isWinner = btn.customId.includes(winnerTeamId);
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
            // Caso a mensagem já tenha sido apagada ou haja erro de edição, segue o fluxo
          }

          await interaction.editReply(
            `<a:ver_verifcado2qn:1535775624864473169> Vitória registrada para **${winningTeamName}** com sucesso!`,
          );

          // Envia log nos resultados públicos
          const resultadosChannel = await interaction.client.channels
            .fetch(DiscordMatchService.CHANNELS.RESULTADOS)
            .catch(() => null);

          if (resultadosChannel) {
            await resultadosChannel.send(
              `🏆 **RESULTADO DO CONFRONTO (Jogo #${matchId.slice(-4)})**\n` +
                `A equipe **${winningTeamName}** venceu a partida e avançou na competição!`,
            );
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

          // Se a rodada acabou e gerou o próximo round, avisa no canal de logs/resultados
          if (result.nextRoundInfo) {
            if (resultadosChannel) {
              await resultadosChannel.send(
                `🔄 **Todas as partidas da rodada foram concluídas!** A **${result.nextRoundInfo.round.name}** foi gerada automaticamente.`,
              );
            }
          }

          // Limpeza opcional da categoria e canais do Discord após 10 segundos
          const channel = interaction.channel;
          if (channel && channel.parent) {
            const category = channel.parent;
            await interaction.followUp({
              content: `🧹 Este canal e a categoria de voz serão deletados em 10 segundos...`,
              flags: MessageFlags.Ephemeral,
            });

            setTimeout(async () => {
              try {
                // Deleta todos os canais filhos da categoria (texto e vozes)
                for (const [, childChannel] of category.children.cache) {
                  await childChannel.delete().catch(() => {});
                }
                // Deleta a categoria
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
            content: `${config.emoji.warning || "<:ama_cuidado2qn:1545494059081142403>️️"} Você já está inscrito neste campeonato!`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      // 2B. CAPTURA DO BOTÃO DE VITÓRIA NO CHAVEAMENTO (Legado)
      if (interaction.customId.startsWith("ff_win_")) {
        // Apenas admins podem definir o vencedor
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
          content: `${config.emoji.success || "<a:ver_verifcado2qn:1535775624864473169>"} **${winningTeam.teamName}** foi declarada vencedora desta chave!`,
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
              .setTitle(
                `<:ama_coroa2qn:1535775618615087154> TEMOS UM CAMPEÃO! <:ama_coroa2qn:1535775618615087154>`,
              )
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
              // CORREÇÃO W.O: Cria uma partida fantasma concluída para a equipe que sobrou ir direto para a próxima fase
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
    if (await handleTournamentInteractions(interaction)) return;
    if (await handlePaymentInteractions(interaction)) return; // <--- AGORA PLUGADO CORRETAMENTE!
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
          content:
            "<:verm_x2qn:1545444524241719376> Ocorreu um erro interno ao processar sua ação.",
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }
  }
};
