// handlers/antiSpamHandler.js
const { PermissionsBitField } = require("discord.js");

const spamMap = new Map();

module.exports = async (message) => {
  const EMOJI_MUTE = process.env.EMOJI_MUTE || "🤐";

  // 1. Ignora Admins
  if (
    message.member?.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {
    return false;
  }

  // 2. Puxa as configurações do .env ou usa valores padrão
  const SPAM_LIMIT = parseInt(process.env.ANTI_SPAM_LIMIT) || 5;
  const SPAM_TIME = parseInt(process.env.ANTI_SPAM_TIME_MS) || 5000;
  const TIMEOUT_MINUTES = parseInt(process.env.ANTI_SPAM_TIMEOUT_MIN) || 10;
  const MAX_MENTIONS = parseInt(process.env.ANTI_SPAM_MAX_MENTIONS) || 5;

  const userId = message.author.id;
  const member = message.member;

  // --- PROTEÇÃO CONTRA MENÇÕES EM MASSA (@everyone, @here ou excesso de usuários) ---
  const mentionCount =
    message.mentions.users.size + message.mentions.roles.size;
  const hasMassMention =
    message.mentions.everyone || mentionCount > MAX_MENTIONS;

  if (hasMassMention && member && member.moderatable) {
    try {
      if (message.deletable) await message.delete().catch(() => {});

      await member.timeout(
        TIMEOUT_MINUTES * 60 * 1000,
        "Anti-Raid: Excesso de menções em massa (@everyone ou marcações).",
      );

      await message.channel.send(
        `${EMOJI_MUTE} **${message.author.tag}** foi silenciado por ${TIMEOUT_MINUTES} minutos por menções em massa.`,
      );
      return true;
    } catch (e) {
      console.error("[ANTI-SPAM ERROR] Erro ao punir menção em massa:", e);
    }
  }

  // --- LÓGICA DE SPAM / FLOOD COMUM ---
  if (spamMap.has(userId)) {
    const data = spamMap.get(userId);
    const lastMsg = data.lastMessage;
    const diff = message.createdTimestamp - lastMsg.createdTimestamp;

    // Se passou do tempo limite, reseta o contador
    if (diff > SPAM_TIME) {
      spamMap.set(userId, {
        count: 1,
        lastMessage: message,
        lastContent: message.content,
      });
      return false;
    }

    // Verifica se mandou exatamente o mesmo texto repetido (Flood de repetição)
    const isSameContent =
      message.content && message.content === data.lastContent;

    data.count++;
    data.lastMessage = message;
    data.lastContent = message.content;

    // Se excedeu o limite de mensagens rápidas ou repetições idênticas
    if (data.count >= SPAM_LIMIT || (isSameContent && data.count >= 3)) {
      if (member && member.moderatable) {
        try {
          if (message.deletable) await message.delete().catch(() => {});

          await member.timeout(
            TIMEOUT_MINUTES * 60 * 1000,
            "Anti-Spam: Enviou muitas mensagens ou repetiu texto rápido demais.",
          );

          await message.channel.send(
            `${EMOJI_MUTE} **${message.author.tag}** entrou em timeout de ${TIMEOUT_MINUTES} minutos por SPAM.`,
          );
        } catch (e) {
          console.error("[ANTI-SPAM ERROR] Erro ao aplicar timeout:", e);
        }
      }

      spamMap.delete(userId);
      return true;
    }
  } else {
    spamMap.set(userId, {
      count: 1,
      lastMessage: message,
      lastContent: message.content,
    });
  }

  return false;
};
