// commands/modBasic.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { isPanela } = require("../protectionManager");

module.exports = {
  handleBan: async (message, args) => {
    // Puxando emojis dinâmicos do env
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_SHIELD = process.env.EMOJI_SHIELD || "🛡️";
    const EMOJI_BAN = process.env.EMOJI_BAN || "🔨";

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.channel.send(
        `${EMOJI_ERROR} Você não tem permissão para banir membros.`,
      );

    const target = message.mentions.members.first();
    const reason = args.slice(1).join(" ") || "Nenhum motivo especificado";

    if (!target)
      return message.channel.send(`${EMOJI_ERROR} Mencione alguém para banir.`);

    if (target.id === message.author.id)
      return message.channel.send(`${EMOJI_ERROR} Você não pode se banir.`);

    // --- CHECAGEM DA PANELA (IMUNIDADE) ---
    const protectedUser = await isPanela(target.id);

    if (protectedUser) {
      return message.channel.send(
        `${EMOJI_SHIELD} **BLOQUEADO:** O usuário **${target.user.tag}** está na Panela (Imunidade Anti-Ban).`,
      );
    }
    // -------------------------------------------

    if (!target.bannable)
      return message.channel.send(
        `${EMOJI_ERROR} Não consigo banir este usuário (cargo superior ou igual ao meu).`,
      );

    await target.ban({ reason: `Banido por ${message.author.tag}: ${reason}` });
    message.channel.send(
      `${EMOJI_BAN} **${target.user.tag}** foi banido. Motivo: ${reason}`,
    );
  },

  handleUnban: async (message, args) => {
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_SUCCESS = process.env.EMOJI_SUCCESS || "✅";

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.channel.send(
        `${EMOJI_ERROR} Sem permissão para desbanir.`,
      );

    const userId = args[0];

    if (!userId)
      return message.channel.send(
        `${EMOJI_ERROR} ID do usuário necessário para desbanir.`,
      );

    try {
      await message.guild.members.unban(userId);
      message.channel.send(`${EMOJI_SUCCESS} Usuário desbanido com sucesso.`);
    } catch (e) {
      message.channel.send(
        `${EMOJI_ERROR} Erro ao desbanir. Verifique se o ID está correto ou se o usuário realmente está banido.`,
      );
    }
  },

  handleKick: async (message, args) => {
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_KICK = process.env.EMOJI_KICK || "🦶";

    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return message.channel.send(
        `${EMOJI_ERROR} Sem permissão para expulsar membros.`,
      );

    const target = message.mentions.members.first();

    if (!target)
      return message.channel.send(
        `${EMOJI_ERROR} Mencione alguém para expulsar.`,
      );

    if (!target.kickable)
      return message.channel.send(
        `${EMOJI_ERROR} Não consigo expulsar este usuário (cargo superior ou igual ao meu).`,
      );

    await target.kick(`Expulso por ${message.author.tag}`);
    message.channel.send(`${EMOJI_KICK} **${target.user.tag}** foi expulso.`);
  },
};
