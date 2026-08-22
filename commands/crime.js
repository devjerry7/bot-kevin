// commands/crime.js
const { EmbedBuilder } = require("discord.js");
// Caminho atualizado para a pasta services V2!
const {
  getAccount,
  addMoney,
  removeMoney,
  hasItem,
  buyItem,
} = require("../services/economyManager");

// ⚠️ ATENÇÃO: COLOQUE O LINK DO SEU BANNER NOVO AQUI ⚠️
const HEADER_IMAGE = "LINK_DO_SEU_BANNER_NOVO_AQUI";
const COLOR_NEUTRAL = 0x2f3136;

// Configuração dos Itens (Preços e IDs)
const SHOP_ITEMS = {
  gun: {
    name: "🔫 Oitão", // Emoji padrão
    price: 5000,
    desc: "+20% chance de sucesso",
  },
  vest: {
    name: "🦺 Colete", // Emoji padrão
    price: 5000,
    desc: "-20% chance de falhar",
  },
  lock: {
    name: "🔐 Cadeado",
    price: 2000,
    desc: "Protege o saldo 1 vez (quebra)",
  },
};

// Configuração de Risco
const JAIL_TIME_MS = 5 * 60 * 1000; // 5 Minutos de timeout se falhar

// Helper para Embeds Rápidos
const createResponseEmbed = (
  title,
  description,
  color = COLOR_NEUTRAL,
  image = null,
) => {
  const embed = new EmbedBuilder()
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
  if (title) embed.setTitle(title);
  if (image) embed.setImage(image);
  return embed;
};

module.exports = {
  SHOP_ITEMS,

  handleCrime: async (message, command, args) => {
    const userId = message.author.id;
    // O guildId foi removido pois a V2 é single-server!

    // --- k!loja (Ver itens) ---
    if (command === "loja") {
      const embed = new EmbedBuilder()
        .setTitle("🛒 Loja do Gueto")
        .setDescription("Compre itens para melhorar seus corres.")
        .setColor(0x00ff00)
        .setImage(HEADER_IMAGE);

      for (const [id, item] of Object.entries(SHOP_ITEMS)) {
        embed.addFields({
          name: `${item.name} — ${item.price} Kevins`,
          value: item.desc,
        });
      }
      return message.channel.send({ embeds: [embed] });
    }

    // --- k!comprar <item> ---
    if (command === "comprar") {
      const itemId = args[0]?.toLowerCase();
      const itemEntry = Object.entries(SHOP_ITEMS).find(
        ([key, val]) =>
          key === itemId || val.name.toLowerCase().includes(itemId),
      );

      if (!itemEntry) {
        return message.channel.send({
          embeds: [
            createResponseEmbed(
              null,
              "❌ Item não encontrado. Veja a loja.",
              0xff0000,
            ),
          ],
        });
      }

      const [key, item] = itemEntry;

      // Chama buyItem da V2 (apenas userId)
      const res = await buyItem(userId, item.price, key);

      if (res.success) {
        return message.channel.send({
          embeds: [
            createResponseEmbed(
              null,
              `✅ Você comprou **${item.name}**!`,
              0x00ff00,
            ),
          ],
        });
      }
      return message.channel.send({
        embeds: [createResponseEmbed(null, `❌ ${res.msg}`, 0xff0000)],
      });
    }

    // --- k!roubar @user ---
    if (command === "roubar" || command === "rob") {
      const target = message.mentions.users.first();

      if (!target)
        return message.channel.send({
          embeds: [createResponseEmbed(null, "❌ Mencione a vítima.")],
        });
      if (target.id === userId)
        return message.channel.send({
          embeds: [createResponseEmbed(null, "Vai se roubar?")],
        });
      if (target.bot)
        return message.channel.send({
          embeds: [createResponseEmbed(null, "Não pode roubar robôs.")],
        });

      // Puxa as contas na V2 (apenas userId)
      const attackerAcc = await getAccount(userId);
      const victimAcc = await getAccount(target.id);

      if (victimAcc.wallet < 100) {
        return message.channel.send({
          embeds: [
            createResponseEmbed(
              null,
              "❌ Essa pessoa está DURA, nem vale a pena.",
              0xff0000,
            ),
          ],
        });
      }

      // Verifica Inventários na V2 (apenas userId)
      const hasGun = await hasItem(userId, "gun");
      const hasVest = await hasItem(target.id, "vest");

      // Cálculo da Chance (Base 40%)
      let chance = 40;
      if (hasGun) chance += 20;
      if (hasVest) chance -= 20;

      const roll = Math.floor(Math.random() * 100) + 1;

      // SUCESSO
      if (roll <= chance) {
        const percent = Math.random() * (0.4 - 0.1) + 0.1;
        const amount = Math.floor(victimAcc.wallet * percent);

        // V2 (apenas userId)
        await removeMoney(target.id, amount);
        await addMoney(userId, amount);

        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("🔫 Assalto Bem Sucedido!")
              .setDescription(
                `**${message.author.username}** enquadrou **${target.username}** e levou **${amount} Kevins**!`,
              )
              .setColor(0x00ff00)
              .setImage(HEADER_IMAGE)
              .setFooter({ text: `Chance: ${chance}% | Dado: ${roll}` }),
          ],
        });
      }

      // FRACASSO (TIMEOUT AUTOMÁTICO)
      else {
        const member = message.member;
        if (member.moderatable) {
          await member.timeout(
            JAIL_TIME_MS,
            "Preso em flagrante tentando roubar.",
          );
        }

        const fine = 500;
        await removeMoney(userId, fine);

        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("🚔 POLÍCIA CHEGOU!")
              .setDescription(
                `**${message.author.username}** tentou roubar, falhou e foi preso!\n\n**Pena:** 5 Minutos de Timeout + Multa de ${fine} Kevins.`,
              )
              .setColor(0xff0000)
              .setImage(
                "https://i.pinimg.com/originals/ea/0c/cd/ea0ccd11f06cba1bfe842f1c47e7242d.gif",
              ) // Gif de sirene
              .setFooter({ text: `Chance: ${chance}% | Dado: ${roll}` }),
          ],
        });
      }
    }
  },
};
