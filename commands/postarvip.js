// commands/postarvip.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");

const handlePostVip = async (message) => {
  // Apenas Administradores podem postar o painel
  if (
    !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    return message.reply(
      `${EMOJI_ERROR} Apenas administradores podem postar o painel VIP.`,
    );
  }

  try {
    // --- Lendo variáveis do .env / config ---
    const COLOR_BASE = process.env.COLOR_BASE
      ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
      : 0x962dc0;

    const BANNER_VIP = process.env.BANNER_VIP;

    // Contato
    const DONO_1 = process.env.OWNER_1_ID;
    const DONO_2 = process.env.OWNER_2_ID;

    // Preços
    const PRICE_SELECT = process.env.PRICE_VIP_SELECT || "A definir";
    const PRICE_STREAM = process.env.PRICE_VIP_STREAM || "A definir";
    const PRICE_NIGHT = process.env.PRICE_VIP_NIGHT || "A definir";

    // Emojis atualizados do painel
    const EMOJI_TITLE = process.env.EMOJI_TITLE_VIP || "🎛️";
    const EMOJI_CART = process.env.EMOJI_CART || "🛒";
    const EMOJI_DOT = process.env.EMOJI_DOT || "•";
    const EMOJI_BOOST = process.env.EMOJI_BOOST || "🚀";
    const EMOJI_VIP_SELECT = process.env.EMOJI_VIP_SELECT || "💳";
    const EMOJI_VIP_STREAM = process.env.EMOJI_VIP_STREAM || "🎥";
    const EMOJI_VIP_NIGHT = process.env.EMOJI_VIP_NIGHT || "🌙";

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJI_TITLE} Cargos & Planos Vip ${EMOJI_TITLE}`)
      .setDescription(
        `**Quer ter vantagens exclusivas, se destacar no chat e ainda ajudar a nossa comunidade a crescer? Chegou a hora! Confira tudo o que preparamos para vocês.**\n\n` +
          `${EMOJI_CART} | **COMO COMPRAR:**\n` +
          `Para adquirir o seu VIP, entre em contato com <@${DONO_1}> e <@${DONO_2}>.\n\n` +
          `${EMOJI_BOOST} **LEVEL UP - BOOSTER**\n` +
          `${EMOJI_DOT} Cargo destacado no servidor;\n` +
          `${EMOJI_DOT} Permissão de enviar imagem;\n` +
          `${EMOJI_DOT} Sorteios exclusivos.\n` +
          `${EMOJI_DOT} Permissão de <#1545530073686347776>.\n\n` +
          `${EMOJI_VIP_SELECT} **VIP SELECT - ${PRICE_SELECT}**\n` +
          `${EMOJI_DOT} Cargo destacado no Servidor;\n` +
          `${EMOJI_DOT} Permissão de enviar imagem;\n` +
          `${EMOJI_DOT} Tag personalizada;\n` +
          `${EMOJI_DOT} Sorteios exclusivos;\n` +
          `${EMOJI_DOT} Permissão de <#1545530073686347776>.\n\n` +
          `${EMOJI_VIP_STREAM} **VIP STREAM - ${PRICE_STREAM}**\n` +
          `${EMOJI_DOT} Cargo destacado no servidor;\n` +
          `${EMOJI_DOT} Permissão de enviar imagem;\n` +
          `${EMOJI_DOT} Call privada + tag personalizada;\n` +
          `${EMOJI_DOT} Acesso liberado ao chat <#1535759130298421258>;\n` +
          `${EMOJI_DOT} Sorteios exclusivos;\n` +
          `${EMOJI_DOT} Vantagens no servidor. (<@&1537258569265717258>).\n\n` +
          `${EMOJI_VIP_NIGHT} **VIP NIGHT - ${PRICE_NIGHT}**\n` +
          `${EMOJI_DOT} Cargo destacado no servidor;\n` +
          `${EMOJI_DOT} Permissão de enviar imagem;\n` +
          `${EMOJI_DOT} Call privada + tag personalizada;\n` +
          `${EMOJI_DOT} Direito a <@&1535758383297073202>;\n` +
          `${EMOJI_DOT} Sorteios exclusivos;\n` +
          `${EMOJI_DOT} Vantagens no servidor. (<@&1542372640319213590>)\n` +
          `${EMOJI_DOT} Acesso liberado ao chat <#1535759130298421258>`,
      )
      .setColor(COLOR_BASE)
      .setImage(BANNER_VIP)
      .setFooter({
        text: "Todo valor arrecadado é revertido em melhorias para o servidor!",
        iconURL: message.guild.iconURL(),
      })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });

    if (message.deletable) await message.delete().catch(() => {});
  } catch (error) {
    console.error("[POSTVIP ERROR] Erro ao postar painel VIP:", error);
  }
};

module.exports = { handlePostVip };
