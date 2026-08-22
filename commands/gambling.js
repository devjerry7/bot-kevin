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

const HEADER_IMAGE = "LINK_DO_SEU_BANNER_NOVO_AQUI";
const COLOR_DIAMOND = 0x00e5ff;
const CURRENCY = "Kevins";

const formatTime = (ms) => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const createEcoEmbed = (title, desc, color = COLOR_DIAMOND) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(color)
    .setImage(HEADER_IMAGE)
    .setTimestamp();
};

module.exports = {
  handleEconomy: async (message, command, args) => {
    const userId = message.author.id;

    // --- k!atm / k!saldo ---
    if (["atm", "saldo", "carteira"].includes(command)) {
      const target = message.mentions.users.first() || message.author;
      const acc = await getAccount(target.id);

      const embed = createEcoEmbed("💳 Conta Bancária", `Titular: ${target}`)
        .addFields(
          {
            name: "💵 Carteira",
            value: `**${acc.wallet}** ${CURRENCY}`,
            inline: true,
          },
          {
            name: "🏦 Banco",
            value: `**${acc.bank || 0}** ${CURRENCY}`,
            inline: true,
          },
          {
            name: "💰 Patrimônio Total",
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
              "📅 Recompensa Diária",
              `Você recebeu **${res.amount} ${CURRENCY}**! Volte amanhã para resgatar mais.`,
              0x00ff00,
            ),
          ],
        });
      } else {
        return message.channel.send({
          embeds: [
            createEcoEmbed(
              "⏳ Calma lá!",
              `Você já resgatou sua recompensa diária. Volte em **${formatTime(res.remaining)}**.`,
              0xe74c3c,
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
              "💼 Expediente Concluído",
              `Você trabalhou como **${job}** e faturou **${res.amount} ${CURRENCY}**!`,
              0x00ff00,
            ),
          ],
        });
      } else {
        return message.channel.send({
          embeds: [
            createEcoEmbed(
              "⏳ Descanso Necessário",
              `Você está cansado. Volte ao trabalho em **${formatTime(res.remaining)}**.`,
              0xe74c3c,
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
        return message.reply("Uso correto: `k!pay @usuario <valor>`");
      }
      if (target.id === userId) {
        return message.reply(
          "Você não pode transferir dinheiro para si mesmo.",
        );
      }

      const res = await pay(userId, target.id, amount);
      if (res.success) {
        return message.channel.send({
          embeds: [
            createEcoEmbed(
              "💸 Transferência Realizada",
              `Você transferiu **${amount} ${CURRENCY}** com sucesso para ${target}.`,
              0x00ff00,
            ),
          ],
        });
      } else {
        return message.channel.send({
          embeds: [
            createEcoEmbed(
              "❌ Falha na Transferência",
              res.msg || "Erro ao processar o pagamento.",
              0xe74c3c,
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
          createEcoEmbed("🏆 Ranking dos Mais Ricos", topString, COLOR_DIAMOND),
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

      const action = args[0];
      const target = message.mentions.users.first();
      const amount = parseInt(args[2], 10);

      if (
        !["add", "rem"].includes(action) ||
        !target ||
        isNaN(amount) ||
        amount <= 0
      ) {
        return message.reply("Uso correto: `k!eco add/rem @user <valor>`");
      }

      if (action === "add") {
        await addMoney(target.id, amount);
        return message.channel.send(
          `✅ Foram adicionados **${amount} ${CURRENCY}** para ${target}.`,
        );
      }
      if (action === "rem") {
        await removeMoney(target.id, amount);
        return message.channel.send(
          `🗑️ Foram removidos **${amount} ${CURRENCY}** de ${target}.`,
        );
      }
    }
  },
};
