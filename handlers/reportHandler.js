// handlers/reportHandler.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Manipulador interativo para o Sistema de Denúncias com Tópicos Privados e Seleções em Cascata
 */
module.exports = async function handleReportInteractions(interaction) {
  try {
    // 1. Botão Inicial: Abrir Tópico Privado de Denúncia
    if (
      interaction.isButton() &&
      interaction.customId === "btn_open_report_ticket"
    ) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const tournament = await prisma.tournament.findFirst({
        where: {
          status: {
            in: ["REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS"],
          },
        },
        include: {
          teams: {
            where: { status: "CONFIRMED" },
            include: { players: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!tournament || tournament.teams.length === 0) {
        return interaction.editReply({
          content: `<:verm_x2qn:1545444524241719376> Não há campeonato ativo ou equipes confirmadas no momento para registrar denúncias.`,
        });
      }

      const channel = interaction.channel;

      // Cria um tópico privado exclusivo para a denúncia
      const thread = await channel.threads.create({
        name: `denuncia-${interaction.user.username}`.substring(0, 100),
        type: ChannelType.PrivateThread,
        reason: `Canal privado de denúncia do usuário ${interaction.user.tag}`,
        invitable: false,
      });

      await thread.members.add(interaction.user.id);

      // Passo 1: Monta o select menu apenas com as equipes confirmadas (máx 25 por menu do Discord)
      const teamOptions = tournament.teams.slice(0, 25).map((t) => ({
        label: t.name,
        value: `report_team_${t.id}`,
        description: `Selecionar equipe ${t.name}`,
      }));

      const rowTeam = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("report_select_team")
          .setPlaceholder("Selecione a equipe denunciada...")
          .addOptions(teamOptions),
      );

      const embedInstr = new EmbedBuilder()
        .setTitle(
          "<:ama_cuidado2qn:1545494059081142403> TICKET DE DENÚNCIA ABERTO",
        )
        .setColor(0xe74c3c)
        .setDescription(
          `<@${interaction.user.id}>, este é o seu espaço privado para reportar irregularidades.\n\n` +
            `**Instruções:**\n` +
            `1. Selecione abaixo a **equipe denunciada**.\n` +
            `2. Em seguida, selecione o **jogador específico** (ou a equipe toda).\n` +
            `3. Envie os **prints ou vídeos (provas)** diretamente neste chat a qualquer momento.\n` +
            `4. Nossa moderação irá analisar o caso.`,
        )
        .setTimestamp();

      await thread.send({
        content: `<@${interaction.user.id}>`,
        embeds: [embedInstr],
        components: [rowTeam],
      });

      await interaction.editReply({
        content: `<:serv:1545501461427785798> Tópico privado de denúncia criado com sucesso: <#${thread.id}>`,
      });
      return true;
    }

    // 2. Passo 1 Concluído: Equipe Selecionada -> Carrega Apenas os Jogadores Desta Equipe
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "report_select_team"
    ) {
      await interaction.deferUpdate();

      const selectedTeamId = interaction.values[0].replace("report_team_", "");
      const team = await prisma.team.findUnique({
        where: { id: selectedTeamId },
        include: { players: true },
      });

      if (!team) {
        await interaction.followUp({
          content: `<:verm_x2qn:1545444524241719376> Equipe não encontrada no banco de dados.`,
          flags: MessageFlags.Ephemeral,
        });
        return true;
      }

      // Monta as opções apenas com os jogadores da equipe escolhida
      const playerOptions = team.players.map((p) => ({
        label: `${p.gameNick} (${p.device})`,
        value: `report_player_${p.discordId}`,
        description: `Discord ID: ${p.discordId}`,
      }));

      // Adiciona opção para denunciar a equipe inteira
      playerOptions.unshift({
        label: `[Toda a Equipe / Geral]`,
        value: `report_player_ALL`,
        description: `Denunciar a line-up inteira por infração coletiva`,
      });

      const rowPlayer = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`report_select_player_${team.id}`)
          .setPlaceholder("Selecione o jogador específico...")
          .addOptions(playerOptions.slice(0, 25)),
      );

      await interaction.editReply({
        content: `Equipe selecionada: **${team.name}**. Agora, selecione o **jogador específico** envolvido:`,
        components: [rowPlayer],
      });
      return true;
    }

    // 3. Passo 2 Concluído: Jogador Selecionado -> Carrega as Categorias de Infração
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith("report_select_player_")
    ) {
      await interaction.deferUpdate();

      const teamId = interaction.customId.replace("report_select_player_", "");
      const selectedValue = interaction.values[0];
      const targetDiscordId = selectedValue.replace("report_player_", "");

      const categoryOptions = [
        {
          label: "Uso de Cheat / Hack",
          value: "CAT_CHEAT",
          description: "Suspeita de programas de terceiro ou trapaça",
        },
        {
          label: "Emulador Excedido",
          value: "CAT_EMULATOR",
          description: "Quantidade de emuladores acima do permitido",
        },
        {
          label: "Jogador Não Inscrito (Gatuno)",
          value: "CAT_UNREGISTERED",
          description: "Jogador jogando no lugar de outro",
        },
        {
          label: "Comportamento Antidesportivo",
          value: "CAT_CONDUCT",
          description: "Ofensas, toxicidade ou antijogo",
        },
        {
          label: "Outro Motivo",
          value: "CAT_OTHER",
          description: "Outras infrações às regras do campeonato",
        },
      ];

      const rowCategory = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`report_select_category_${teamId}_${targetDiscordId}`)
          .setPlaceholder("Selecione a categoria da infração...")
          .addOptions(categoryOptions),
      );

      await interaction.editReply({
        content: `Alvo definido. Por fim, selecione a **categoria da infração**:`,
        components: [rowCategory],
      });
      return true;
    }

    // 4. Passo 3 Concluído: Categoria Selecionada -> Salva a Denúncia e Notifica a Staff
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith("report_select_category_")
    ) {
      await interaction.deferUpdate();

      const parts = interaction.customId
        .replace("report_select_category_", "")
        .split("_");
      const teamId = parts[0];
      const targetDiscordId = parts.slice(1).join("_");
      const categoryValue = interaction.values[0];

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { tournament: true },
      });

      const categoryMap = {
        CAT_CHEAT: "CHEAT",
        CAT_EMULATOR: "EMULATOR_EXCEEDED",
        CAT_UNREGISTERED: "UNREGISTERED_PLAYER",
        CAT_CONDUCT: "CONDUCT",
        CAT_OTHER: "OTHER",
      };

      const prismaCategory = categoryMap[categoryValue] || "OTHER";

      let reportRecord;
      try {
        const activeMatch = await prisma.match.findFirst({
          where: {
            tournamentId: team.tournamentId,
            status: { not: "FINISHED" },
          },
        });

        const fallbackMatch = await prisma.match.findFirst({
          where: { tournamentId: team.tournamentId },
        });

        reportRecord = await prisma.report.create({
          data: {
            tournamentId: team.tournamentId,
            matchId: activeMatch
              ? activeMatch.id
              : fallbackMatch
                ? fallbackMatch.id
                : null,
            reporterDiscordId: interaction.user.id,
            reportedTeamId: team.id,
            reportedPlayerDiscordId:
              targetDiscordId === "ALL" ? null : targetDiscordId,
            category: prismaCategory,
            description: `Denúncia aberta via Tópico Privado por <@${interaction.user.id}>. Mídias anexadas no tópico.`,
            status: "OPEN",
          },
        });
      } catch (dbErr) {
        console.error("[REPORT DB ERROR]:", dbErr);
        await interaction.editReply({
          content: `<:verm_x2qn:1545444524241719376> Erro ao salvar denúncia no banco de dados: ${dbErr.message}`,
          components: [],
        });
        return true;
      }

      await interaction.editReply({
        content:
          `<a:ver_verifcado2qn:1535775624864473169> **Denúncia registrada com sucesso! (ID: \`${reportRecord.id.slice(-6)}\`)**\n\n` +
          `Certifique-se de ter enviado todas as **fotos, prints e vídeos de comprovação** aqui no chat.\n` +
          `Nossa moderação já foi notificada e avaliará o caso.`,
        components: [],
      });

      // Envia alerta para o canal de logs da Staff / Administração
      try {
        const staffChannelId = "1555653149035991150";
        const staffChannel = await interaction.guild.channels
          .fetch(staffChannelId)
          .catch(() => null);

        if (staffChannel) {
          const reportEmbed = new EmbedBuilder()
            .setTitle(
              `🚨 NOVA DENÚNCIA REGISTRADA — ID: ${reportRecord.id.slice(-6)}`,
            )
            .setColor(0xe74c3c)
            .setDescription(
              `• **Denunciante:** <@${interaction.user.id}>\n` +
                `• **Equipe Denunciada:** **${team.name}**\n` +
                `• **Alvo Específico:** ${targetDiscordId === "ALL" ? "Toda a Equipe" : `<@${targetDiscordId}>`}\n` +
                `• **Categoria:** \`${prismaCategory}\`\n\n` +
                `*Acesse o tópico privado criado pelo usuário para visualizar as mídias e vídeos enviados.*`,
            )
            .setTimestamp();

          const rowStaff = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`report_resolve_${reportRecord.id}`)
              .setLabel("Resolver / Arquivar")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`report_dismiss_${reportRecord.id}`)
              .setLabel("Descartar Denúncia")
              .setStyle(ButtonStyle.Danger),
          );

          await staffChannel.send({
            embeds: [reportEmbed],
            components: [rowStaff],
          });
        }
      } catch (err) {
        console.error("[STAFF REPORT NOTIFY ERROR]:", err);
      }

      return true;
    }

    // 5. Ações da Staff na Denúncia (Resolver ou Descartar)
    if (
      interaction.isButton() &&
      (interaction.customId.startsWith("report_resolve_") ||
        interaction.customId.startsWith("report_dismiss_"))
    ) {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator,
        )
      ) {
        return interaction.reply({
          content: `<:verm_x2qn:1545444524241719376> Apenas administradores podem gerenciar denúncias.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const isResolve = interaction.customId.startsWith("report_resolve_");
      const reportId = interaction.customId.replace(
        isResolve ? "report_resolve_" : "report_dismiss_",
        "",
      );

      try {
        await prisma.report.update({
          where: { id: reportId },
          data: { status: isResolve ? "RESOLVED" : "DISMISSED" },
        });
      } catch (e) {
        // Ignora erro caso o ID seja parcial
      }

      const disabledRow = new ActionRowBuilder().addComponents(
        ButtonBuilder.from(
          interaction.message.components[0].components[0],
        ).setDisabled(true),
        ButtonBuilder.from(
          interaction.message.components[0].components[1],
        ).setDisabled(true),
      );

      await interaction.message.edit({ components: [disabledRow] });
      await interaction.editReply({
        content: `<a:ver_verifcado2qn:1535775624864473169> Denúncia marcada como **${isResolve ? "RESOLVIDA" : "DESCARTADA"}** com sucesso!`,
      });
      return true;
    }

    return false;
  } catch (err) {
    console.error("[ERRO REPORT INTERACTION]", err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: `<:verm_x2qn:1545444524241719376> Erro no processamento da denúncia: ${err.message}`,
      });
    }
    return true;
  }
};
