// services/discordMatchService.js
const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

class DiscordMatchService {
  // IDs fixos configurados pela administração
  static CHANNELS = {
    RESULTADOS: "1551951692780802058",
    ADMIN_LOGS: "1555653149035991150",
    REFERENCE_CATEGORY: "1535753779314430042",
  };

  /**
   * Cria a infraestrutura de Discord para um confronto específico:
   * - Categoria posicionada acima da categoria de referência, visível para todos e acesso restrito
   * - Voz Equipe 1 e Voz Equipe 2
   * - Canal de texto para alinhamento de ID e Senha (marcando os capitães) + Botões de Vitória para Admins
   */
  static async setupMatchInfrastructure(guild, match, roundName) {
    if (!match.teamB) return null; // Se for BYE, não precisa de infraestrutura

    const team1 = match.teamA;
    const team2 = match.teamB;

    // Define os nomes com segurança (suporta tanto .name quanto .teamName do Prisma)
    const team1Name = team1.name || team1.teamName || "Equipe 1";
    const team2Name = team2.name || team2.teamName || "Equipe 2";

    // Número identificador limpo da partida (fallback para os últimos digitos se matchNumber não existir)
    const matchIdentifier = match.matchNumber
      ? `J${match.matchNumber}`
      : match.id.slice(-4);

    // Coletar IDs dos jogadores das duas equipes
    const team1MemberIds = team1.players
      ? team1.players.map((p) => p.discordId)
      : [];
    const team2MemberIds = team2.players
      ? team2.players.map((p) => p.discordId)
      : [];
    const allowedUserIds = [...team1MemberIds, ...team2MemberIds];

    // Nome da categoria limpo e profissional
    const categoryName = `⚔️ Jogo #${match.matchNumber || match.id.slice(-4)} | ${team1Name} x ${team2Name}`;

    // Descobrir a posição para criar a categoria acima da categoria de referência
    let targetPosition = undefined;
    const refCategory = guild.channels.cache.get(
      DiscordMatchService.CHANNELS.REFERENCE_CATEGORY,
    );
    if (refCategory) {
      targetPosition = refCategory.position;
    }

    // Configurar permissões: Visível para todos (@everyone pode ver), mas conectar/falar/escrever restrito
    const permissionOverwrites = [
      {
        id: guild.id, // @everyone
        allow: [PermissionFlagsBits.ViewChannel],
        deny: [
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.SendMessages,
        ],
      },
    ];

    // Adiciona permissão para cada jogador envolvido no confronto (caso exista na guilda)
    for (const userId of allowedUserIds) {
      try {
        const member =
          guild.members.cache.get(userId) ||
          (await guild.members.fetch(userId).catch(() => null));

        if (member) {
          permissionOverwrites.push({
            id: userId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          });
        }
      } catch (err) {
        // Ignora IDs fictícios ou que não pertencem ao servidor (como os de seed de teste)
      }
    }

    // 1. Criar Categoria do Confronto posicionada logo acima da referência
    const category = await guild.channels.create({
      name: categoryName,
      type: ChannelType.GuildCategory,
      position: targetPosition,
      permissionOverwrites,
    });

    // 2. Criar Canal de Voz da Equipe 1
    const voiceTeam1 = await guild.channels.create({
      name: `🔊 [${team1Name}]`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites,
    });

    // 3. Criar Canal de Voz da Equipe 2
    const voiceTeam2 = await guild.channels.create({
      name: `🔊 [${team2Name}]`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites,
    });

    // 4. Criar Canal de Texto do Confronto com nome limpo
    const textChannel = await guild.channels.create({
      name: `💬-confronto-${matchIdentifier.toLowerCase()}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites,
    });

    // 5. Enviar Embed oficial marcando os capitães + Botões de Definição de Vencedor (Admin)
    const embedMatch = new EmbedBuilder()
      .setTitle(
        `<:emojiespada:1555686156434411680> CONFRONTO INICIADO: ${team1Name} VS ${team2Name}`,
      )
      .setColor(0x9b59b6)
      .setDescription(
        `A infraestrutura deste confronto foi gerada com sucesso!\n\n` +
          `<:ama_coroa2qn:1535775618615087154> **Capitão Equipe 1:** <@${team1.captainId}> (${team1Name})\n` +
          `<:ama_coroa2qn:1535775618615087154> **Capitão Equipe 2:** <@${team2.captainId}> (${team2Name})\n\n` +
          `<:verd_notas2qn:1545488990168158350> **Instruções:**\n` +
          `1. Decidam entre si qual capitão criará a sala customizada no Free Fire.\n` +
          `2. Enviem o **ID e a Senha** da sala neste chat.\n` +
          `3. Entrem nas respectivas calls de voz acima. Boa sorte a ambos os squads!\n\n` +
          `*<:ama_cuidado2qn:1545494059081142403> A administração deve clicar em um dos botões abaixo para declarar o vencedor da partida.*`,
      )
      .setTimestamp();

    const rowButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`match_win_${match.id}_${team1.id}`)
        .setLabel(`Vitória ${team1Name}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`match_win_${match.id}_${team2.id}`)
        .setLabel(`Vitória ${team2Name}`)
        .setStyle(ButtonStyle.Secondary),
    );

    await textChannel.send({
      content: `<@${team1.captainId}> e <@${team2.captainId}>, o confronto de vocês foi liberado!`,
      embeds: [embedMatch],
      components: [rowButtons],
    });

    return {
      categoryId: category.id,
      textChannelId: textChannel.id,
      voiceTeam1Id: voiceTeam1.id,
      voiceTeam2Id: voiceTeam2.id,
    };
  }
}

module.exports = DiscordMatchService;
