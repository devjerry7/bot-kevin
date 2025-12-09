// utils/guildConfigManager.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Cache simples para evitar ler o banco a todo momento (performance)
// Estrutura: Map<guildId, { config: Object, expires: Date }>
const configCache = new Map();
const CACHE_DURATION = 60 * 1000; // 1 minuto de cache

async function getGuildConfig(guildId) {
  const now = Date.now();

  // 1. Tenta pegar do Cache primeiro (Memória RAM)
  if (configCache.has(guildId)) {
    const cached = configCache.get(guildId);
    if (cached.expires > now) {
      return cached.config;
    }
  }

  // 2. Se não tiver no cache, busca no Banco de Dados
  let config = await prisma.guildConfiguration
    .findUnique({
      where: { guildId: guildId },
    })
    .catch(() => null);

  // 3. Fallback Híbrido (Segurança Máxima para seu Servidor)
  // Se estivermos no SEU servidor principal (definido no .env), usamos o .env como backup
  if (guildId === process.env.GUILD_ID) {
    // Se a config do banco veio nula, cria um objeto vazio
    if (!config) config = {};

    // Mescla: O que tem no banco ganha, mas se faltar, pega do .env
    config = {
      ...config, // Prioridade para o banco (para o Painel funcionar)

      // Backups do .env caso o banco esteja vazio em algum campo
      staffTrustedRoles:
        config.staffTrustedRoles || process.env.STAFF_TRUSTED_ROLES,
      vipCategoryId: config.vipCategoryId || process.env.VIP_CATEGORY_ID,
      vipRoleId: config.vipRoleId || process.env.VIP_ROLE_ID,
      vipAnchorRoleId: config.vipAnchorRoleId || process.env.VIP_ANCHOR_ROLE_ID,
      logChannelId: config.logChannelId || process.env.LOG_CHANNEL_ID,
      ticketParentChannelId:
        config.ticketParentChannelId || process.env.TICKET_PARENT_CHANNEL_ID,
      // ... (o .env cobre qualquer falha)
    };
  }

  // 4. Se for servidor de cliente e não tiver config, retorna null
  if (!config && guildId !== process.env.GUILD_ID) {
    // Opcional: Criar uma config padrão vazia no banco para não dar erro
    config = await prisma.guildConfiguration
      .create({
        data: { guildId: guildId },
      })
      .catch(() => ({}));
  }

  // 5. Salva no cache e retorna
  configCache.set(guildId, { config, expires: now + CACHE_DURATION });
  return config || {};
}

/**
 * Atualiza a configuração (Usado pelo comando /config)
 */
async function updateGuildConfig(guildId, data) {
  const updated = await prisma.guildConfiguration.upsert({
    where: { guildId: guildId },
    update: data,
    create: { guildId, ...data },
  });

  // Atualiza o cache imediatamente
  configCache.set(guildId, {
    config: updated,
    expires: Date.now() + CACHE_DURATION,
  });
  return updated;
}

module.exports = { getGuildConfig, updateGuildConfig };
