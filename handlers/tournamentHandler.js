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

      // Busca os nomes reais dos usuários selecionados no servidor (com fallback de segurança)
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
        .setLabel("Nome da Equipe")
        .setPlaceholder("Ex: Fluxo, Loud, OsCria...")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputLeaderNick = new TextInputBuilder()
        .setCustomId("input_nick_leader")
        .setLabel("Seu Nick no Jogo (Capitão)")
        .setPlaceholder("Ex: FLX_Nobru")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputNick2 = new TextInputBuilder()
        .setCustomId("input_nick_p2")
        .setLabel(`Nick de ${member2.displayName}`) // Nome dinâmico aqui
        .setPlaceholder(
          `Ex: FLX_${member2.displayName.replace(/[^a-zA-Z0-9]/g, "")}`,
        )
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputNick3 = new TextInputBuilder()
        .setCustomId("input_nick_p3")
        .setLabel(`Nick de ${member3.displayName}`)
        .setPlaceholder(
          `Ex: FLX_${member3.displayName.replace(/[^a-zA-Z0-9]/g, "")}`,
        )
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputNick4 = new TextInputBuilder()
        .setCustomId("input_nick_p4")
        .setLabel(`Nick de ${member4.displayName}`)
        .setPlaceholder(
          `Ex: FLX_${member4.displayName.replace(/[^a-zA-Z0-9]/g, "")}`,
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
          console.error(
            "[PAINEL UPDATE ERROR] Não foi possível atualizar o número de vagas:",
            e,
          );
        }
      }

      if (team.status === "WAITLIST") {
        return await interaction.editReply({
          content: `<:serv:1545494059081142403> **Vagas Principais Esgotadas!**\nA equipe **${team.name}** foi registrada na **Lista de Espera** (Posição #${team.waitlistOrder}). Se surgir uma vaga, vocês serão notificados!`,
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
            `<:serv:1545458280145354863> **Passo Final para Confirmar a Vaga:**\n` +
            `Realize o pagamento da taxa de **R$ ${(tournament.registrationFee || 0).toFixed(2)}** via PIX e envie o comprovante pelo botão abaixo.\n\n` +
            `\`pix@2qn.com.br\`\n` +
            `*(Clique no e-mail acima para copiar a chave)*`,
        )
        .setColor(0x00ffcc)
        .setFooter({ text: "Aguardando envio de comprovante" });

      const rowPayment = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`btn_enviar_comprovante_${team.id}`)
          .setLabel("ENVIAR COMPROVANTE")
          .setEmoji("<:serv:1545488990168158350>")
          .setStyle(ButtonStyle.Secondary),
      );

      return await interaction.editReply({
        embeds: [embedSucesso],
        components: [rowPayment],
      });
    }

    // ----------------------------------------------------
    // 4. CRIAR TICKET PIX PARA ENVIO DE COMPROVANTE
    // ----------------------------------------------------
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("btn_enviar_comprovante_")
    ) {
      const teamId = interaction.customId.replace(
        "btn_enviar_comprovante_",
        "",
      );
      const guild = interaction.guild;

      // Cria o canal privado (Ticket)
      const ticketChannel = await guild.channels.create({
        name: `pix-${interaction.user.username}`,
        type: ChannelType.GuildText,
        topic: `TEAM_ID:${teamId}`, // Esconde o ID da Equipe no tópico
        permissionOverwrites: [
          {
            id: guild.id,
            deny: ["ViewChannel"], // Esconde de todos do servidor
          },
          {
            id: interaction.user.id,
            allow: [
              "ViewChannel",
              "SendMessages",
              "AttachFiles",
              "ReadMessageHistory",
            ], // Libera pro Capitão
          },
        ],
      });

      await ticketChannel.send(
        `<@${interaction.user.id}>, envie a **FOTO DO SEU COMPROVANTE PIX** aqui neste chat.\n\n` +
          `Nossa equipe irá analisar a imagem e validar a vaga da sua equipe. **Pode colar/anexar a imagem do comprovante aqui.**`,
      );

      return await interaction.reply({
        content: `<:serv:1545501461427785798> Canal de envio criado com sucesso! Acesse: <#${ticketChannel.id}>`,
        flags: MessageFlags.Ephemeral,
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
