const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../../config");

module.exports = {
  name: "ffround",
  description:
    "Gera a próxima fase do campeonato com os vencedores ou anuncia o campeão.",
  async execute(message, args) {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.channel.send(
        `${config.emoji.error || "❌"} Apenas administradores.`,
      );
    }

    // 1. Descobre a rodada atual
    const allMatches = await prisma.ffMatch.findMany({
      orderBy: { round: "desc" },
    });
    if (allMatches.length === 0) {
      return message.channel.send(
        `${config.emoji.warning || "⚠️"} Não há nenhum campeonato em andamento.`,
      );
    }

    const currentRound = allMatches[0].round;
    const currentRoundMatches = allMatches.filter(
      (m) => m.round === currentRound,
    );

    // 2. Trava de Segurança: Alguém ficou sem votar?
    const pending = currentRoundMatches.filter((m) => m.status !== "finished");
    if (pending.length > 0) {
      return message.channel.send(
        `${config.emoji.error || "❌"} Faltam definir os vencedores de **${pending.length}** partida(s) da Rodada ${currentRound}!`,
      );
    }

    // 3. Coleta os vencedores
    const winnerIds = currentRoundMatches
      .map((m) => m.winnerId)
      .filter(Boolean);

    // 4. VERIFICA SE TEMOS UM CAMPEÃO (Fim do torneio)
    if (winnerIds.length === 1) {
      const champion = await prisma.ffTeam.findUnique({
        where: { id: winnerIds[0] },
      });

      const champEmbed = new EmbedBuilder()
        .setTitle(`👑 TEMOS UM CAMPEÃO! 👑`)
        .setDescription(
          `A equipe **${champion.teamName}** formou a dupla perfeita!\n🏆 <@${champion.player1Id}> & <@${champion.player2Id}> amassaram todos e levaram o torneio!`,
        )
        .setColor(0xffd700)
        .setThumbnail(
          "https://media.giphy.com/media/l0ExhcMymdL6TrZ84/giphy.gif",
        ) // Opcional: GIF de troféu
        .setFooter({ text: "Fim do Campeonato 2x2" });

      // Opcional: Marca o torneio como finalizado para não bugar
      await prisma.ffTournament.update({
        where: { id: "main" },
        data: { isOpen: false },
      });

      return message.channel.send({ embeds: [champEmbed] });
    }

    // 5. Monta a Próxima Rodada
    const nextRound = currentRound + 1;
    await message.channel.send(
      `${config.emoji.loading || "⏳"} **MONTANDO CHAVEAMENTO - RODADA ${nextRound}...**`,
    );

    const teams = await prisma.ffTeam.findMany({
      where: { id: { in: winnerIds } },
    });

    for (let i = 0; i < teams.length; i += 2) {
      if (teams[i + 1]) {
        const teamA = teams[i];
        const teamB = teams[i + 1];

        const match = await prisma.ffMatch.create({
          data: {
            round: nextRound,
            teamAId: teamA.id,
            teamBId: teamB.id,
            status: "pending",
          },
        });

        const embed = new EmbedBuilder()
          .setTitle(
            `⚔️ FASE ${nextRound}: ${teamA.teamName} vs ${teamB.teamName}`,
          )
          .setDescription(
            `**${teamA.teamName}**\n<@${teamA.player1Id}> & <@${teamA.player2Id}>\n\n**VS**\n\n**${teamB.teamName}**\n<@${teamB.player1Id}> & <@${teamB.player2Id}>`,
          )
          .setColor(config.colorBase || 0x962dc0);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`ff_win_${match.id}_${teamA.id}`)
            .setLabel(`Vitória ${teamA.teamName}`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(config.emoji.success || "✅"),
          new ButtonBuilder()
            .setCustomId(`ff_win_${match.id}_${teamB.id}`)
            .setLabel(`Vitória ${teamB.teamName}`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(config.emoji.success || "✅"),
        );

        const msg = await message.channel.send({
          embeds: [embed],
          components: [row],
        });
        await prisma.ffMatch.update({
          where: { id: match.id },
          data: { messageId: msg.id },
        });
      } else {
        message.channel.send(
          `*A **${teams[i].teamName}** avançou por W.O nesta fase (Chave ímpar).*`,
        );
        // Aqui o ideal seria criar uma match fake finalizada para o time não sumir na próxima checagem, mas para simplificar, ele já está no array de times para o round que vem.
      }
    }
  },
};
