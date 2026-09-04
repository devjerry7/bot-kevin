// game/scoreSystem.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const FINALIZE_BUTTON_ID = "finalize_stop_scoring";
const EDIT_BUTTON_ID = "edit_review_answers";
const INVALIDATE_MODAL_ID = "invalidate_modal";
const PLAYER_INPUT_ID = "player_to_invalidate";
const CATEGORY_INPUT_ID = "category_to_invalidate";

// Função auxiliar de Embed baseada no .env
const createGameEmbed = (title, description, color) => {
  const COLOR_BASE = process.env.COLOR_BASE
    ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
    : 0x2f3136;
  const BANNER_URL = process.env.BANNER_SCORE || process.env.BANNER_URL;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color || COLOR_BASE)
    .setTimestamp();

  if (BANNER_URL) embed.setImage(BANNER_URL);
  return embed;
};

async function calculateScores(state, channel) {
  const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";

  if (Object.keys(state.players).length === 0) {
    return channel.send({
      embeds: [
        createGameEmbed(
          "Fim da Rodada",
          `${EMOJI_ERROR} Ninguém respondeu a tempo!`,
        ),
      ],
    });
  }

  const categories = state.categories;
  const allAnswers = {};
  for (const playerID in state.players) {
    state.players[playerID].score = 0;
    state.players[playerID].unique = new Array(categories.length).fill(true);
  }

  categories.forEach((category, catIndex) => {
    allAnswers[category] = {};
    for (const playerID in state.players) {
      const answer = state.players[playerID].answers[catIndex];
      if (answer && answer !== "") {
        allAnswers[category][answer] = (allAnswers[category][answer] || 0) + 1;
      }
    }
  });

  for (const playerID in state.players) {
    const player = state.players[playerID];
    let totalRoundScore = 0;
    player.answers.forEach((answer, catIndex) => {
      if (!answer || answer === "") return;
      const categoryName = categories[catIndex];
      const usageCount = allAnswers[categoryName][answer];
      let points = 0;
      if (usageCount === 1) {
        points = 20;
      } else if (usageCount > 1) {
        points = 10;
        player.unique[catIndex] = false;
      }
      totalRoundScore += points;
    });
    player.score = totalRoundScore;
    state.totalScores[playerID] =
      (state.totalScores[playerID] || 0) + totalRoundScore;
  }

  const playersForRanking = Object.keys(state.players).map((playerID) => ({
    id: playerID,
    roundScore: state.players[playerID].score,
    totalScore: state.totalScores[playerID],
    answers: state.players[playerID].answers,
    unique: state.players[playerID].unique,
  }));

  const sortedPlayers = playersForRanking.sort(
    (a, b) => b.totalScore - a.totalScore,
  );

  const fields = sortedPlayers.map((data, index) => {
    const member = channel.guild.members.cache.get(data.id) || {
      user: { tag: "Desconhecido" },
    };
    const formattedAnswers = data.answers
      .map((ans, catIndex) => {
        if (!ans || ans === "") return "❌ `---`";
        const symbol = data.unique[catIndex] ? "⭐" : "🔄";
        return `${symbol} ${ans}`;
      })
      .join("\n");
    return {
      name: `#${index + 1} ${member.user.tag}`,
      value: `**Rodada:** ${data.roundScore} | **Total:** ${data.totalScore}\n${formattedAnswers}`,
      inline: true,
    };
  });

  const EMOJI_TROPHY = process.env.EMOJI_TROPHY || "🏆";
  const resultEmbed = createGameEmbed(
    `${EMOJI_TROPHY} Resultado: Rodada ${state.currentRound}`,
    `Próxima rodada em instantes...`,
  )
    .setFields(fields)
    .setFooter({ text: "⭐ 20 pts | 🔄 10 pts | ❌ 0 pts" });

  await channel.send({ embeds: [resultEmbed] });
}

async function postReviewEmbed(state, channel) {
  const categories = state.categories;
  const fields = [];

  categories.forEach((category, catIndex) => {
    let answerList = "";
    for (const playerID in state.players) {
      const member = channel.guild.members.cache.get(playerID) || {
        user: { username: "..." },
      };
      const answer = state.players[playerID].answers[catIndex] || "❌";
      answerList += `**${member.user.username}:** ${answer}\n`;
    }
    fields.push({
      name: category,
      value: answerList || "Sem respostas",
      inline: true,
    });
  });

  const EMOJI_REVIEW = process.env.EMOJI_REVIEW || "👁️";
  const reviewEmbed = createGameEmbed(
    `${EMOJI_REVIEW} Revisão: Letra ${state.currentLetter}`,
    "Analise as respostas abaixo. Se houver algo inválido, use o botão de **Corrigir**.\nQuando estiver pronto, clique em **Finalizar**.",
  );
  reviewEmbed.setFields(fields);

  const EMOJI_EDIT = process.env.EMOJI_EDIT || "✏️";
  const EMOJI_CONFIRM = process.env.EMOJI_CONFIRM || "✅";

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(EDIT_BUTTON_ID)
      .setLabel("Corrigir / Invalidar")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(EMOJI_EDIT),
    new ButtonBuilder()
      .setCustomId(FINALIZE_BUTTON_ID)
      .setLabel("Confirmar Pontuação")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(EMOJI_CONFIRM),
  );

  if (state.reviewMessageId) {
    try {
      const oldMessage = await channel.messages.fetch(state.reviewMessageId);
      await oldMessage.edit({
        embeds: [reviewEmbed],
        components: [actionRow],
        content: "",
      });
      return;
    } catch (e) {}
  }

  const sentMessage = await channel.send({
    embeds: [reviewEmbed],
    components: [actionRow],
  });
  state.reviewMessageId = sentMessage.id;
}

async function displayFinalScores(state, channel) {
  const sortedFinalPlayers = Object.entries(state.totalScores).sort(
    ([, a], [, b]) => b - a,
  );

  if (sortedFinalPlayers.length === 0)
    return channel.send("Jogo encerrado sem pontuação.");

  const fields = sortedFinalPlayers.map(([playerID, score], index) => {
    const member = channel.guild.members.cache.get(playerID) || {
      user: { tag: "Unknown" },
    };
    const medal =
      index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
    return {
      name: `${medal} ${index + 1}º Lugar`,
      value: `**${member.user.tag}**\nPontuação Final: **${score}**`,
      inline: false,
    };
  });

  const EMOJI_TROPHY = process.env.EMOJI_TROPHY || "🏆";
  const finalEmbed = createGameEmbed(
    `${EMOJI_TROPHY} Placar Final`,
    `O jogo de ${state.maxRounds} rodadas chegou ao fim!`,
  ).setFields(fields);

  await channel.send({ embeds: [finalEmbed] });
  state.totalScores = {};
}

module.exports = {
  calculateScores,
  displayFinalScores,
  postReviewEmbed,
  FINALIZE_BUTTON_ID,
  EDIT_BUTTON_ID,
  INVALIDATE_MODAL_ID,
  PLAYER_INPUT_ID,
  CATEGORY_INPUT_ID,
};
