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
      .setTitle(`${EMOJI_DIAMOND} Vantagens & Apoiadores`)
      .setDescription(
        `Confira abaixo os benefícios de cada Tier no nosso servidor e escolha o seu!\n\n` +
          `${EMOJI_CART} **COMO COMPRAR:**\nPara adquirir o seu VIP, entre em contato com <@${DONO_1}> ou <@${DONO_2}>.`,
      )
      .setColor(COLOR_BASE)
      .setImage(BANNER_URL)
      .addFields(
        {
          name: `${EMOJI_BOOST} LEVEL UP - BOOSTER (Grátis via Boost)`,
          value:
            `${EMOJI_DOT} Cargo destacado no servidor\n` +
            `${EMOJI_DOT} Permissão de enviar imagem\n` +
            `${EMOJI_DOT} Sorteios exclusivos`,
          inline: false,
        },
        {
          name: `${EMOJI_VIP_SELECT} VIP SELECT - ${PRICE_SELECT}`,
          value:
            `${EMOJI_DOT} Cargo destacado no Servidor\n` +
            `${EMOJI_DOT} Permissão de enviar imagem\n` +
            `${EMOJI_DOT} Tag personalizada`,
          inline: false,
        },
        {
          name: `${EMOJI_VIP_STREAM} VIP STREAM - ${PRICE_STREAM}`,
          value:
            `${EMOJI_DOT} Cargo destacado no servidor\n` +
            `${EMOJI_DOT} Permissão de enviar imagem\n` +
            `${EMOJI_DOT} Call privada + tag personalizada\n` +
            `${EMOJI_DOT} Acesso liberado ao chat de divulgação\n` +
            `${EMOJI_DOT} Vantagens no servidor (permv4)`,
          inline: false,
        },
        {
          name: `${EMOJI_VIP_NIGHT} VIP NIGHT - ${PRICE_NIGHT}`,
          value:
            `${EMOJI_DOT} Cargo destacado no servidor\n` +
            `${EMOJI_DOT} Permissão de enviar imagem\n` +
            `${EMOJI_DOT} Call privada + tag personalizada\n` +
            `${EMOJI_DOT} Acesso liberado ao chat de divulgação\n` +
            `${EMOJI_DOT} Vantagens no servidor (permiog)\n` +
            `${EMOJI_DOT} Direito a 1 Primeira Dama\n` +
            `${EMOJI_DOT} Vantagens em eventos (se houver)`,
          inline: false,
        },
      )
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
