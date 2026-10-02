// handlers/paymentHandler.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  MessageFlags,
  ChannelType,
} = require("discord.js");
const TournamentService = require("../services/tournamentService");

/**
 * Manipulador de interações focado em Pagamentos, PIX, Comprovantes e Validação da Equipe
 */
module.exports = async function handlePaymentInteractions(interaction) {
  try {
    // 1. Botão para Copiar Chave PIX
    if (interaction.isButton() && interaction.customId === "btn_copiar_pix") {
      await interaction.reply({
        content: `**Chave PIX:**\n\`pix@2qn.com.br\`\n\n*(Pelo celular, pressione e segure o texto acima para copiar a chave!)*`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    // 2. Criar Tópico Privado (Ticket) para Envio de Comprovante
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("btn_enviar_comprovante_")
    ) {
      const teamId = interaction.customId.replace(
        "btn_enviar_comprovante_",
        "",
      );
      const channel = interaction.channel;

      const thread = await channel.threads.create({
        name: `pix-${teamId}-${interaction.user.username}`.substring(0, 100),
        type: ChannelType.PrivateThread,
        reason: `Comprovante de pagamento da equipe`,
        invitable: false,
      });

      await thread.members.add(interaction.user.id);

      await thread.send(
        `<@${interaction.user.id}>, envie a **FOTO DO SEU COMPROVANTE PIX** aqui.\n\n` +
          `Nossa equipe irá analisar e validar a vaga. Pode colar a imagem abaixo.`,
      );

      await interaction.reply({
        content: `<:serv:1545501461427785798> Tópico privado criado com sucesso: <#${thread.id}>`,
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    // 3. Aprovação ou Rejeição de Comprovante pela Equipe
    if (
      interaction.isButton() &&
      (interaction.customId.startsWith("staff_approve_") ||
        interaction.customId.startsWith("staff_reject_") ||
        interaction.customId.startsWith("equipe_approve_") ||
        interaction.customId.startsWith("equipe_reject_"))
    ) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const isApprove =
        interaction.customId.startsWith("staff_approve_") ||
        interaction.customId.startsWith("equipe_approve_");

      const prefix = interaction.customId.startsWith("staff_approve_")
        ? "staff_approve_"
        : interaction.customId.startsWith("staff_reject_")
          ? "staff_reject_"
          : interaction.customId.startsWith("equipe_approve_")
            ? "equipe_approve_"
            : "equipe_reject_";

      const teamId = interaction.customId.replace(prefix, "");

      const guild = interaction.guild;
      let ticketThread = null;
      try {
        const fetchedThreads = await guild.channels.fetchActiveThreads();
        ticketThread = fetchedThreads.threads.find(
          (t) => t.name && t.name.includes(teamId),
        );
        if (!ticketThread) {
          ticketThread = guild.channels.cache.find(
            (c) => c.isThread() && c.name && c.name.includes(teamId),
          );
        }
      } catch (e) {
        console.error("[FETCH THREADS ERROR]:", e);
      }

      if (isApprove) {
        let updatedTeam;
        try {
          updatedTeam = await TournamentService.updateTeamStatus(
            teamId,
            "CONFIRMED",
          );
          if (!updatedTeam) {
            await interaction.editReply({
              content: `<:serv:1545444524241719376> **Erro:** Esta equipe não foi encontrada no banco de dados.`,
            });
            return true;
          }
        } catch (dbErr) {
          console.error("[UPDATE TEAM ERROR]:", dbErr);
          await interaction.editReply({
            content: `<:serv:1545444524241719376> **Erro ao atualizar equipe:** ${dbErr.message}`,
          });
          return true;
        }

        try {
          const confirmedChannelId = "1551951372734169169";
          const confirmedChannel =
            await guild.channels.fetch(confirmedChannelId);
          if (confirmedChannel) {
            const playersFormatted = updatedTeam.players
              .map(
                (p) =>
                  `• <@${p.discordId}> | \`${p.gameNick}\` *(${p.device || "MOBILE"})*`,
              )
              .join("\n");

            const embedConfirmed = new EmbedBuilder()
              .setTitle(
                "<:serv:1545459134089138256> NOVA EQUIPE CONFIRMADA - 4X4",
              )
              .setColor(0x2ecc71)
              .setDescription(
                `<:serv:1545459134089138256> **Equipe:** **${updatedTeam.name}**\n` +
                  `<:coroa:1535775618615087154> **Capitão:** <@${updatedTeam.captainId}>\n\n` +
                  `<:an_membro:1553155856168652800> **Line-up Oficial:**\n${playersFormatted}\n\n` +
                  `<a:verif:1535775601363779604> **Status:** Inscrição Validada & Vaga Garantida`,
              )
              .setTimestamp();

            await confirmedChannel.send({ embeds: [embedConfirmed] });
          }
        } catch (err) {
          console.error("[ERROR SENDING CONFIRMED TEAM]:", err);
        }

        const tournament = updatedTeam.tournament;
        if (
          tournament &&
          tournament.panelChannelId &&
          tournament.panelMessageId
        ) {
          try {
            const panelChannel = await guild.channels.fetch(
              tournament.panelChannelId,
            );
            const panelMsg = await panelChannel.messages.fetch(
              tournament.panelMessageId,
            );
            const freshTournament =
              await TournamentService.getActiveTournament();
            if (freshTournament) {
              const activeTeams = freshTournament.teams.filter(
                (t) => !["CANCELLED"].includes(t.status),
              ).length;
              const vagasRestantes = freshTournament.maxTeams - activeTeams;
              const oldEmbed = panelMsg.embeds[0];
              const newEmbed = EmbedBuilder.from(oldEmbed).setDescription(
                `Chegou a hora! Registre seu squad abaixo.\n\n` +
                  `<a:2qn:1553155625738051604> **Status:** Inscrições Abertas\n` +
                  `<:an_membro:1553155856168652800> **Vagas Restantes:** ${Math.max(0, vagasRestantes)}/${freshTournament.maxTeams}\n` +
                  `<:cifrao2qn:1553154980108828742> **Taxa:** R$ ${freshTournament.registrationFee.toFixed(2)}\n\n` +
                  `O capitão deve clicar no botão abaixo para iniciar o registro da equipe.`,
              );
              await panelMsg.edit({ embeds: [newEmbed] });
            }
          } catch (e) {
            console.error("[PAINEL UPDATE ERROR ON APPROVE]:", e);
          }
        }

        if (ticketThread) {
          await ticketThread
            .send(
              `<a:verif:1535775598822301781> **Pagamento Aprovado!** Vaga confirmada no campeonato e divulgada em <#1551951372734169169>. Este tópico será arquivado em breve.`,
            )
            .catch(() => {});
          setTimeout(() => ticketThread.delete().catch(() => {}), 5000);
        }

        const disabledRow = new ActionRowBuilder().addComponents(
          ButtonBuilder.from(interaction.message.components[0].components[0])
            .setDisabled(true)
            .setLabel("APROVADO"),
          ButtonBuilder.from(
            interaction.message.components[0].components[1],
          ).setDisabled(true),
        );

        await interaction.message.edit({ components: [disabledRow] });
        await interaction.editReply({
          content: `<a:verif:1535775598822301781> Inscrição aprovada com sucesso! Vaga confirmada e divulgada.`,
        });
        return true;
      } else {
        if (ticketThread) {
          await ticketThread
            .send(
              `<:serv:1545444524241719376> **Comprovante Recusado.** Por favor, envie um comprovante válido neste chat.`,
            )
            .catch(() => {});
        }

        const disabledRow = new ActionRowBuilder().addComponents(
          ButtonBuilder.from(
            interaction.message.components[0].components[0],
          ).setDisabled(true),
          ButtonBuilder.from(interaction.message.components[0].components[1])
            .setDisabled(true)
            .setLabel("RECUSADO"),
        );

        await interaction.message.edit({ components: [disabledRow] });
        await interaction.editReply({
          content: `<:serv:1545444524241719376> Comprovante recusado.`,
        });
        return true;
      }
    }

    return false;
  } catch (err) {
    console.error("[ERRO PAYMENT INTERACTION]", err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: `<:serv:1545444524241719376> Erro no processamento de pagamento: ${err.message}`,
      });
    }
    return true;
  }
};
