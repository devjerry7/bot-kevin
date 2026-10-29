const prisma = require("../database"); // handlers/bolaoInteractionHandler.js

const MATCH_NAME = "LOUD vs Vitality";

module.exports = async (interaction) => {
  const userId = interaction.user.id;
  const customId = interaction.customId;

  try {
    // Garante que o registro do voto existe no banco
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

    // 1. MENU DE VENCEDOR + PLACAR (bolao_select_winnerscore)
    if (customId === "bolao_select_winnerscore") {
      const selectedValue = interaction.values[0]; // Ex: "loud_3x1" ou "vitality_3x0"
      const [team, score] = selectedValue.split("_");
      const winnerName = team === "loud" ? "LOUD" : "Team Vitality";

      await prisma.bolaoVote.update({
        where: { id: voteRecord.id },
        data: {
          votedWinner: winnerName,
          votedScore: score,
        },
      });

      responseText = `<a:ver_verifcado2qn:1535775624864473169> Palpite salvo: **${winnerName}** vencendo por **${score}**!`;
    }

    // 2. MENU DE MVP (bolao_select_mvp)
    else if (customId === "bolao_select_mvp") {
      const selectedMvp = interaction.values[0]; // Ex: "darker", "Derke"

      await prisma.bolaoVote.update({
        where: { id: voteRecord.id },
        data: { votedMvp: selectedMvp },
      });

      responseText = `<a:ver_verifcado2qn:1535775624864473169> Voto registrado para MVP: **${selectedMvp}**!`;
    }

    // 3. BOTÃO DE PRESENÇA (bolao_attend)
    else if (customId === "bolao_attend") {
      const newStatus = !voteRecord.attending;

      await prisma.bolaoVote.update({
        where: { id: voteRecord.id },
        data: { attending: newStatus },
      });

      responseText = newStatus
        ? "🎟️ **Presença confirmada** para a transmissão ao vivo!"
        : "❌ Presença removida da transmissão.";
    }

    return interaction.reply({ content: responseText, ephemeral: true });
  } catch (error) {
    console.error("[BOLAO INTERACTION ERROR]:", error);
    return interaction.reply({
      content:
        "<:br_errado2qn:1556905095919050762> Ocorreu um erro ao registrar seu palpite.",
      ephemeral: true,
    });
  }
};
