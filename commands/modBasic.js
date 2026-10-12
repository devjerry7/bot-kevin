// commands/modBasic.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { isPanela } = require("../protectionManager");

module.exports = {
  handleBan: async (message, args) => {
    // Puxando emojis dinâmicos do env
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_SHIELD = process.env.EMOJI_SHIELD || "🛡️";
    const EMOJI_BAN = process.env.EMOJI_BAN || "🔨";

    // Whitelist de Segurança
    const whitelistEnv = process.env.WHITELIST_IDS || "";
    const WHITELIST_IDS = whitelistEnv
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    // Checagem de permissão básica
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.channel.send(
        `${EMOJI_ERROR} Você não tem permissão para banir membros.`,
      );
    }

    // Aceita Menção ou ID numérico direto
    const targetArg = args[0];
    if (!targetArg) {
      return message.channel.send(
        `${EMOJI_ERROR} Mencione alguém ou informe o ID para banir.`,
      );
    }

    const targetId = targetArg.replace(/<@!?(\d+)>/, "$1");
    const targetMember = await message.guild.members
      .fetch(targetId)
      .catch(() => null);
    const reason = args.slice(1).join(" ") || "Nenhum motivo especificado";

    if (targetId === message.author.id) {
      return message.channel.send(`${EMOJI_ERROR} Você não pode se banir.`);
    }

    // --- PROTEÇÃO 1: WHITELIST IMUNIDADE ABSOLUTA ---
    if (WHITELIST_IDS.includes(targetId)) {
      return message.channel.send(
        `${EMOJI_SHIELD} **BLOQUEADO:** O usuário é um **Dono / Whitelist Oficial** e não pode ser banido!`,
      );
    }

    // --- PROTEÇÃO 2: CHECAGEM DA PANELA (IMUNIDADE ANTI-BAN) ---
    const protectedUser = await isPanela(targetId);
    if (protectedUser) {
      return message.channel.send(
        `${EMOJI_SHIELD} **BLOQUEADO:** O usuário está na **Panela** (Imunidade Anti-Ban).`,
      );
    }

    // Se o membro estiver no servidor, verifica a hierarquia do bot
    if (targetMember && !targetMember.bannable) {
      return message.channel.send(
        `${EMOJI_ERROR} Não consigo banir este usuário (cargo superior ou igual ao meu).`,
      );
    }

    try {
      await message.guild.members.ban(targetId, {
        reason: `Banido por ${message.author.tag}: ${reason}`,
      });

      const userTag = targetMember ? targetMember.user.tag : targetId;
      message.channel.send(
        `${EMOJI_BAN} **${userTag}** foi banido. Motivo: ${reason}`,
      );
    } catch (err) {
      console.error("[MOD BASIC BAN ERROR]", err);
      message.channel.send(
        `${EMOJI_ERROR} Erro ao tentar banir o ID informado.`,
      );
    }
  },

  handleUnban: async (message, args) => {
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_SUCCESS = process.env.EMOJI_SUCCESS || "✅";

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.channel.send(
        `${EMOJI_ERROR} Sem permissão para desbanir.`,
      );
    }

    const userId = args[0]?.replace(/<@!?(\d+)>/, "$1");

    if (!userId) {
      return message.channel.send(
        `${EMOJI_ERROR} ID do usuário necessário para desbanir.`,
      );
    }

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
    const EMOJI_SHIELD = process.env.EMOJI_SHIELD || "🛡️";
    const EMOJI_KICK = process.env.EMOJI_KICK || "🦶";

    // Whitelist de Segurança
    const whitelistEnv = process.env.WHITELIST_IDS || "";
    const WHITELIST_IDS = whitelistEnv
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (
      !message.member.permissions.has(PermissionsBitField.Flags.KickMembers)
    ) {
      return message.channel.send(
        `${EMOJI_ERROR} Sem permissão para expulsar membros.`,
      );
    }

    const targetArg = args[0];
    if (!targetArg) {
      return message.channel.send(
        `${EMOJI_ERROR} Mencione alguém ou informe o ID para expulsar.`,
      );
    }

    const targetId = targetArg.replace(/<@!?(\d+)>/, "$1");
    const targetMember = await message.guild.members
      .fetch(targetId)
      .catch(() => null);

    if (!targetMember) {
      return message.channel.send(
        `${EMOJI_ERROR} Membro não encontrado no servidor.`,
      );
    }

    if (targetId === message.author.id) {
      return message.channel.send(`${EMOJI_ERROR} Você não pode se expulsar.`);
    }

    // --- PROTEÇÃO 1: WHITELIST IMUNIDADE ABSOLUTA ---
    if (WHITELIST_IDS.includes(targetId)) {
      return message.channel.send(
        `${EMOJI_SHIELD} **BLOQUEADO:** O usuário é um **Dono / Whitelist Oficial** e não pode ser expulso!`,
      );
    }

    // --- PROTEÇÃO 2: CHECAGEM DA PANELA (IMUNIDADE ANTI-KICK) ---
    const protectedUser = await isPanela(targetId);
    if (protectedUser) {
      return message.channel.send(
        `${EMOJI_SHIELD} **BLOQUEADO:** O usuário está na **Panela** (Imunidade Anti-Kick).`,
      );
    }

    if (!targetMember.kickable) {
      return message.channel.send(
        `${EMOJI_ERROR} Não consigo expulsar este usuário (cargo superior ou igual ao meu).`,
      );
    }

    await targetMember.kick(`Expulso por ${message.author.tag}`);
    message.channel.send(
      `${EMOJI_KICK} **${targetMember.user.tag}** foi expulso.`,
    );
  },
};
