// handlers/gamblingHandler.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { minesCache } = require("../commands/gambling");
const { addMoney } = require("../services/economyManager");

module.exports = async (interaction) => {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("mines_")) return false;

  // --- Lendo variáveis e emojis direto do seu .env ---
  const BANNER_URL = process.env.BANNER_GAMBLE || process.env.BANNER_URL;
  const CURRENCY_NAME = process.env.CURRENCY_NAME || "Kevins";
  const COLOR_DIAMOND = process.env.COLOR_DIAMOND
    ? parseInt(process.env.COLOR_DIAMOND.replace("#", ""), 16)
    : 0x00e5ff;
  const COLOR_SUCCESS = process.env.COLOR_SUCCESS
    ? parseInt(process.env.COLOR_SUCCESS.replace("#", ""), 16)
    : 0x00ff00;
  const COLOR_ERROR = process.env.COLOR_ERROR
    ? parseInt(process.env.COLOR_ERROR.replace("#", ""), 16)
    : 0xff0000;

  const EMOJI_DIAMOND =
    process.env.EMOJI_DIAMOND || "<:diamond:1536498079308579009>";
  const EMOJI_MONEY =
    process.env.EMOJI_MONEY || "<:Dinheiro:1535775870168469624>";
  const EMOJI_BOMB =
    process.env.EMOJI_BOMB || "<:bombaemoji:1545469098748547234>";

  const userId = interaction.user.id;
  const game = minesCache.get(userId);

  if (!game) {
    return interaction.reply({
      content: "❌ Jogo expirado ou não pertence a você.",
      ephemeral: true,
    });
  }

  // --- CASHOUT ---
  if (interaction.customId === "mines_cashout") {
    if (game.revealed.length === 0) {
      return interaction.reply({
        content: "Abra pelo menos um campo antes de sacar!",
        ephemeral: true,
      });
    }

    const winAmount = Math.floor(game.bet * game.multiplier);
    await addMoney(userId, winAmount);
    minesCache.delete(userId);

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setTitle(`${EMOJI_MONEY} CASHOUT!`)
      .setColor(COLOR_SUCCESS)
      .setDescription(
        `Você parou e garantiu **${winAmount} ${CURRENCY_NAME}**! (x${game.multiplier.toFixed(2)})`,
      );

    if (BANNER_URL) embed.setImage(BANNER_URL);

    const newRows = revealBoard(game.board, game.revealed, true);
    return interaction.update({ embeds: [embed], components: newRows });
  }

  // --- JOGADA ---
  const index = parseInt(interaction.customId.split("_")[1]);
  if (game.revealed.includes(index)) return interaction.deferUpdate();

  // 1. MINA (PERDEU)
  if (game.board[index] === 1) {
    minesCache.delete(userId);

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setTitle(`${EMOJI_BOMB} BOOM!`)
      .setColor(COLOR_ERROR)
      .setDescription(
        `Você pisou em uma mina e perdeu **${game.bet} ${CURRENCY_NAME}**.`,
      );

    if (BANNER_URL) embed.setImage(BANNER_URL);

    const newRows = revealBoard(game.board, game.revealed, true, index);
    return interaction.update({ embeds: [embed], components: newRows });
  }

  // 2. DIAMANTE (CONTINUA)
  game.revealed.push(index);

  const totalTiles = 16;
  const safeTiles = totalTiles - game.bombsCount;
  const remainingSafe = safeTiles - (game.revealed.length - 1);

  const nextMulti =
    game.multiplier * (1 + (game.bombsCount / remainingSafe) * 0.5);
  game.multiplier = nextMulti;

  const currentWin = Math.floor(game.bet * game.multiplier);

  // Vitória Automática
  if (game.revealed.length === safeTiles) {
    await addMoney(userId, currentWin);
    minesCache.delete(userId);

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setTitle(`${EMOJI_DIAMOND} VITÓRIA PERFEITA!`)
      .setColor(COLOR_SUCCESS)
      .setDescription(
        `Você achou todos os diamantes!\nGanho: **${currentWin} ${CURRENCY_NAME}**`,
      );

    if (BANNER_URL) embed.setImage(BANNER_URL);

    const newRows = revealBoard(game.board, game.revealed, true);
    return interaction.update({ embeds: [embed], components: newRows });
  }

  // Atualiza Embed em Andamento
  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setDescription(
      `Aposta: **${game.bet}**\nMinas: **${game.bombsCount}**\nMultiplicador: **${game.multiplier.toFixed(2)}x**\nLucro Atual: **${currentWin}**`,
    )
    .setColor(COLOR_DIAMOND);

  const newRows = revealBoard(game.board, game.revealed, false);
  return interaction.update({ embeds: [embed], components: newRows });
};

// Função de Desenho (4x4)
function revealBoard(board, revealed, gameOver, explodedIndex = -1) {
  const EMOJI_DIAMOND =
    process.env.EMOJI_DIAMOND || "<:diamond:1536498079308579009>";
  const EMOJI_BOMB =
    process.env.EMOJI_BOMB || "<:bombaemoji:1545469098748547234>";
  const EMOJI_CLOUD =
    process.env.EMOJI_CLOUD || "<:nuvememoji:1545469423408652379>";
  const EMOJI_QUESTION =
    process.env.EMOJI_QUESTION || "<:interrogaoemoji:1545468689405583370>";
  const EMOJI_MONEY =
    process.env.EMOJI_MONEY || "<:Dinheiro:1535775870168469624>";

  const rows = [];
  for (let i = 0; i < 4; i++) {
    const row = new ActionRowBuilder();
    for (let j = 0; j < 4; j++) {
      const index = i * 4 + j;
      const btn = new ButtonBuilder()
        .setCustomId(`mines_${index}`)
        .setStyle(ButtonStyle.Secondary);

      if (revealed.includes(index)) {
        btn
          .setEmoji(EMOJI_DIAMOND)
          .setStyle(ButtonStyle.Success)
          .setDisabled(true);
      } else if (gameOver) {
        btn.setDisabled(true);
        if (board[index] === 1) {
          btn.setEmoji(EMOJI_BOMB);
          if (index === explodedIndex) btn.setStyle(ButtonStyle.Danger);
        } else {
          btn.setEmoji(EMOJI_CLOUD);
        }
      } else {
        btn.setEmoji(EMOJI_QUESTION);
      }
      row.addComponents(btn);
    }
    rows.push(row);
  }

  if (!gameOver) {
    const cashoutRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("mines_cashout")
        .setLabel("SAIR E PEGAR O DINHEIRO")
        .setEmoji(EMOJI_MONEY)
        .setStyle(ButtonStyle.Success),
    );
    rows.push(cashoutRow);
  }

  return rows;
}
