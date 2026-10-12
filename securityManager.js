// securityManager.js
const { AuditLogEvent } = require("discord.js");
const logEmbed = require("../utils/logEmbed");
const { triggerAutoLockdown } = require("../commands/lockdown");

// --- CONFIGURAÇÃO DE LIMITES (Puxando do .env com fallback) ---
const TIME_WINDOW = Number(process.env.ANTI_NUKE_TIME_MS) || 10000;
const LIMITS = {
  CHANNEL_DELETE: {
    max: Number(process.env.ANTI_NUKE_MAX_CHANNELS) || 2,
    time: TIME_WINDOW,
  },
  CHANNEL_CREATE: {
    max: Number(process.env.ANTI_NUKE_MAX_CHANNELS) || 3,
    time: TIME_WINDOW,
  },
  ROLE_DELETE: {
    max: Number(process.env.ANTI_NUKE_MAX_ROLES) || 2,
    time: TIME_WINDOW,
  },
  BAN_ADD: {
    max: Number(process.env.ANTI_NUKE_MAX_BANS) || 3,
    time: TIME_WINDOW,
  },
  KICK_MEMBER: {
    max: Number(process.env.ANTI_NUKE_MAX_KICKS) || 3,
    time: TIME_WINDOW,
  },
};

// Armazenamento temporário em memória: Map<UserID, Map<ActionType, {count, timer}>>
const tracker = new Map();

// Auxiliar para obter a Whitelist formatada corretamente
const getWhitelistIds = () => {
  const whitelistEnv = process.env.WHITELIST_IDS || "";
  return whitelistEnv
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
};

/**
 * Função principal de verificação de segurança (Anti-Nuke)
 */
async function checkSecurity(client, guild, actionType, auditType) {
  try {
    // 1. Busca quem fez a ação nos Audit Logs
    const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: auditType });
    const entry = auditLogs.entries.first();

    if (!entry) return;

    // Verifica se o log é recente (menos de 5s) para evitar falsos positivos
    if (Date.now() - entry.createdTimestamp > 5000) return;

    const executor = entry.executor;
    if (!executor) return;

    // --- 2. VERIFICAÇÃO DE WHITELIST RIGOROSA ---
    const envWhitelist = getWhitelistIds();

    if (
      executor.id === client.user.id || // Próprio bot
      executor.id === guild.ownerId || // Dono do Servidor
      envWhitelist.includes(executor.id) // Whitelist oficial configurada
    ) {
      return;
    }

    // 4. Inicializa o rastreador para esse usuário se não existir
    if (!tracker.has(executor.id)) tracker.set(executor.id, new Map());
    const userTracker = tracker.get(executor.id);

    // 5. Inicializa o rastreador para esse tipo de ação
    if (!userTracker.has(actionType)) {
      userTracker.set(actionType, { count: 1, timer: null });

      // Reseta o contador após o tempo limite
      const timer = setTimeout(() => {
        userTracker.delete(actionType);
        if (userTracker.size === 0) tracker.delete(executor.id);
      }, LIMITS[actionType].time);

      userTracker.get(actionType).timer = timer;
    } else {
      // Incrementa o contador
      const track = userTracker.get(actionType);
      track.count++;
    }

    // 6. VERIFICA SE PASSOU DO LIMITE (AÇÃO DE NUKE DETECTADA!)
    if (userTracker.get(actionType).count > LIMITS[actionType].max) {
      await punishNuker(guild, executor, actionType);
    }
  } catch (error) {
    console.error(`[ANTI-NUKE] Erro ao verificar segurança:`, error);
  }
}

/**
 * Punição Automática: Remove cargos, Bane, Aciona Lockdown e Envia Logs
 */
async function punishNuker(guild, user, reasonType) {
  try {
    const member = await guild.members.fetch(user.id).catch(() => null);

    console.log(
      `[ANTI-NUKE] 🚨 ATAQUE DETECTADO DE ${user.tag} (${reasonType})`,
    );

    // A. Tenta remover todos os cargos (Quarentena imediata)
    if (member) {
      const roles = member.roles.cache.filter(
        (r) => r.name !== "@everyone" && r.editable,
      );
      await member.roles
        .remove(
          roles,
          `Anti-Nuke: Detectado comportamento hostil (${reasonType})`,
        )
        .catch(() => {});
    }

    // B. Bane o usuário do servidor imediatamente
    await guild.members
      .ban(user.id, {
        reason: `[SISTEMA DE SEGURANÇA] Anti-Nuke Trigger: ${reasonType}`,
      })
      .catch(() => {});

    // C. Aciona o Lockdown Automático Global do Servidor para estancar o ataque
    await triggerAutoLockdown(
      guild,
      `Ataque Anti-Nuke detectado: ${reasonType} por${user.tag}`,
    );

    // D. Avisa no canal de logs usando a utilidade oficial
    const logId = process.env.SECURITY_LOG_ID;
    if (logId) {
      await logEmbed(
        guild.client,
        logId,
        "🚨 ATAQUE DE NUKE NEUTRALIZADO",
        `O sistema Anti-Nuke automático foi acionado, baniu o infrator e ativou o lockdown de segurança.`,
        0xff0000,
        [
          { name: "Infrator", value: `${user} (\`${user.id}\`)`, inline: true },
          { name: "Gatilho", value: `\`${reasonType}\``, inline: true },
        ],
        user.displayAvatarURL(),
      );
    }
  } catch (error) {
    console.error(`[ANTI-NUKE] Falha ao punir ${user.tag}:`, error);
  }
}

module.exports = { checkSecurity, LIMITS };
