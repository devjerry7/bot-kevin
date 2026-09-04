// commands/crime.js
const { EmbedBuilder } = require("discord.js");
const {
  getAccount,
  addMoney,
  removeMoney,
  hasItem,
  buyItem,
} = require("../services/economyManager");

// Configuração de Risco
const JAIL_TIME_MS = 5 * 60 * 1000; // 5 Minutos de timeout se falhar

module.exports = {
  handleCrime: async (message, command, args) => {
    // --- Lendo variáveis estéticas do .env ---
    const BANNER_URL = process.env.BANNER_URL;
    const GIF_POLICE = process.env.GIF_POLICE;
    const COLOR_BASE = process.env.COLOR_BASE
      ? parseInt(process.env.COLOR_BASE, 16)
      : 0x2f3136;
    const COLOR_SUCCESS = process.env.COLOR_SUCCESS
      ? parseInt(process.env.COLOR_SUCCESS, 16)
      : 0x00ff00;
    const COLOR_ERROR = process.env.COLOR_ERROR
      ? parseInt(process.env.COLOR_ERROR, 16)
      : 0xff0000;

    const EMOJI_SUCCESS = process.env.EMOJI_SUCCESS || "✅";
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_GUN = process.env.EMOJI_GUN || "🔫";
    const EMOJI_VEST = process.env.EMOJI_VEST || "🦺";
    const EMOJI_LOCK = process.env.EMOJI_LOCK || "🔐";

    // Configuração dos Itens (Construída com os emojis do env)
    const SHOP_ITEMS = {
      gun: {
        name: `${EMOJI_GUN} Oitão`,
        price: 5000,
        desc: "+20% chance de sucesso",
      },
      vest: {
        name: `${EMOJI_VEST} Colete`,
        price: 5000,
        desc: "-20% chance de falhar",
      },
      lock: {
        name: `${EMOJI_LOCK} Cadeado`,
        price: 2000,
        desc: "Protege o saldo 1 vez (quebra)",
      },
    };

    // Helper para Embeds Rápidos
    const createResponseEmbed = (
      title,
      description,
      color = COLOR_BASE,
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

    const userId = message.author.id;

    // --- k!loja (Ver itens) ---
    if (command === "loja") {
      const embed = new EmbedBuilder()
        .setTitle("🛒 Loja do Gueto")
        .setDescription("Compre itens para melhorar seus corres.")
        .setColor(COLOR_SUCCESS)
        .setImage(BANNER_URL);

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
              `${EMOJI_ERROR} Item não encontrado. Veja a loja.`,
              COLOR_ERROR,
            ),
          ],
        });
      }

      const [key, item] = itemEntry;
      const res = await buyItem(userId, item.price, key);

      if (res.success) {
        return message.channel.send({
          embeds: [
            createResponseEmbed(
              null,
              `${EMOJI_SUCCESS} Você comprou **${item.name}**!`,
              COLOR_SUCCESS,
            ),
          ],
        });
      }
      return message.channel.send({
        embeds: [
          createResponseEmbed(null, `${EMOJI_ERROR} ${res.msg}`, COLOR_ERROR),
        ],
      });
    }

    // --- k!roubar @user ---
    if (command === "roubar" || command === "rob") {
      const target = message.mentions.users.first();

      if (!target)
        return message.channel.send({
          embeds: [
            createResponseEmbed(
              null,
              `${EMOJI_ERROR} Mencione a vítima.`,
              COLOR_ERROR,
            ),
          ],
        });
      if (target.id === userId)
        return message.channel.send({
          embeds: [createResponseEmbed(null, "Vai se roubar?", COLOR_BASE)],
        });
      if (target.bot)
        return message.channel.send({
          embeds: [
            createResponseEmbed(null, "Não pode roubar robôs.", COLOR_BASE),
          ],
        });

      const attackerAcc = await getAccount(userId);
      const victimAcc = await getAccount(target.id);

      if (victimAcc.wallet < 100) {
        return message.channel.send({
          embeds: [
            createResponseEmbed(
              null,
              `${EMOJI_ERROR} Essa pessoa está DURA, nem vale a pena.`,
              COLOR_ERROR,
            ),
          ],
        });
      }

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

        await removeMoney(target.id, amount);
        await addMoney(userId, amount);

        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(`${EMOJI_GUN} Assalto Bem Sucedido!`)
              .setDescription(
                `**${message.author.username}** enquadrou **${target.username}** e levou **${amount} Kevins**!`,
              )
              .setColor(COLOR_SUCCESS)
              .setImage(BANNER_URL)
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
              .setColor(COLOR_ERROR)
              .setImage(GIF_POLICE)
              .setFooter({ text: `Chance: ${chance}% | Dado: ${roll}` }),
          ],
        });
      }
    }
  },
};
