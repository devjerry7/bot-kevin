// handlers/tournamentHandler.js
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  UserSelectMenuBuilder,
  MessageFlags,
  ChannelType,
} = require("discord.js");
const TournamentService = require("../services/tournamentService");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = async function handleTournamentInteractions(interaction) {
  try {
    // ----------------------------------------------------
    // 1. CLIQUE NO BOTÃO "INSCREVER EQUIPE" -> ABRE SELETOR DE MEMBROS
    // ----------------------------------------------------
    if (
      interaction.isButton() &&
      (interaction.customId === "btn_inscrever_equipe" ||
        interaction.customId === "camp_register_btn")
    ) {
      const activeCamp = await TournamentService.getActiveTournament();

      if (
        !activeCamp ||
        !["OPEN", "REGISTRATION_OPEN"].includes(activeCamp.status)
      ) {
        return await interaction.reply({
          content: `<:serv:1545444524241719376> As inscrições para o campeonato estão encerradas ou pausadas no momento.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const userSelect = new UserSelectMenuBuilder()
        .setCustomId("camp_select_members")
        .setPlaceholder("Selecione os 3 integrantes da sua equipe")
        .setMinValues(3)
        .setMaxValues(3);

      const row = new ActionRowBuilder().addComponents(userSelect);

      return await interaction.reply({
        content: `<a:2qn:1553155625738051604> **Selecione os 3 membros que jogarão com você no torneio:**`,
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ----------------------------------------------------
    // 2. SELEÇÃO DOS 3 MEMBROS -> ABRE O MODAL DOS NICKS
    // ----------------------------------------------------
    if (
      interaction.isUserSelectMenu() &&
      interaction.customId === "camp_select_members"
    ) {
      const selectedUsers = interaction.values;

      if (selectedUsers.includes(interaction.user.id)) {
        return await interaction.reply({
          content: `<:serv:1545444524241719376> Você não pode se selecionar como membro, pois você já é o capitão da equipe! Selecione outros 3 membros.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      if (selectedUsers.length !== 3) {
        return await interaction.reply({
          content: `<:serv:1545444524241719376> Você deve selecionar exatamente 3 integrantes para a sua equipe.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const member2 = await interaction.guild.members
        .fetch(selectedUsers[0])
        .catch(() => ({ displayName: "Jogador 2" }));
      const member3 = await interaction.guild.members
        .fetch(selectedUsers[1])
        .catch(() => ({ displayName: "Jogador 3" }));
      const member4 = await interaction.guild.members
        .fetch(selectedUsers[2])
        .catch(() => ({ displayName: "Jogador 4" }));

      const modal = new ModalBuilder()
        .setCustomId(`camp_modal_nicks_${selectedUsers.join("_")}`)
        .setTitle("Inscrição de Equipe - Camp 4x4");

      const inputTeamName = new TextInputBuilder()
        .setCustomId("input_team_name")
        .setLabel("Nome do time")
        .setPlaceholder("")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputLeaderNick = new TextInputBuilder()
        .setCustomId("input_nick_leader")
        .setLabel("Seu Nick no Jogo (Capitão)")
        .setPlaceholder("")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputNick2 = new TextInputBuilder()
        .setCustomId("input_nick_p2")
        .setLabel(`Nick de ${member2.displayName}`)
        .setPlaceholder(
          `Ex: ${member2.displayName.replace(/[^a-zA-Z0-9]/g, "")}`,
        )
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputNick3 = new TextInputBuilder()
        .setCustomId("input_nick_p3")
        .setLabel(`Nick de ${member3.displayName}`)
        .setPlaceholder(
          `Ex: ${member3.displayName.replace(/[^a-zA-Z0-9]/g, "")}`,
        )
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputNick4 = new TextInputBuilder()
        .setCustomId("input_nick_p4")
        .setLabel(`Nick de ${member4.displayName}`)
        .setPlaceholder(
          `Ex: ${member4.displayName.replace(/[^a-zA-Z0-9]/g, "")}`,
        )
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(inputTeamName),
        new ActionRowBuilder().addComponents(inputLeaderNick),
        new ActionRowBuilder().addComponents(inputNick2),
        new ActionRowBuilder().addComponents(inputNick3),
        new ActionRowBuilder().addComponents(inputNick4),
      );

      return await interaction.showModal(modal);
    }

    // ----------------------------------------------------
    // 3. SUBMISSÃO DO MODAL DE NICKS -> REGISTRA EQUIPE
    // ----------------------------------------------------
    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith("camp_modal_nicks_")
    ) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const [, , , p2Id, p3Id, p4Id] = interaction.customId.split("_");
      const captainId = interaction.user.id;

      const teamName = interaction.fields
        .getTextInputValue("input_team_name")
        .trim();
      const leaderNick = interaction.fields
        .getTextInputValue("input_nick_leader")
        .trim();
      const p2Nick = interaction.fields
        .getTextInputValue("input_nick_p2")
        .trim();
      const p3Nick = interaction.fields
        .getTextInputValue("input_nick_p3")
        .trim();
      const p4Nick = interaction.fields
        .getTextInputValue("input_nick_p4")
        .trim();

      const playersData = [
        {
          discordId: captainId,
          gameNick: leaderNick,
          isLeader: true,
          device: "MOBILE",
        },
        {
          discordId: p2Id,
          gameNick: p2Nick,
          isLeader: false,
          device: "MOBILE",
        },
        {
          discordId: p3Id,
          gameNick: p3Nick,
          isLeader: false,
          device: "MOBILE",
        },
        {
          discordId: p4Id,
          gameNick: p4Nick,
          isLeader: false,
          device: "MOBILE",
        },
      ];

      const tournament = await TournamentService.getActiveTournament();

      if (!tournament) {
        return await interaction.editReply({
          content: `<:serv:1545444524241719376> O campeonato foi encerrado ou pausado durante o preenchimento.`,
        });
      }

      const team = await TournamentService.registerTeam({
        tournamentId: tournament.id,
        teamName,
        captainId,
        playersData,
      });

      // Atualização de Vagas no Painel
      if (tournament.panelChannelId && tournament.panelMessageId) {
        try {
          const channel = await interaction.client.channels.fetch(
            tournament.panelChannelId,
          );
          const msg = await channel.messages.fetch(tournament.panelMessageId);
          const updatedTournament =
            await TournamentService.getActiveTournament();

          if (updatedTournament) {
            const activeTeams = updatedTournament.teams.filter(
              (t) => !["CANCELLED"].includes(t.status),
            ).length;
            const vagasRestantes = updatedTournament.maxTeams - activeTeams;
            const oldEmbed = msg.embeds[0];
            const newEmbed = EmbedBuilder.from(oldEmbed).setDescription(
              `Chegou a hora! Registre seu time abaixo.\n\n` +
                `<a:2qn:1553155625738051604> **Status:** Inscrições Abertas\n` +
                `<:an_membro:1553155856168652800> **Vagas Restantes:** ${Math.max(0, vagasRestantes)}/${updatedTournament.maxTeams}\n` +
                `<:dinheiro2:1536498069380538499> **Taxa:** R$ ${updatedTournament.registrationFee.toFixed(2)}\n\n` +
                `O capitão deve clicar no botão abaixo para iniciar o registro da equipe.`,
            );
            await msg.edit({ embeds: [newEmbed] });
          }
        } catch (e) {
          console.error("[PAINEL UPDATE ERROR]:", e);
        }
      }

      if (team.status === "WAITLIST") {
        return await interaction.editReply({
          content: `<:serv:1545494059081142403> **Vagas Principais Esgotadas!**\nA equipe **${team.name}** foi registrada na **Lista de Espera** (Posição #${team.waitlistOrder}).`,
        });
      }

      const playersFormattedList = team.players
        .map((p) => `• <@${p.discordId}> | **Nick no Jogo:** \`${p.gameNick}\``)
        .join("\n");

      const embedSucesso = new EmbedBuilder()
        .setTitle(
          "<:serv:1545501461427785798> Inscrição Pré-Registrada com Sucesso!",
        )
        .setDescription(
          `**Equipe:** ${team.name}\n` +
            `**Capitão:** <@${team.captainId}>\n\n` +
            `<:an_membro:1553155856168652800> **Jogadores Escalados:**\n${playersFormattedList}\n\n` +
            `<:serv:1553154980108828742> **Passo Final para Confirmar a Vaga:**\n` +
            `Realize o pagamento da taxa de **R$ ${(tournament.registrationFee || 0).toFixed(2)}** via PIX e envie o comprovante pelo botão abaixo.\n\n` +
            `\`pix@2qn.com.br\`\n` +
            `*(Clique no e-mail acima para copiar a chave)*`,
        )
        .setColor(0x9b59b6)
        .setFooter({ text: "Aguardando envio de comprovante" });

      const rowPayment = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`btn_enviar_comprovante_${team.id}`)
          .setLabel("ENVIAR COMPROVANTE")
          .setEmoji("<a:2qn:1553155625738051604>")
          .setStyle(ButtonStyle.Secondary),
      );

      return await interaction.editReply({
        embeds: [embedSucesso],
        components: [rowPayment],
      });
    }

    // ----------------------------------------------------
    // 4. CRIAR TÓPICO PRIVADO (TICKET) PARA O COMPROVANTE
    // ----------------------------------------------------
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

      return await interaction.reply({
        content: `<:serv:1545501461427785798> Tópico privado criado com sucesso: <#${thread.id}>`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // ----------------------------------------------------
    // 5. AÇÃO DA EQUIPE: APROVAR OU RECUSAR COMPROVANTE
    // ----------------------------------------------------
    if (
      interaction.isButton() &&
      (interaction.customId.startsWith("staff_approve_") ||
        interaction.customId.startsWith("staff_reject_"))
    ) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const isApprove = interaction.customId.startsWith("staff_approve_");
      const teamId = interaction.customId.replace(
        isApprove ? "staff_approve_" : "staff_reject_",
        "",
      );

      // LOG DE TESTE OBRIGATÓRIO PARA VERIFICAR O ID QUE ESTÁ CHEGANDO
      console.log("==========================================");
      console.log("[DEBUG APPROVE] customId clicado:", interaction.customId);
      console.log("[DEBUG APPROVE] teamId extraído:", teamId);
      console.log("==========================================");

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
        // 1. Atualiza status no banco para CONFIRMED com tratamento seguro para P2025
        let updatedTeam;
        try {
          updatedTeam = await prisma.team.update({
            where: { id: teamId },
            data: { status: "CONFIRMED" },
            include: { players: true, tournament: true },
          });
        } catch (dbErr) {
          console.error("[PRISMA ERROR CATCH]:", dbErr);
          if (dbErr.code === "P2025") {
            return await interaction.editReply({
              content: `<:serv:1545444524241719376> **Erro:** Esta equipe não foi encontrada no banco de dados (o campeonato pode ter sido resetado).`,
            });
          }
          throw dbErr;
        }

        // 2. Envia a embed oficial no canal de times confirmados (ID: 1551951372734169169)
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
                `🏆 **Equipe:** **${updatedTeam.name}**\n` +
                  `👑 **Capitão:** <@${updatedTeam.captainId}>\n\n` +
                  `<:an_membro:1553155856168652800> **Line-up Oficial:**\n${playersFormatted}\n\n` +
                  `<a:verif:1535775601363779604> **Status:** Inscrição Validada & Vaga Garantida`,
              )
              .setTimestamp();

            await confirmedChannel.send({ embeds: [embedConfirmed] });
          }
        } catch (err) {
          console.error("[ERROR SENDING CONFIRMED TEAM]:", err);
        }

        // 3. Atualiza o painel principal de inscrições
        const tournament = updatedTeam.tournament;
        if (tournament.panelChannelId && tournament.panelMessageId) {
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

        // 4. Avisa e fecha o tópico privado
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
        return await interaction.editReply({
          content: `<a:verif:1535775598822301781> Equipe aprovada com sucesso! Vaga confirmada e divulgada.`,
        });
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
        return await interaction.editReply({
          content: `<:serv:1545444524241719376> Comprovante recusado.`,
        });
      }
    }

    return false;
  } catch (err) {
    console.error("[ERRO TOURNAMENT INTERACTION]", err);
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply({
        content: `<:serv:1545444524241719376> Erro: ${err.message}`,
      });
    }
  }
};
