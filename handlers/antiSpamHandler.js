// handlers/antiSpamHandler.js
const { triggerAutoLockdown } = require("../commands/lockdown");

// Mapa na memória para monitorar histórico recente de cada usuário
const spamMap = new Map();

// Auxiliar para obter a Whitelist oficial do .env
const getWhitelistIds = () => {
  const whitelistEnv = process.env.WHITELIST_IDS || "";
  return whitelistEnv
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
};

module.exports = async (message) => {
  const EMOJI_MUTE = process.env.EMOJI_MUTE || "🤐";

  // 1. Apenas membros da Whitelist Oficial têm imunidade absoluta
  const WHITELIST_IDS = getWhitelistIds();
  if (WHITELIST_IDS.includes(message.author.id)) {
    return false;
  }

  // 2. Variáveis dinâmicas puxadas do config.js / process.env
  const SPAM_LIMIT = parseInt(process.env.ANTI_SPAM_LIMIT) || 8; // Limite padrão mais humano
  const SPAM_TIME = parseInt(process.env.ANTI_SPAM_TIME_MS) || 5000; // Janela de 5 segundos
  const TIMEOUT_MINUTES = parseInt(process.env.ANTI_SPAM_TIMEOUT_MIN) || 10;
  const MAX_MENTIONS = parseInt(process.env.ANTI_SPAM_MAX_MENTIONS) || 5;

  const userId = message.author.id;
  const member = message.member;

  // --- PROTEÇÃO 1: MENÇÕES EM MASSA (@everyone, @here ou spam de marcações) ---
  const mentionCount =
    message.mentions.users.size + message.mentions.roles.size;
  const hasMassMention =
    message.mentions.everyone || mentionCount > MAX_MENTIONS;

  if (hasMassMention && member && member.moderatable) {
    try {
      if (message.deletable) await message.delete().catch(() => {});

      await member.timeout(
        TIMEOUT_MINUTES * 60 * 1000,
        "Anti-Raid: Excesso de menções em massa (@everyone ou marcações numerosas).",
      );

      await message.channel.send(
        `${EMOJI_MUTE} **${message.author.tag}** foi silenciado por ${TIMEOUT_MINUTES} minutos por menção em massa maliciosa.`,
      );

      // Dispara o Lockdown Automático Inteligente se a menção em massa for @everyone por conta não-whitelist
      if (message.mentions.everyone) {
        await triggerAutoLockdown(
          message.guild,
          `Ataque de menção @everyone detectado por ${message.author.tag}`,
        );
      }

      return true; // Bloqueia a execução de comandos
    } catch (e) {
      console.error("[ANTI-SPAM ERROR] Erro ao punir menção em massa:", e);
    }
  }

  // --- PROTEÇÃO 2: LÓGICA DE FLOOD E SPAM INTELIGENTE ---
  const now = message.createdTimestamp;

  if (spamMap.has(userId)) {
    const data = spamMap.get(userId);
    const diff = now - data.startTime;

    // Se passou do tempo da janela (ex: 5 segundos), reseta o histórico do usuário
    if (diff > SPAM_TIME) {
      spamMap.set(userId, {
        count: 1,
        sameContentCount: 1,
        startTime: now,
        lastContent: message.content,
      });
      return false;
    }

    const isSameContent =
      message.content &&
      message.content.trim().toLowerCase() ===
        data.lastContent?.trim().toLowerCase();

    data.count++;
    if (isSameContent) {
      data.sameContentCount++;
    } else {
      data.sameContentCount = 1; // Reseta a contagem de repetidos se mudou o texto
    }
    data.lastContent = message.content;

    // 🎯 REGRAS INTELIGENTES DE SPAM:
    // A) Texto idêntico enviado 4x em menos de 5 segundos (Spam claro de robô/macro)
    // B) Volume massivo de mensagens variadas (Ex: mais de 8 mensagens em 5s)
    const isSpamBot = isSameContent && data.sameContentCount >= 4;
    const isHumanFloodOverLimit = data.count >= SPAM_LIMIT;

    if (isSpamBot || isHumanFloodOverLimit) {
      if (member && member.moderatable) {
        try {
          if (message.deletable) await message.delete().catch(() => {});

          await member.timeout(
            TIMEOUT_MINUTES * 60 * 1000,
            isSpamBot
              ? "Anti-Spam: Envio repetitivo de texto idêntico."
              : "Anti-Spam: Volume de mensagens excedido em curto tempo.",
          );

          await message.channel.send(
            `${EMOJI_MUTE} **${message.author.tag}** levou timeout de ${TIMEOUT_MINUTES} minutos por SPAM.`,
          );
        } catch (e) {
          console.error(
            "[ANTI-SPAM ERROR] Erro ao aplicar timeout por spam:",
            e,
          );
        }
      }

      spamMap.delete(userId);
      return true; // Interrompe o processamento da mensagem
    }
  } else {
    // Primeira mensagem do usuário na janela
    spamMap.set(userId, {
      count: 1,
      sameContentCount: 1,
      startTime: now,
      lastContent: message.content,
    });
  }

  return false; // Mensagem limpa
};
