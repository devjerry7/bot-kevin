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
  ChannelType,
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
      console.log(
        "[TOURNAMENT LOG] Botão de inscrever equipe clicado por:",
        interaction.user.tag,
      );
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
      console.log("[TOURNAMENT LOG] Membros selecionados:", selectedUsers);

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

      const modal = new ModalBuilder()
        .setCustomId(`camp_modal_nicks_${selectedUsers.join("_")}`)
        .setTitle("Inscrição de Equipe - Camp 4x4");

      const inputTeamName = new TextInputBuilder()
        .setCustomId("input_team_name")
        .setLabel("Nome do time")
        .setPlaceholder("Digite o nome da equipe")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputLeaderNick = new TextInputBuilder()
        .setCustomId("input_nick_leader")
        .setLabel("Seu Nick no Jogo (Capitão)")
        .setPlaceholder("Seu nick exato")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputNick2 = new TextInputBuilder()
        .setCustomId("input_nick_p2")
        .setLabel("Nick do Jogador 2")
        .setPlaceholder("Nick exato do 2º jogador")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputNick3 = new TextInputBuilder()
        .setCustomId("input_nick_p3")
        .setLabel("Nick do Jogador 3")
        .setPlaceholder("Nick exato do 3º jogador")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputNick4 = new TextInputBuilder()
        .setCustomId("input_nick_p4")
        .setLabel("Nick do Jogador 4")
        .setPlaceholder("Nick exato do 4º jogador")
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
    // 3. SUBMISSÃO DO MODAL DE NICKS -> SELEÇÃO DE EMULADOR
    // ----------------------------------------------------
    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith("camp_modal_nicks_")
    ) {
      console.log("[TOURNAMENT LOG] Modal de nicks submetido.");
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
        content: `<:serv:1553154980108828742> **Seleção de Dispositivos (Emulador):**\nO campeonato permite no máximo **2 emuladores** por equipe. Caso algum dos jogadores utilize emulador, selecione-os no menu abaixo e clique em confirmar.`,
        components: [rowSelect, rowButton],
      });
    }

    // ----------------------------------------------------
    // 4. SELEÇÃO DE QUEM USA EMULADOR
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
          content: `<:serv:1545444524241719376> Apenas o capitão pode configurar os dispositivos.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const pending = pendingRegistrations.get(captainId);
      if (!pending) {
        return await interaction.reply({
          content: `<:serv:1545444524241719376> Sessão expirada. Inicie novamente.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const emulatorIds = interaction.values;
      pending.playersData.forEach((p) => {
        p.device = emulatorIds.includes(p.discordId) ? "EMULATOR" : "MOBILE";
      });

      pendingRegistrations.set(captainId, pending);

      return await interaction.update({
        content: `<:serv:1545501461427785798> Dispositivos atualizados! Emuladores: **${emulatorIds.length}/2**. Clique em **CONFIRMAR INSCRIÇÃO**.`,
      });
    }

    // ----------------------------------------------------
    // 5. BOTÃO DE CONFIRMAÇÃO FINAL DA INSCRIÇÃO
    // ----------------------------------------------------
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("camp_confirm_reg_")
    ) {
      console.log("[TOURNAMENT LOG] Confirmação final da inscrição acionada.");
      await interaction.deferUpdate();

      const captainId = interaction.customId.replace("camp_confirm_reg_", "");
      const pending = pendingRegistrations.get(captainId);
      if (!pending) {
        return await interaction.followUp({
          content: `<:serv:1545444524241719376> Sessão expirada.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      pendingRegistrations.delete(captainId);

      const tournament = await TournamentService.getActiveTournament();
      const team = await TournamentService.registerTeam({
        tournamentId: pending.tournamentId,
        teamName: pending.teamName,
        captainId: pending.captainId,
        playersData: pending.playersData,
      });

      console.log("[TOURNAMENT LOG] Equipe registrada com ID:", team.id);

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
            `<:an_membro:1553155856168652800> **Jogadores:**\n${playersFormattedList}\n\n` +
            `Realize o pagamento da taxa via PIX e envie o comprovante.`,
        )
        .setColor(0x9b59b6);

      const rowPayment = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("btn_copiar_pix")
          .setLabel("COPIAR PIX")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`btn_enviar_comprovante_${team.id}`)
          .setLabel("ENVIAR COMPROVANTE")
          .setStyle(ButtonStyle.Secondary),
      );

      return await interaction.editReply({
        content: null,
        embeds: [embedSucesso],
        components: [rowPayment],
      });
    }

    // ----------------------------------------------------
    // 6. BOTÃO DE COPIAR PIX
    // ----------------------------------------------------
    if (interaction.isButton() && interaction.customId === "btn_copiar_pix") {
      return await interaction.reply({
        content: `discord.gg2qn@gmail.com`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // ----------------------------------------------------
    // 7. BOTÃO DE ENVIAR COMPROVANTE -> CRIA TÓPICO PRIVADO (COM LOGS DETALHADOS)
    // ----------------------------------------------------
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("btn_enviar_comprovante_")
    ) {
      console.log("[LOG DEBUG] >>> Botão btn_enviar_comprovante clicado!");

      const teamId = interaction.customId.replace(
        "btn_enviar_comprovante_",
        "",
      );
      console.log("[LOG DEBUG] Team ID extraído:", teamId);

      const tournament = await TournamentService.getActiveTournament();
      const teamObj = tournament?.teams?.find((t) => t.id === teamId);
      const teamName = teamObj ? teamObj.name : "Equipe";
      console.log("[LOG DEBUG] Nome da equipe encontrado:", teamName);

      try {
        console.log(
          "[LOG DEBUG] Tentando criar tópico privado no canal:",
          interaction.channel?.id,
        );

        const thread = await interaction.channel.threads.create({
          name: `comprovante-${teamName}`.substring(0, 100),
          type: ChannelType.PrivateThread,
          reason: `Envio de comprovante da equipe ${teamName}`,
        });
        console.log(
          "[LOG DEBUG] Tópico criado com sucesso! ID da Thread:",
          thread.id,
        );

        await thread.members.add(interaction.user.id);
        console.log("[LOG DEBUG] Usuário adicionado à thread com sucesso.");

        await thread.send(
          `<@${interaction.user.id}>, envie o **print/imagem do comprovante** de pagamento aqui neste tópico privado. Assim que enviar, nossa equipe irá analisar.`,
        );

        // Resposta efêmera avisando o usuário
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: `<a:ver_verifcado2qn:1535775624864473169> **Tópico privado criado com sucesso!** Acesse aqui: ${thread}`,
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.followUp({
            content: `<a:ver_verifcado2qn:1535775624864473169> **Tópico privado criado com sucesso!** Acesse aqui: ${thread}`,
            flags: MessageFlags.Ephemeral,
          });
        }
        console.log("[LOG DEBUG] Resposta enviada ao usuário com sucesso.");
        return true;
      } catch (err) {
        console.error("[ERRO CRÍTICO NO TÓPICO]:", err);
        if (!interaction.replied && !interaction.deferred) {
          return await interaction.reply({
            content: `<:serv:1545444524241719376> Erro ao criar tópico privado: ${err.message}`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    }

    return false;
  } catch (err) {
    console.error("[ERRO GERAL TOURNAMENT INTERACTION]", err);
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply({
        content: `<:serv:1545444524241719376> Erro: ${err.message}`,
      });
    }
  }
};
