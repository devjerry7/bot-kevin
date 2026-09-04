// commands/economy.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const {
  getAccount,
  addMoney,
  removeMoney,
  pay,
  claimDaily,
  work,
  getLeaderboard,
} = require("../services/economyManager");

// Helper de Tempo
const formatTime = (ms) => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

module.exports = {
  handleEconomy: async (message, command, args) => {
    // --- Lendo variáveis do .env ---
    const BANNER_URL = process.env.BANNER_URL;
    const PREFIX = process.env.PREFIX || "mc!";
    const CURRENCY = process.env.CURRENCY_NAME || "Kevins";

    // Cores
    const COLOR_BASE = process.env.COLOR_BASE
      ? parseInt(process.env.COLOR_BASE, 16)
      : 0x00e5ff;
    const COLOR_SUCCESS = process.env.COLOR_SUCCESS
      ? parseInt(process.env.COLOR_SUCCESS, 16)
      : 0x00ff00;
    const COLOR_ERROR = process.env.COLOR_ERROR
      ? parseInt(process.env.COLOR_ERROR, 16)
      : 0xff0000;

    // Emojis Base
    const EMOJI_SUCCESS = process.env.EMOJI_SUCCESS || "✅";
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_WAIT = process.env.EMOJI_WAIT || "⏳";
    const EMOJI_MONEY = process.env.EMOJI_MONEY || "💰";

    // Emojis Específicos
    const EMOJI_BANK = process.env.EMOJI_BANK || "💳";
    const EMOJI_WALLET = process.env.EMOJI_WALLET || "💵";
    const EMOJI_BANK_BUILDING = process.env.EMOJI_BANK_BUILDING || "🏦";
    const EMOJI_DAILY = process.env.EMOJI_DAILY || "📅";
    const EMOJI_WORK = process.env.EMOJI_WORK || "💼";
    const EMOJI_PAY = process.env.EMOJI_PAY || "💸";
    const EMOJI_RANK = process.env.EMOJI_RANK || "🏆";
    const EMOJI_TRASH = process.env.EMOJI_TRASH || "🗑️";

    const userId = message.author.id;

    const createEcoEmbed = (title, desc, color = COLOR_BASE) => {
      return new EmbedBuilder()
        .setTitle(title)
        .setDescription(desc)
        .setColor(color)
        .setImage(BANNER_URL)
        .setTimestamp();
    };

    // --- k!atm / k!saldo ---
    if (["atm", "saldo", "carteira"].includes(command)) {
      const target = message.mentions.users.first() || message.author;
      const acc = await getAccount(target.id);

      const embed = createEcoEmbed(
        `${EMOJI_BANK} Conta Bancária`,
        `Titular: ${target}`,
      )
        .addFields(
          {
            name: `${EMOJI_WALLET} Carteira`,
            value: `**${acc.wallet}** ${CURRENCY}`,
            inline: true,
          },
          {
            name: `${EMOJI_BANK_BUILDING} Banco`,
            value: `**${acc.bank || 0}** ${CURRENCY}`,
            inline: true,
          },
          {
            name: `${EMOJI_MONEY} Patrimônio Total`,
            value: `**${acc.wallet + (acc.bank || 0)}** ${CURRENCY}`,
            inline: false,
          },
        )
        .setThumbnail(target.displayAvatarURL());

      return message.channel.send({ embeds: [embed] });
    }

    // --- k!daily ---
    if (command === "daily") {
      const res = await claimDaily(userId);
      if (res.success) {
        return message.channel.send({
          embeds: [
            createEcoEmbed(
              `${EMOJI_DAILY} Recompensa Diária`,
              `Você recebeu **${res.amount} ${CURRENCY}**! Volte amanhã para resgatar mais.`,
              COLOR_SUCCESS,
            ),
          ],
        });
      } else {
        return message.channel.send({
          embeds: [
            createEcoEmbed(
              `${EMOJI_WAIT} Calma lá!`,
              `Você já resgatou sua recompensa diária. Volte em **${formatTime(res.remaining)}**.`,
              COLOR_ERROR,
            ),
          ],
        });
      }
    }

    // --- k!work ---
    if (["work", "trabalhar"].includes(command)) {
      const res = await work(userId);
      if (res.success) {
        const jobs = [
          "Desenvolvedor",
          "Designer Gráfico",
          "Moderador do Discord",
          "Streamer",
          "Criador de Conteúdo",
          "Investidor",
        ];
        const job = jobs[Math.floor(Math.random() * jobs.length)];
        return message.channel.send({
          embeds: [
            createEcoEmbed(
              `${EMOJI_WORK} Expediente Concluído`,
              `Você trabalhou como **${job}** e faturou **${res.amount} ${CURRENCY}**!`,
              COLOR_SUCCESS,
            ),
          ],
        });
      } else {
        return message.channel.send({
          embeds: [
            createEcoEmbed(
              `${EMOJI_WAIT} Descanso Necessário`,
              `Você está cansado. Volte ao trabalho em **${formatTime(res.remaining)}**.`,
              COLOR_ERROR,
            ),
          ],
        });
      }
    }

    // --- k!pay @user <valor> ---
    if (["pay", "pagar"].includes(command)) {
      const target = message.mentions.users.first();
      const amount = parseInt(args[1], 10);

      if (!target || isNaN(amount) || amount <= 0) {
        return message.reply(
          `${EMOJI_ERROR} Uso correto: \`${PREFIX}pay @usuario <valor>\``,
        );
      }
      if (target.id === userId) {
        return message.reply(
          `${EMOJI_ERROR} Você não pode transferir dinheiro para si mesmo.`,
        );
      }

      const res = await pay(userId, target.id, amount);
      if (res.success) {
        return message.channel.send({
          embeds: [
            createEcoEmbed(
              `${EMOJI_PAY} Transferência Realizada`,
              `Você transferiu **${amount} ${CURRENCY}** com sucesso para ${target}.`,
              COLOR_SUCCESS,
            ),
          ],
        });
      } else {
        return message.channel.send({
          embeds: [
            createEcoEmbed(
              `${EMOJI_ERROR} Falha na Transferência`,
              res.msg || "Erro ao processar o pagamento.",
              COLOR_ERROR,
            ),
          ],
        });
      }
    }

    // --- k!rank / k!leaderboard ---
    if (["rank", "leaderboard", "top"].includes(command)) {
      const list = await getLeaderboard();
      const topString =
        list
          .map(
            (acc, i) =>
              `**${i + 1}.** <@${acc.userId}> — **${acc.wallet}** ${CURRENCY}`,
          )
          .join("\n") || "Nenhum membro registrado no ranking ainda.";

      return message.channel.send({
        embeds: [
          createEcoEmbed(
            `${EMOJI_RANK} Ranking dos Mais Ricos`,
            topString,
            COLOR_BASE,
          ),
        ],
      });
    }

    // --- ADMIN: k!eco add/rem @user <valor> ---
    if (command === "eco") {
      if (
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return;
      }

      const action = args[0]; // add / rem
      const target = message.mentions.users.first();
      const amount = parseInt(args[2], 10);

      if (
        !["add", "rem"].includes(action) ||
        !target ||
        isNaN(amount) ||
        amount <= 0
      ) {
        return message.reply(
          `${EMOJI_ERROR} Uso correto: \`${PREFIX}eco add/rem @user <valor>\``,
        );
      }

      if (action === "add") {
        await addMoney(target.id, amount);
        return message.channel.send(
          `${EMOJI_SUCCESS} Foram adicionados **${amount} ${CURRENCY}** para ${target}.`,
        );
      }
      if (action === "rem") {
        await removeMoney(target.id, amount);
        return message.channel.send(
          `${EMOJI_TRASH} Foram removidos **${amount} ${CURRENCY}** de ${target}.`,
        );
      }
    }
  },
};
