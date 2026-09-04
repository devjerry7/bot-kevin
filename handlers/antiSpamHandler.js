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

  const userId = message.author.id;

  if (spamMap.has(userId)) {
    const data = spamMap.get(userId);
    const lastMsg = data.lastMessage;
    const diff = message.createdTimestamp - lastMsg.createdTimestamp;

    if (diff > SPAM_TIME) {
      spamMap.set(userId, { count: 1, lastMessage: message });
      return false;
    }

    data.count++;
    data.lastMessage = message;

    if (data.count >= SPAM_LIMIT) {
      const member = message.member;
      if (member && member.moderatable) {
        try {
          await member.timeout(
            TIMEOUT_MINUTES * 60 * 1000,
            "Anti-Spam: Enviou muitas mensagens rápido demais.",
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
    spamMap.set(userId, { count: 1, lastMessage: message });
  }

  return false;
};
