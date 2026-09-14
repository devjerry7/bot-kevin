const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../config");

module.exports = {
  name: "ffcampeao",
  description:
    "Coroa o grande campeão com IDs fixos no código, encerra o torneio e pede feedback.",
  async execute(message, args) {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply(
        "❌ Apenas administradores podem usar este comando.",
      );
    }

    // IDs fixos fornecidos diretamente para a dupla campeã
    const player1Id = "513874508273156107";
    const player2Id = "1536097327381614693";

    // Encerra o torneio no banco de dados
    await prisma.ffTournament
      .update({
        where: { id: "main" },
        data: { isOpen: false },
      })
      .catch(() => {});

    // Embed Oficial de Campeões com os IDs injetados diretamente
    const champEmbed = new EmbedBuilder()
      .setTitle(
        `<:COROA:1535775618615087154> TEMOS OS GRANDES CAMPEÕES DO 2X2! <:COROA:1535775618615087154>`,
      )
      .setDescription(
        `A equipe campeã amassou todo mundo e levou o título do campeonato!\n\n` +
          `<:trofeuicon:1545459134089138256> **Campeões:** <@${player1Id}> & <@${player2Id}>\n` +
          `<:dinheiro:1536498069380538499> **Premiação:** R$ 30,00 no total (R$ 15,00 para cada um)!\n\n` +
          `---\n` +
          `<:emoji_9:1542026407801258064> **Obrigado a todos por encostar!** Pedimos desculpa aos que tomaram W.O. porque a dupla não apareceu — foi a primeira vez que fizemos algo do tipo, esperamos de verdade que tenham gostado e se divertido.\n\n` +
          `👇 **Reaja com o emoji abaixo se você quer mais eventos assim!**`,
      )
      .setColor(0xffd700)
      .setTimestamp();

    const sentMessage = await message.channel.send({ embeds: [champEmbed] });

    const reactionEmoji = config.emoji?.success || "👍";
    await sentMessage.react(reactionEmoji).catch(() => {});
  },
};
