// securityManager.js
const { AuditLogEvent } = require("discord.js");
const logEmbed = require("../utils/logEmbed"); // Puxando o seu gerador de logs recém-refatorado!

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

/**
 * Função principal de verificação de segurança
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

    // --- 2. VERIFICAÇÃO DE WHITELIST (Lendo do .env) ---
    const envWhitelist = process.env.WHITELIST_IDS?.split(",") || [];

    if (
      executor.id === client.user.id || // Próprio bot
      executor.id === guild.ownerId || // Dono do Servidor (Discord bloqueia punição de qualquer jeito)
      executor.id === process.env.OWNER_1_ID || // Você (Desenvolvedor)
      envWhitelist.includes(executor.id) // Outros bots ou administradores de confiança
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
 * Punição Automática: Remove cargos, Bane e Envia Log
 */
async function punishNuker(guild, user, reasonType) {
  try {
    const member = await guild.members.fetch(user.id).catch(() => null);

    console.log(`[ANTI-NUKE] DETECTADO ATAQUE DE ${user.tag} (${reasonType})`);

    // A. Tenta remover todos os cargos (Quarentena imediata)
    if (member) {
      const roles = member.roles.cache.filter(
        (r) => r.name !== "@everyone" && r.editable,
      );
      await member.roles
        .remove(roles, `Anti-Nuke: Detectado ${reasonType}`)
        .catch(console.error);
    }

    // B. Bane o usuário
    await guild.members.ban(user.id, {
      reason: `[SISTEMA DE SEGURANÇA] Anti-Nuke Trigger: ${reasonType}`,
    });

    // C. Avisa no canal de logs usando sua utilidade oficial
    const logId = process.env.SECURITY_LOG_ID;
    if (logId) {
      await logEmbed(
        guild.client,
        logId,
        "🚨 ATAQUE DETECTADO E BLOQUEADO",
        `O sistema Anti-Nuke automático foi acionado e neutralizou uma ameaça.`,
        0xff0000, // Cor Vermelha
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
