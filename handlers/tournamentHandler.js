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
} = require("discord.js");
const TournamentService = require("../services/tournamentService");
const config = require("../config");

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
      // Usa a busca que apenas LÊ o torneio ativo (sem tentar criar um novo)
      const activeCamp = await TournamentService.getActiveTournament();

      // Checagem flexível para permitir OPEN ou REGISTRATION_OPEN
      if (
        !activeCamp ||
        !["OPEN", "REGISTRATION_OPEN"].includes(activeCamp.status)
      ) {
        return await interaction.reply({
          content: `<:serv:1545444524241719376> As inscrições para o campeonato estão encerradas ou pausadas no momento.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Seletor nativo para selecionar exatamente 3 membros
      const userSelect = new UserSelectMenuBuilder()
        .setCustomId("camp_select_members")
        .setPlaceholder("Selecione os 3 integrantes da sua equipe")
        .setMinValues(3)
        .setMaxValues(3);

      const row = new ActionRowBuilder().addComponents(userSelect);

      return await interaction.reply({
        content: `<:serv:1537237908547965001> **Selecione os 3 membros que jogarão com você no torneio:**`,
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ----------------------------------------------------
    // 2. SELEÇÃO DOS 3 MEMBROS -> ABRE O MODAL DOS NICKS E EMULADORES
    // ----------------------------------------------------
    if (
      interaction.isUserSelectMenu() &&
      interaction.customId === "camp_select_members"
    ) {
      const selectedUsers = interaction.values; // Array com os 3 IDs selecionados

      // Passa os IDs dos 3 membros via customId do Modal
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
        .setLabel("Nick do 2º Jogador")
        .setPlaceholder("Ex: FLX_Bak")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputNick3 = new TextInputBuilder()
        .setCustomId("input_nick_p3")
        .setLabel("Nick do 3º Jogador")
        .setPlaceholder("Ex: FLX_Thurzin")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputNick4 = new TextInputBuilder()
        .setCustomId("input_nick_p4")
        .setLabel("Nick do 4º Jogador")
        .setPlaceholder("Ex: FLX_Coringa")
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
    // 3. SUBMISSÃO DO MODAL DE NICKS -> REGISTRA EQUIPE E ATUALIZA PAINEL
    // ----------------------------------------------------
    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith("camp_modal_nicks_")
    ) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Recupera os IDs passados no customId
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

      // Busca o torneio (somente leitura, não cria)
      const tournament = await TournamentService.getActiveTournament();

      if (!tournament) {
        return await interaction.editReply({
          content: `<:serv:1545444524241719376> O campeonato foi encerrado ou pausado durante o preenchimento.`,
        });
      }

      // Registra a equipe no banco de dados
      const team = await TournamentService.registerTeam({
        tournamentId: tournament.id,
        teamName,
        captainId,
        playersData,
      });

      // ----------------------------------------------------
      // ATUALIZAÇÃO EM TEMPO REAL DAS VAGAS NO PAINEL
      // ----------------------------------------------------
      if (tournament.panelChannelId && tournament.panelMessageId) {
        try {
          const channel = await interaction.client.channels.fetch(
            tournament.panelChannelId,
          );
          const msg = await channel.messages.fetch(tournament.panelMessageId);

          // Busca o torneio atualizado com a nova equipe para contar as vagas corretamente
          const updatedTournament =
            await TournamentService.getActiveTournament();
          if (updatedTournament) {
            const activeTeams = updatedTournament.teams.filter(
              (t) => !["CANCELLED"].includes(t.status),
            ).length;
            const vagasRestantes = updatedTournament.maxTeams - activeTeams;

            const oldEmbed = msg.embeds[0];
            const newEmbed = EmbedBuilder.from(oldEmbed).setDescription(
              `Chegou a hora! Registre seu squad abaixo.\n\n` +
                `🟢 **Status:** Inscrições Abertas\n` +
                `<:serv:1537237908547965001> **Vagas Restantes:** ${Math.max(0, vagasRestantes)}/${updatedTournament.maxTeams}\n` +
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

      // ----------------------------------------------------
      // RESPOSTA AO USUÁRIO (LISTA DE ESPERA OU SUCESSO)
      // ----------------------------------------------------
      if (team.status === "WAITLIST") {
        return await interaction.editReply({
          content: `<:serv:1545494059081142403> **Vagas Principais Esgotadas!**\nA equipe **${team.name}** foi registrada na **Lista de Espera** (Posição #${team.waitlistOrder}). Se surgir uma vaga, vocês serão notificados!`,
        });
      }

      // Monta a lista formatada com os dados da equipe
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
            `<:serv:1537237908547965001> **Jogadores Escalados:**\n${playersFormattedList}\n\n` +
            `<:serv:1545458280145354863> **Passo Final para Confirmar a Vaga:**\n` +
            `Realize o pagamento da taxa de **R$ ${(tournament.registrationFee || 0).toFixed(2)}** via PIX e envie o comprovante pelo botão abaixo.\n\n` +
            `<:serv:1542026399953457172> **Chave PIX:** \`pix@2qn.com.br\`\n` +
            `<:serv:1542026405481684994> **Titular:** 2QN Torneios`,
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
