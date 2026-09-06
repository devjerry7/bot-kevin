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
    // --- Lendo variáveis do .env ---
    const COLOR_BASE = process.env.COLOR_BASE
      ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
      : 0x00e5ff;
    const BANNER_URL = process.env.BANNER_VIP;

    // Contato
    const DONO_1 = process.env.OWNER_1_ID;
    const DONO_2 = process.env.OWNER_2_ID;

    // Preços
    const PRICE_SELECT = process.env.PRICE_VIP_SELECT || "A definir";
    const PRICE_STREAM = process.env.PRICE_VIP_STREAM || "A definir";
    const PRICE_NIGHT = process.env.PRICE_VIP_NIGHT || "A definir";

    // Emojis
    const EMOJI_DIAMOND = process.env.EMOJI_DIAMOND || "💎";
    const EMOJI_CART = process.env.EMOJI_CART || "🛒";
    const EMOJI_DOT = process.env.EMOJI_DOT || "•";
    const EMOJI_BOOST = process.env.EMOJI_BOOST || "🚀";
    const EMOJI_VIP_SELECT = process.env.EMOJI_VIP_SELECT || "💳";
    const EMOJI_VIP_STREAM = process.env.EMOJI_VIP_STREAM || "🎥";
    const EMOJI_VIP_NIGHT = process.env.EMOJI_VIP_NIGHT || "🌙";

    const embed = new EmbedBuilder()
      .setTitle(`Vantagens e Apoiadores`)
      .setDescription(
        `Confira os benefícios de cada tier no nosso servidor e escolha o seu!\n\n` +
          `${EMOJI_CART} **COMO COMPRAR:**\n` +
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
          `${EMOJI_VIP_STREAM} **VIP STREAM - EXCLUSIVO PARA INFLUENCERS**\n` +
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
          `${EMOJI_DOT} Acesso liberado ao chat <#1535759130298421258>;\n` +
          `${EMOJI_DOT} Sorteios exclusivos;\n` +
          `${EMOJI_DOT} Vantagens no servidor. (<@&1542372640319213590>)\n` +
          `${EMOJI_DOT} Direito a <@&1535758383297073202>`,
      )
      .setColor(COLOR_BASE)
      .setFooter({
        text: "Ao adquirir um VIP, você ajuda a manter o servidor ativo e com novidades!",
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
