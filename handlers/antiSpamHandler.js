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

// Gera um hash/identificador para anexos/imagens
const getMessageSignature = (message) => {
  const textContent = message.content
    ? message.content.trim().toLowerCase()
    : "";

  if (message.attachments.size > 0) {
    const attachmentSignatures = message.attachments
      .map((att) => `${att.name}_${att.size}`)
      .join("|");
    return `[ATTACHMENT:${attachmentSignatures}]_${textContent}`;
  }

  return textContent;
};

module.exports = async (message) => {
  const EMOJI_MUTE = process.env.EMOJI_MUTE || "🤐";

  // 1. Apenas membros da Whitelist Oficial têm imunidade absoluta
  const WHITELIST_IDS = getWhitelistIds();
  if (WHITELIST_IDS.includes(message.author.id)) {
    return false;
  }

  // 2. Variáveis dinâmicas
  const SPAM_LIMIT = parseInt(process.env.ANTI_SPAM_LIMIT) || 6;
  const SPAM_TIME = parseInt(process.env.ANTI_SPAM_TIME_MS) || 5000;
  const TIMEOUT_MINUTES = parseInt(process.env.ANTI_SPAM_TIMEOUT_MIN) || 15;
  const MAX_MENTIONS = parseInt(process.env.ANTI_SPAM_MAX_MENTIONS) || 3;

  const userId = message.author.id;
  const member = message.member;

  // --- PROTEÇÃO 1: MENÇÕES EM MASSA (@everyone, @here ou excesso de pings) ---
  const mentionCount =
    message.mentions.users.size + message.mentions.roles.size;
  const hasMassMention =
    message.mentions.everyone || mentionCount > MAX_MENTIONS;

  if (hasMassMention) {
    // Apaga IMEDIATAMENTE a mensagem maliciosa, sem depender de permissão de timeout
    if (message.deletable) {
      await message.delete().catch(() => {});
    }

    try {
      if (member && member.moderatable) {
        await member.timeout(
          TIMEOUT_MINUTES * 60 * 1000,
          "Anti-Raid: Menção em massa maliciosa (@everyone/@here/excesso de pings).",
        );
      } else if (member && member.bannable) {
        await member.ban({
          reason:
            "Anti-Raid: Tentativa de menção em massa sem permissão de timeout.",
        });
      }

      await message.channel.send(
        `${EMOJI_MUTE} **${message.author.tag}** foi punido por menção em massa maliciosa.`,
      );

      // Dispara o Lockdown Automático se a menção for @everyone
      if (message.mentions.everyone) {
        await triggerAutoLockdown(
          message.guild,
          `Ataque de menção @everyone detectado por ${message.author.tag}`,
        );
      }
    } catch (e) {
      console.error("[ANTI-SPAM ERROR] Erro ao punir menção em massa:", e);
    }

    return true; // Bloqueia a execução do resto do bot
  }

  // --- PROTEÇÃO 2: SPAM DE TEXTO OU IMAGENS IDÊNTICAS ---
  const now = message.createdTimestamp;
  const currentSignature = getMessageSignature(message);

  if (!currentSignature) return false;

  if (spamMap.has(userId)) {
    const data = spamMap.get(userId);
    const diff = now - data.startTime;

    if (diff > SPAM_TIME) {
      spamMap.set(userId, {
        count: 1,
        sameContentCount: 1,
        startTime: now,
        lastSignature: currentSignature,
      });
      return false;
    }

    const isSameContent = currentSignature === data.lastSignature;

    data.count++;
    if (isSameContent) {
      data.sameContentCount++;
    } else {
      data.sameContentCount = 1;
    }
    data.lastSignature = currentSignature;

    // Regras de Punição:
    // A) Mídia ou Texto Idêntico enviado 3x seguidas (Raid de Imagem/Spam Bot)
    // B) Volume geral de mensagens no intervalo (Flood)
    const isSpamBot = isSameContent && data.sameContentCount >= 3;
    const isHumanFloodOverLimit = data.count >= SPAM_LIMIT;

    if (isSpamBot || isHumanFloodOverLimit) {
      if (message.deletable) {
        await message.delete().catch(() => {});
      }

      try {
        if (member && member.moderatable) {
          await member.timeout(
            TIMEOUT_MINUTES * 60 * 1000,
            isSpamBot
              ? "Anti-Spam: Envio repetitivo de mensagens ou mídias idênticas."
              : "Anti-Spam: Volume de mensagens excedido.",
          );

          await message.channel.send(
            `${EMOJI_MUTE} **${message.author.tag}** foi mutado por ${TIMEOUT_MINUTES} minutos por SPAM.`,
          );
        }
      } catch (e) {
        console.error("[ANTI-SPAM ERROR] Erro ao aplicar punição de spam:", e);
      }

      spamMap.delete(userId);
      return true;
    }
  } else {
    spamMap.set(userId, {
      count: 1,
      sameContentCount: 1,
      startTime: now,
      lastSignature: currentSignature,
    });
  }

  return false;
};
