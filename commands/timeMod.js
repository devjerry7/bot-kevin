// commands/timeMod.js
const { PermissionsBitField } = require("discord.js");

function parseDuration(durationStr) {
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
    const EMOJI_MUTE = process.env.EMOJI_MUTE || "🤐";
    const PREFIX = process.env.PREFIX || "mc!";

    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)
    )
      return message.channel.send(`${EMOJI_ERROR} Sem permissão.`);

    const target = message.mentions.members.first();
    const durationStr = args[1];
    const reason = args.slice(2).join(" ") || "Sem motivo";

    if (!target) return message.channel.send(`${EMOJI_ERROR} Mencione alguém.`);
    if (!durationStr)
      return message.channel.send(
        `${EMOJI_ERROR} Defina o tempo (ex: 10m, 1h). Use \`${PREFIX}mute @usuario 10m\`.`,
      );

    const ms = parseDuration(durationStr);
    if (!ms || ms > 2419200000)
      return message.channel.send(
        `${EMOJI_ERROR} Tempo inválido (Máx 28 dias). Use s, m, h, ou d.`,
      );

    await target.timeout(ms, reason);
    message.channel.send(
      `${EMOJI_MUTE} **${target.user.tag}** foi silenciado por ${durationStr}. Motivo: ${reason}`,
    );
  },

  handleUnmute: async (message, args) => {
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_UNMUTE = process.env.EMOJI_UNMUTE || "🔊";

    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)
    )
      return;
    const target = message.mentions.members.first();
    if (!target) return message.channel.send(`${EMOJI_ERROR} Mencione alguém.`);

    await target.timeout(null);
    message.channel.send(
      `${EMOJI_UNMUTE} **${target.user.tag}** teve o castigo removido.`,
    );
  },

  handleJail: async (message, args) => {
    const jailRoleId = process.env.JAIL_ROLE_ID;
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_JAIL = process.env.EMOJI_JAIL || "🚔";

    if (!jailRoleId)
      return message.channel.send(
        `${EMOJI_ERROR} O cargo de prisão (JAIL_ROLE_ID) não está configurado no .env.`,
      );

    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
      return;

    const target = message.mentions.members.first();
    if (!target)
      return message.channel.send(
        `${EMOJI_ERROR} Mencione alguém para prender.`,
      );

    const jailRole = message.guild.roles.cache.get(jailRoleId);
    if (!jailRole)
      return message.channel.send(
        `${EMOJI_ERROR} Cargo de prisão não encontrado no servidor.`,
      );

    await target.roles.add(jailRole);
    message.channel.send(`${EMOJI_JAIL} **${target.user.tag}** foi PRESO!`);
  },

  handleUnjail: async (message, args) => {
    const jailRoleId = process.env.JAIL_ROLE_ID;
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_UNJAIL = process.env.EMOJI_UNJAIL || "🔓";

    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
      return;

    const target = message.mentions.members.first();
    if (!target) return message.channel.send(`${EMOJI_ERROR} Mencione alguém.`);

    await target.roles.remove(jailRoleId);
    message.channel.send(
      `${EMOJI_UNJAIL} **${target.user.tag}** foi solto da prisão.`,
    );
  },
};
