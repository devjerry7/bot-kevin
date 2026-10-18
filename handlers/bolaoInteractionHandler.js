// handlers/bolaoInteractionHandler.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const MATCH_NAME = "LOUD vs Vitality";

module.exports = async (interaction) => {
  const userId = interaction.user.id;
  const [_, action, subValue] = interaction.customId.split("_");
  // Exemplo: bolao_win_loud -> action = win, subValue = loud
  // Exemplo: bolao_score_3x0 -> action = score, subValue = 3x0
  // Exemplo: bolao_mvp_darker -> action = mvp, subValue = darker
  // Exemplo: bolao_attend -> action = attend, subValue = undefined

  try {
    // Garante que o registro do usuário existe para esta partida
    let voteRecord = await prisma.bolaoVote.findUnique({
      where: {
        discordUserId_matchName: {
          discordUserId: userId,
          matchName: MATCH_NAME,
        },
      },
    });

    if (!voteRecord) {
      voteRecord = await prisma.bolaoVote.create({
        data: {
          discordUserId: userId,
          matchName: MATCH_NAME,
        },
      });
    }

    let responseText = "";

    if (action === "win") {
      const winnerName = subValue === "loud" ? "LOUD" : "Team Vitality";
      await prisma.bolaoVote.update({
        where: { id: voteRecord.id },
        data: { votedWinner: winnerName },
      });
      responseText = `<:br_correto2qn:1556905093729882217> Seu voto para **Vencedor (${winnerName})** foi registrado com sucesso!`;
    } else if (action === "score") {
      await prisma.bolaoVote.update({
        where: { id: voteRecord.id },
        data: { votedScore: subValue },
      });
      responseText = `<:br_correto2qn:1556905093729882217> Seu palpite de **Placar (${subValue})** foi salvo!`;
    } else if (action === "mvp") {
      await prisma.bolaoVote.update({
        where: { id: voteRecord.id },
        data: { votedMvp: subValue },
      });
      responseText = `<:br_correto2qn:1556905093729882217> Você votou no **MVP: ${subValue}**!`;
    } else if (action === "attend") {
      const newStatus = !voteRecord.attending;
      await prisma.bolaoVote.update({
        where: { id: voteRecord.id },
        data: { attending: newStatus },
      });
      responseText = newStatus
        ? "<a:ver_verifcado2qn:1535775624864473169> Presença confirmada para a transmissão!"
        : "<:br_errado2qn:1556905095919050762> Presença removida da transmissão.";
    }

    return interaction.reply({ content: responseText, ephemeral: true });
  } catch (error) {
    console.error("[BOLAO INTERACTION ERROR]:", error);
    return interaction.reply({
      content:
        "<:br_errado2qn:1556905095919050762> Ocorreu um erro ao registrar seu palpite no banco de dados.",
      ephemeral: true,
    });
  }
};
