// handlers/antiSpamHandler.js
const { PermissionsBitField } = require("discord.js");

// Configuração em memória
const spamMap = new Map();

/**
 * Verifica se a mensagem é spam.
 * @param {object} message - Objeto da mensagem.
 * @returns {boolean} - Retorna true se for spam (para parar o fluxo), false se ok.
 */
module.exports = async (message) => {
  // 1. Ignora Admins (Eles não tomam timeout)
  if (
    message.member?.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {
    return false;
  }

  // 2. Puxa as configurações do .env ou usa valores padrão
  const SPAM_LIMIT = parseInt(process.env.ANTI_SPAM_LIMIT) || 5; // Max mensagens
  const SPAM_TIME = parseInt(process.env.ANTI_SPAM_TIME_MS) || 5000; // Em milissegundos
  const TIMEOUT_MINUTES = parseInt(process.env.ANTI_SPAM_TIMEOUT_MIN) || 10; // Tempo do castigo

  const userId = message.author.id;

  if (spamMap.has(userId)) {
    const data = spamMap.get(userId);
    const lastMsg = data.lastMessage;
    const diff = message.createdTimestamp - lastMsg.createdTimestamp;

    if (diff > SPAM_TIME) {
      // Tempo passou, reseta a contagem
      spamMap.set(userId, { count: 1, lastMessage: message });
      return false;
    }

    // Dentro do tempo limite, incrementa
    data.count++;
    data.lastMessage = message;

    if (data.count >= SPAM_LIMIT) {
      // --- AÇÃO DE PUNIÇÃO ---
      const member = message.member;
      if (member && member.moderatable) {
        try {
          // Aplica o timeout configurado
          await member.timeout(
            TIMEOUT_MINUTES * 60 * 1000,
            "Anti-Spam: Enviou muitas mensagens rápido demais.",
          );

          await message.channel.send(
            `🤐 **${message.author.tag}** entrou em timeout de ${TIMEOUT_MINUTES} minutos por SPAM.`,
          );
        } catch (e) {
          console.error("Erro ao aplicar timeout de spam:", e);
        }
      }

      // Reseta o usuário para não tentar punir novamente no próximo ms
      spamMap.delete(userId);
      return true; // É spam, pare o processamento!
    }
  } else {
    // Primeira mensagem
    spamMap.set(userId, { count: 1, lastMessage: message });
  }

  return false; // Não é spam
};
