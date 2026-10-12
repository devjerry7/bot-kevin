// commands/timeMod.js
const { PermissionsBitField } = require("discord.js");
const { isPanela } = require("../protectionManager");

function parseDuration(durationStr) {
  if (!durationStr) return null;
  const match = durationStr.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * multipliers[unit];
}

module.exports = {
  handleMute: async (message, args) => {
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_SHIELD = process.env.EMOJI_SHIELD || "🛡️";
    const EMOJI_MUTE = process.env.EMOJI_MUTE || "🤐";
    const PREFIX = process.env.PREFIX || "mc!";

    // Whitelist de Segurança
    const whitelistEnv = process.env.WHITELIST_IDS || "";
    const WHITELIST_IDS = whitelistEnv
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)
    ) {
      return message.channel.send(
        `${EMOJI_ERROR} Sem permissão para silenciar membros.`,
      );
    }

    const targetArg = args[0];
    if (!targetArg) {
      return message.channel.send(
        `${EMOJI_ERROR} Mencione alguém ou informe o ID.`,
      );
    }

    const targetId = targetArg.replace(/<@!?(\d+)>/, "$1");
    const target = await message.guild.members
      .fetch(targetId)
      .catch(() => null);

    if (!target) {
      return message.channel.send(
        `${EMOJI_ERROR} Membro não encontrado no servidor.`,
      );
    }

    if (target.id === message.author.id) {
      return message.channel.send(`${EMOJI_ERROR} Você não pode se silenciar.`);
    }

    // --- PROTEÇÃO 1: WHITELIST IMUNIDADE ABSOLUTA ---
    if (WHITELIST_IDS.includes(target.id)) {
      return message.channel.send(
        `${EMOJI_SHIELD} **BLOQUEADO:** O usuário é um **Dono / Whitelist Oficial** e não pode ser silenciado!`,
      );
    }

    // --- PROTEÇÃO 2: CHECAGEM DA PANELA (IMUNIDADE ANTI-MUTE) ---
    const protectedUser = await isPanela(target.id);
    if (protectedUser) {
      return message.channel.send(
        `${EMOJI_SHIELD} **BLOQUEADO:** O usuário está na **Panela** (Imunidade a Punições).`,
      );
    }

    const durationStr = args[1];
    const reason = args.slice(2).join(" ") || "Sem motivo";

    if (!durationStr) {
      return message.channel.send(
        `${EMOJI_ERROR} Defina o tempo (ex: 10m, 1h). Use \`${PREFIX}mute @usuario 10m\`.`,
      );
    }

    const ms = parseDuration(durationStr);
    if (!ms || ms > 2419200000) {
      return message.channel.send(
        `${EMOJI_ERROR} Tempo inválido (Máx 28 dias). Use s, m, h, ou d.`,
      );
    }

    if (!target.moderatable) {
      return message.channel.send(
        `${EMOJI_ERROR} Não consigo silenciar este usuário (cargo superior ou igual ao meu).`,
      );
    }

    try {
      await target.timeout(
        ms,
        `Silenciado por ${message.author.tag}: ${reason}`,
      );
      message.channel.send(
        `${EMOJI_MUTE} **${target.user.tag}** foi silenciado por ${durationStr}. Motivo: ${reason}`,
      );
    } catch (err) {
      console.error("[TIMEMOD MUTE ERROR]", err);
      message.channel.send(`${EMOJI_ERROR} Erro ao tentar silenciar o membro.`);
    }
  },

  handleUnmute: async (message, args) => {
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_UNMUTE = process.env.EMOJI_UNMUTE || "🔊";

    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)
    ) {
      return message.channel.send(
        `${EMOJI_ERROR} Sem permissão para remover castigo.`,
      );
    }

    const targetArg = args[0];
    if (!targetArg) {
      return message.channel.send(
        `${EMOJI_ERROR} Mencione alguém ou informe o ID.`,
      );
    }

    const targetId = targetArg.replace(/<@!?(\d+)>/, "$1");
    const target = await message.guild.members
      .fetch(targetId)
      .catch(() => null);

    if (!target) {
      return message.channel.send(
        `${EMOJI_ERROR} Membro não encontrado no servidor.`,
      );
    }

    try {
      await target.timeout(null, `Castigo removido por ${message.author.tag}`);
      message.channel.send(
        `${EMOJI_UNMUTE} **${target.user.tag}** teve o castigo removido.`,
      );
    } catch (err) {
      console.error("[TIMEMOD UNMUTE ERROR]", err);
      message.channel.send(
        `${EMOJI_ERROR} Erro ao remover o silêncio do membro.`,
      );
    }
  },

  handleJail: async (message, args) => {
    const jailRoleId = process.env.JAIL_ROLE_ID;
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_SHIELD = process.env.EMOJI_SHIELD || "🛡️";
    const EMOJI_JAIL = process.env.EMOJI_JAIL || "🚔";

    // Whitelist de Segurança
    const whitelistEnv = process.env.WHITELIST_IDS || "";
    const WHITELIST_IDS = whitelistEnv
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (!jailRoleId) {
      return message.channel.send(
        `${EMOJI_ERROR} O cargo de prisão (JAIL_ROLE_ID) não está configurado.`,
      );
    }

    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)
    ) {
      return message.channel.send(
        `${EMOJI_ERROR} Sem permissão para prender membros.`,
      );
    }

    const targetArg = args[0];
    if (!targetArg) {
      return message.channel.send(
        `${EMOJI_ERROR} Mencione alguém ou informe o ID para prender.`,
      );
    }

    const targetId = targetArg.replace(/<@!?(\d+)>/, "$1");
    const target = await message.guild.members
      .fetch(targetId)
      .catch(() => null);

    if (!target) {
      return message.channel.send(
        `${EMOJI_ERROR} Membro não encontrado no servidor.`,
      );
    }

    if (target.id === message.author.id) {
      return message.channel.send(`${EMOJI_ERROR} Você não pode se prender.`);
    }

    // --- PROTEÇÃO 1: WHITELIST IMUNIDADE ABSOLUTA ---
    if (WHITELIST_IDS.includes(target.id)) {
      return message.channel.send(
        `${EMOJI_SHIELD} **BLOQUEADO:** O usuário é um **Dono / Whitelist Oficial** e não pode ser preso!`,
      );
    }

    // --- PROTEÇÃO 2: CHECAGEM DA PANELA (IMUNIDADE ANTI-JAIL) ---
    const protectedUser = await isPanela(target.id);
    if (protectedUser) {
      return message.channel.send(
        `${EMOJI_SHIELD} **BLOQUEADO:** O usuário está na **Panela** (Imunidade a Punições).`,
      );
    }

    const jailRole = message.guild.roles.cache.get(jailRoleId);
    if (!jailRole) {
      return message.channel.send(
        `${EMOJI_ERROR} Cargo de prisão não encontrado no servidor.`,
      );
    }

    try {
      await target.roles.add(jailRole, `Preso por ${message.author.tag}`);
      message.channel.send(`${EMOJI_JAIL} **${target.user.tag}** foi PRESO!`);
    } catch (err) {
      console.error("[TIMEMOD JAIL ERROR]", err);
      message.channel.send(
        `${EMOJI_ERROR} Erro ao atribuir o cargo de prisão ao membro.`,
      );
    }
  },

  handleUnjail: async (message, args) => {
    const jailRoleId = process.env.JAIL_ROLE_ID;
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_UNJAIL = process.env.EMOJI_UNJAIL || "🔓";

    if (!jailRoleId) {
      return message.channel.send(
        `${EMOJI_ERROR} O cargo de prisão (JAIL_ROLE_ID) não está configurado.`,
      );
    }

    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)
    ) {
      return message.channel.send(
        `${EMOJI_ERROR} Sem permissão para soltar membros.`,
      );
    }

    const targetArg = args[0];
    if (!targetArg) {
      return message.channel.send(
        `${EMOJI_ERROR} Mencione alguém ou informe o ID.`,
      );
    }

    const targetId = targetArg.replace(/<@!?(\d+)>/, "$1");
    const target = await message.guild.members
      .fetch(targetId)
      .catch(() => null);

    if (!target) {
      return message.channel.send(
        `${EMOJI_ERROR} Membro não encontrado no servidor.`,
      );
    }

    try {
      await target.roles.remove(jailRoleId, `Solto por ${message.author.tag}`);
      message.channel.send(
        `${EMOJI_UNJAIL} **${target.user.tag}** foi solto da prisão.`,
      );
    } catch (err) {
      console.error("[TIMEMOD UNJAIL ERROR]", err);
      message.channel.send(
        `${EMOJI_ERROR} Erro ao remover o cargo de prisão do membro.`,
      );
    }
  },
};
