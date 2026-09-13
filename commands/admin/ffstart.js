const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../../config");

module.exports = {
  name: "ffstart",
  description: "Sorteia duplas, cria calls temporárias e monta o chaveamento.",
  async execute(message, args) {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.channel.send(
        `${config.emoji.error || "❌"} Apenas administradores.`,
      );
    }

    // 1. Trava o campeonato
    await prisma.ffTournament.update({
      where: { id: "main" },
      data: { isOpen: false },
    });

    // 2. Busca e embaralha participantes
    let participants = await prisma.ffParticipant.findMany();
    if (participants.length < 4) {
      return message.channel.send(
        `${config.emoji.warning || "⚠️"} Precisamos de pelo menos 4 inscritos para iniciar um 2x2.`,
      );
    }

    const shuffled = participants.sort(() => 0.5 - Math.random());
    if (shuffled.length % 2 !== 0) {
      const benched = shuffled.pop();
      message.channel.send(
        `${config.emoji.warning || "⚠️"} Número ímpar de inscritos. O jogador <@${benched.userId}> ficou de reserva.`,
      );
    }

    // Limpa estado anterior (zera chaves e times passados)
    await prisma.ffMatch.deleteMany({});
    await prisma.ffTeam.deleteMany({});

    const teams = [];
    let teamCount = 1;
    const categoryId = "1548813683075973120"; // Categoria definida por você

    await message.channel.send(
      `${config.emoji.loading || "⏳"} **Sorteando duplas e gerando infraestrutura...**`,
    );

    // 3. Monta as Equipes e Cria as Calls
    for (let i = 0; i < shuffled.length; i += 2) {
      const p1 = shuffled[i];
      const p2 = shuffled[i + 1];
      const teamName = `Equipe ${teamCount}`;
      let voiceId = null;

      try {
        const voiceChannel = await message.guild.channels.create({
          name: `🔥┇${teamName}`,
          type: ChannelType.GuildVoice,
          parent: categoryId,
          userLimit: 2, // Limite exato para a dupla
          permissionOverwrites: [
            { id: message.guild.id, deny: [PermissionsBitField.Flags.Connect] },
            {
              id: p1.userId,
              allow: [
                PermissionsBitField.Flags.Connect,
                PermissionsBitField.Flags.Speak,
              ],
            },
            {
              id: p2.userId,
              allow: [
                PermissionsBitField.Flags.Connect,
                PermissionsBitField.Flags.Speak,
              ],
            },
          ],
        });
        voiceId = voiceChannel.id;
      } catch (err) {
        console.error("Erro ao criar call:", err);
      }

      const team = await prisma.ffTeam.create({
        data: {
          teamName,
          player1Id: p1.userId,
          player2Id: p2.userId,
          channelId: voiceId,
        },
      });
      teams.push(team);
      teamCount++;
    }

    // 4. Monta o Chaveamento (Rodada 1)
    await message.channel.send(`🏆 **CHAVEAMENTO OFICIAL - RODADA 1** 🏆`);

    for (let i = 0; i < teams.length; i += 2) {
      if (teams[i + 1]) {
        const teamA = teams[i];
        const teamB = teams[i + 1];

        const match = await prisma.ffMatch.create({
          data: {
            round: 1,
            teamAId: teamA.id,
            teamBId: teamB.id,
            status: "pending",
          },
        });

        const embed = new EmbedBuilder()
          .setTitle(`⚔️ EMBATE: ${teamA.teamName} vs ${teamB.teamName}`)
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
          `*A **${teams[i].teamName}** avançou automaticamente por falta de oponentes nesta chave.*`,
        );
      }
    }
  },
};
