// commands/gambling.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Collection,
} = require("discord.js");
const { getAccount, removeMoney } = require("../services/economyManager");

// Cache para armazenar os jogos ativos em andamento
const minesCache = new Collection();

module.exports = {
  minesCache,

  handleGambling: async (message, command, args) => {
    // Só responde se o comando for "mines"
    if (command !== "mines") return;

    // --- Lendo variáveis estéticas do .env ---
    const BANNER_URL = process.env.BANNER_URL;
    const PREFIX = process.env.PREFIX || "mc!";
    const CURRENCY = process.env.CURRENCY_NAME || "Kevins";

    // Cores
    const COLOR_BASE = process.env.COLOR_BASE
      ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
      : 0x00e5ff;

    // Emojis
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_DIAMOND = process.env.EMOJI_DIAMOND || "💎";
    const EMOJI_MONEY = process.env.EMOJI_MONEY || "💰";
    const EMOJI_QUESTION = process.env.EMOJI_QUESTION || "❓";

    const userId = message.author.id;

    // --- 1. Verificações Iniciais (Usando channel.send para evitar crash de mensagem deletada) ---
    if (minesCache.has(userId)) {
      return message.channel.send(
        `${EMOJI_ERROR} Você já tem um jogo em andamento! Termine-o antes de iniciar outro.`,
      );
    }

    const betAmount = parseInt(args[0], 10);
    const bombsCount = parseInt(args[1], 10) || 3; // Padrão: 3 bombas

    if (isNaN(betAmount) || betAmount < 10) {
      return message.channel.send(
        `${EMOJI_ERROR} Uso correto: \`${PREFIX}mines <valor_aposta> [qnt_bombas]\`\nAposta mínima: 10 ${CURRENCY}.`,
      );
    }

    if (bombsCount < 1 || bombsCount > 15) {
      return message.channel.send(
        `${EMOJI_ERROR} A quantidade de bombas deve ser entre 1 e 15 (grade 4x4 = 16 campos).`,
      );
    }

    const acc = await getAccount(userId);

    if (acc.wallet < betAmount) {
      return message.channel.send(
        `${EMOJI_ERROR} Saldo insuficiente! Você tem **${acc.wallet}** na carteira.`,
      );
    }

    // --- 2. Cobrança e Preparação do Jogo ---
    await removeMoney(userId, betAmount);

    // Gera o campo 4x4 (16 campos)
    const totalTiles = 16;
    let board = Array(totalTiles).fill(0); // 0 = seguro (diamante)

    // Sorteia as bombas
    let bombsPlaced = 0;
    while (bombsPlaced < bombsCount) {
      const randIndex = Math.floor(Math.random() * totalTiles);
      if (board[randIndex] === 0) {
        board[randIndex] = 1; // 1 = bomba
        bombsPlaced++;
      }
    }

    const gameData = {
      bet: betAmount,
      bombsCount,
      board,
      revealed: [], // Posições que o jogador já abriu
      multiplier: 1.0,
    };

    minesCache.set(userId, gameData);

    // --- 3. Construção do Embed e Grade Inicial ---
    const embed = new EmbedBuilder()
      .setTitle(`${EMOJI_DIAMOND} CAMPO MINADO`)
      .setDescription(
        `Aposta: **${betAmount}** ${CURRENCY}\nMinas: **${bombsCount}**\nMultiplicador: **1.00x**\nLucro Atual: **0**`,
      )
      .setColor(COLOR_BASE)
      .setImage(BANNER_URL)
      .setFooter({ text: "Boa sorte!" });

    const rows = [];
    for (let i = 0; i < 4; i++) {
      const row = new ActionRowBuilder();
      for (let j = 0; j < 4; j++) {
        const index = i * 4 + j;
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`mines_${index}`)
            .setEmoji(EMOJI_QUESTION)
            .setStyle(ButtonStyle.Secondary),
        );
      }
      rows.push(row);
    }

    // Botão de Cashout
    const cashoutRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("mines_cashout")
        .setEmoji(EMOJI_MONEY)
        .setLabel("SAIR E PEGAR O DINHEIRO")
        .setStyle(ButtonStyle.Success),
    );
    rows.push(cashoutRow);

    await message.channel.send({ embeds: [embed], components: rows });
  },
};
