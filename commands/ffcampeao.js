const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../config");

module.exports = {
  name: "ffcampeao",
  description:
    "Coroa o grande campeão pelo ID ou menção do jogador, encerra o torneio e pede feedback.",
  async execute(message, args) {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply(
        "❌ Apenas administradores podem usar este comando.",
      );
    }

    // Pega o ID do usuário mencionado ou o texto digitado
    const targetUser = message.mentions.users.first() || args[0];
    if (!targetUser) {
      return message.reply(
        "⚠️ Marque um dos jogadores da dupla campeã ou digite o ID dele. Ex: `!ffcampeao @usuario`",
      );
    }

    const userId = typeof targetUser === "object" ? targetUser.id : targetUser;

    // Busca a equipe onde o usuário é o player1 ou o player2
    const championTeam = await prisma.ffTeam.findFirst({
      where: {
        OR: [{ player1Id: userId }, { player2Id: userId }],
      },
    });

    if (!championTeam) {
      return message.reply(
        `❌ Não encontrei nenhuma equipe cadastrada com esse usuário.`,
      );
    }

    // Encerra o torneio no banco de dados
    await prisma.ffTournament
      .update({
        where: { id: "main" },
        data: { isOpen: false },
      })
      .catch(() => {});

    // Embed Oficial de Campeões
    const champEmbed = new EmbedBuilder()
      .setTitle(
        `<:COROA:1535775618615087154> TEMOS OS GRANDES CAMPEÕES DO 2X2! <:COROA:1535775618615087154>`,
      )
      .setDescription(
        `A equipe **${championTeam.teamName}** amassou todo mundo e levou o título do campeonato!\n\n` +
          `<:trofeuicon:1545459134089138256> **Campeões:** <@> & <@>\n` +
          `<:dinheiro:1536498069380538499> **Premiação:** R$ 30,00 no total (R$ 15,00 para cada um)!\n\n` +
          `---` +
          `\n<:emoji_9:1542026407801258064> **Obrigado a todos por encostar!** Pedimos desculpa aos que tomaram W.O. porque a dupla não apareceu — foi a primeira vez que fizemos algo do tipo, esperamos de verdade que tenham gostado e se divertido.\n\n` +
          `👇 **Reaja com o emoji abaixo se você quer mais eventos assim!**`,
      )
      .setColor(0xffd700)
      .setTimestamp();

    const sentMessage = await message.channel.send({ embeds: [champEmbed] });

    const reactionEmoji = config.emoji?.success || "👍";
    await sentMessage.react(reactionEmoji).catch(() => {});
  },
};
