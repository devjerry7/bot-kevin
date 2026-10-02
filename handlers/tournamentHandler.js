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
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} = require("discord.js");
const TournamentService = require("../services/tournamentService");

// Armazenamento temporário em memória para o fluxo de seleção de emuladores antes de salvar no banco
const pendingRegistrations = new Map();

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
        .setLabel(`Nick de ${member2.displayName}`.substring(0, 45))
        .setPlaceholder(
          `Ex: ${member2.displayName.replace(/[^a-zA-Z0-9]/g, "")}`,
        )
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputNick3 = new TextInputBuilder()
        .setCustomId("input_nick_p3")
        .setLabel(`Nick de ${member3.displayName}`.substring(0, 45))
        .setPlaceholder(
          `Ex: ${member3.displayName.replace(/[^a-zA-Z0-9]/g, "")}`,
        )
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputNick4 = new TextInputBuilder()
        .setCustomId("input_nick_p4")
        .setLabel(`Nick de ${member4.displayName}`.substring(0, 45))
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
    // 3. SUBMISSÃO DO MODAL DE NICKS -> PASSO DE SELEÇÃO DE EMULADOR
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

      const tournament = await TournamentService.getActiveTournament();
      if (!tournament) {
        return await interaction.editReply({
          content: `<:serv:1545444524241719376> O campeonato foi encerrado ou pausado durante o preenchimento.`,
        });
      }

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

      pendingRegistrations.set(captainId, {
        tournamentId: tournament.id,
        teamName,
        captainId,
        playersData,
      });

      const emulatorSelect = new StringSelectMenuBuilder()
        .setCustomId(`camp_select_emulator_${captainId}`)
        .setPlaceholder("Selecione quem joga de EMULADOR (máx 2)")
        .setMinValues(0)
        .setMaxValues(2)
        .addOptions([
          new StringSelectMenuOptionBuilder()
            .setLabel(`Capitão: ${leaderNick}`.substring(0, 100))
            .setDescription("Usar Emulador")
            .setValue(captainId),
          new StringSelectMenuOptionBuilder()
            .setLabel(`Jogador 2: ${p2Nick}`.substring(0, 100))
            .setDescription("Usar Emulador")
            .setValue(p2Id),
          new StringSelectMenuOptionBuilder()
            .setLabel(`Jogador 3: ${p3Nick}`.substring(0, 100))
            .setDescription("Usar Emulador")
            .setValue(p3Id),
          new StringSelectMenuOptionBuilder()
            .setLabel(`Jogador 4: ${p4Nick}`.substring(0, 100))
            .setDescription("Usar Emulador")
            .setValue(p4Id),
        ]);

      const rowSelect = new ActionRowBuilder().addComponents(emulatorSelect);
      const rowButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`camp_confirm_reg_${captainId}`)
          .setLabel("CONFIRMAR INSCRIÇÃO")
          .setStyle(ButtonStyle.Success)
          .setEmoji("<a:verif:1535775598822301781>"),
      );

      return await interaction.editReply({
        content: `<:serv:1553154980108828742> **Seleção de Dispositivos (Emulador):**\nO campeonato permite no máximo **2 emuladores** por equipe. Caso algum dos jogadores utilize emulador, selecione-os no menu abaixo e clique em confirmar. Se todos forem mobile, clique diretamente no botão verde abaixo.`,
        components: [rowSelect, rowButton],
      });
    }

    // ----------------------------------------------------
    // 4. SELEÇÃO DE QUEM USA EMULADOR (STRING SELECT MENU)
    // ----------------------------------------------------
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith("camp_select_emulator_")
    ) {
      const captainId = interaction.customId.replace(
        "camp_select_emulator_",
        "",
      );
      if (interaction.user.id !== captainId) {
        return await interaction.reply({
          content: `<:serv:1545444524241719376> Apenas o capitão que iniciou a inscrição pode configurar os dispositivos.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const pending = pendingRegistrations.get(captainId);
      if (!pending) {
        return await interaction.reply({
          content: `<:serv:1545444524241719376> Sessão de inscrição expirada ou não encontrada. Inicie novamente.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const emulatorIds = interaction.values;

      pending.playersData.forEach((p) => {
        if (emulatorIds.includes(p.discordId)) {
          p.device = "EMULATOR";
        } else {
          p.device = "MOBILE";
        }
      });

      pendingRegistrations.set(captainId, pending);

      return await interaction.update({
        content: `<:serv:1545501461427785798> Dispositivos atualizados! Emuladores selecionados: **${emulatorIds.length}/2**. Clique em **CONFIRMAR INSCRIÇÃO** abaixo para finalizar.`,
      });
    }

    // ----------------------------------------------------
    // 5. BOTÃO DE CONFIRMAÇÃO FINAL DA INSCRIÇÃO
    // ----------------------------------------------------
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("camp_confirm_reg_")
    ) {
      await interaction.deferUpdate();

      const captainId = interaction.customId.replace("camp_confirm_reg_", "");
      if (interaction.user.id !== captainId) {
        return await interaction.followUp({
          content: `<:serv:1545444524241719376> Apenas o capitão pode confirmar esta inscrição.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const pending = pendingRegistrations.get(captainId);
      if (!pending) {
        return await interaction.followUp({
          content: `<:serv:1545444524241719376> Sessão expirada. Inicie uma nova inscrição.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      pendingRegistrations.delete(captainId);

      const tournament = await TournamentService.getActiveTournament();
      if (!tournament) {
        return await interaction.editReply({
          content: `<:serv:1545444524241719376> O campeonato foi encerrado ou pausado.`,
          components: [],
        });
      }

      const emulatorCount = pending.playersData.filter(
        (p) => p.device === "EMULATOR",
      ).length;
      if (emulatorCount > 2) {
        return await interaction.editReply({
          content: `<:serv:1545444524241719376> **Erro:** O limite máximo é de 2 emuladores por equipe. Sua equipe selecionou ${emulatorCount}. Inicie novamente.`,
          components: [],
        });
      }

      const team = await TournamentService.registerTeam({
        tournamentId: pending.tournamentId,
        teamName: pending.teamName,
        captainId: pending.captainId,
        playersData: pending.playersData,
      });

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
          components: [],
        });
      }

      const playersFormattedList = team.players
        .map(
          (p) =>
            `• <@${p.discordId}> | **Nick:** \`${p.gameNick}\` *(${p.device})*`,
        )
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
            `**Chave PIX:** \`pix@2qn.com.br\``,
        )
        .setColor(0x9b59b6)
        .setFooter({ text: "Aguardando envio de comprovante" });

      const rowPayment = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("btn_copiar_pix")
          .setLabel("COPIAR PIX")
          .setEmoji("<:serv:1545488990168158350>")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`btn_enviar_comprovante_${team.id}`)
          .setLabel("ENVIAR COMPROVANTE")
          .setEmoji("<a:2qn:1553155625738051604>")
          .setStyle(ButtonStyle.Secondary),
      );

      return await interaction.editReply({
        content: null,
        embeds: [embedSucesso],
        components: [rowPayment],
      });
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
