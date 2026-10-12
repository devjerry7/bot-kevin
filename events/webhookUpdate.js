// events/webhookUpdate.js
const { EmbedBuilder, AuditLogEvent } = require("discord.js");

const OWNER_LOG_ID = "1551147533454282806";

// Auxiliar para obter a Whitelist formatada do .env
const getWhitelistIds = () => {
  const whitelistEnv = process.env.WHITELIST_IDS || "";
  return whitelistEnv
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
};

module.exports = async (channel) => {
  try {
    const { guild } = channel;
    if (!guild) return;

    // Busca no Audit Log quem criou ou alterou um Webhook recentemente
    const fetchedLogs = await guild
      .fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.WebhookCreate,
      })
      .catch(() => null);

    if (!fetchedLogs) return;
    const entry = fetchedLogs.entries.first();

    if (!entry) return;

    // Verifica se o log de auditoria é recente (menos de 5s)
    if (Date.now() - entry.createdTimestamp > 5000) return;

    const executor = entry.executor;
    if (!executor) return;

    const WHITELIST_IDS = getWhitelistIds();

    // Se o executor for o próprio bot, o Dono do Servidor ou Whitelist Oficial, ignora
    if (
      executor.id === guild.client.user.id ||
      executor.id === guild.ownerId ||
      WHITELIST_IDS.includes(executor.id)
    ) {
      return;
    }

    // 🚨 TENTATIVA NÃO AUTORIZADA DE CRIAÇÃO DE WEBHOOK DETECTADA!

    // 1. Busca e deleta todos os Webhooks recém-criados no canal por não-whitelist
    const webhooks = await channel.fetchWebhooks().catch(() => null);
    if (webhooks && webhooks.size > 0) {
      for (const [, webhook] of webhooks) {
        if (webhook.owner && webhook.owner.id === executor.id) {
          await webhook
            .delete("Anti-Webhook Abuse: Criado por usuário fora da Whitelist")
            .catch(() => {});
        }
      }
    }

    // 2. Pune o executor (Quarentena/Remoção de cargos)
    const executorMember = await guild.members
      .fetch(executor.id)
      .catch(() => null);
    if (executorMember && executorMember.moderatable) {
      const executorRolesToRemove = executorMember.roles.cache.filter(
        (r) => r.name !== "@everyone" && r.editable,
      );
      await executorMember.roles
        .remove(
          executorRolesToRemove,
          "Anti-Webhook Abuse: Tentativa não autorizada de criar Webhook",
        )
        .catch(() => {});
    }

    // 3. Notificação Crítica no PV do Dono
    const ownerUser = await guild.client.users
      .fetch(OWNER_LOG_ID)
      .catch(() => null);
    if (ownerUser) {
      const alertEmbed = new EmbedBuilder()
        .setTitle(
          "<a:verm_alerta2qn:1555456678256975974> [SEGURANÇA] ABUSO DE WEBHOOK NEUTRALIZADO",
        )
        .setDescription(
          `Uma tentativa não autorizada de criação de Webhook foi bloqueada no servidor **${guild.name}**.\n\n` +
            `👤 **Infrator:** ${executor.tag} (\`${executor.id}\`)\n` +
            `📌 **Canal:** ${channel} (\`${channel.id}\`)\n\n` +
            `Ação tomada: Webhook deletado e cargos editáveis do infrator foram revogados.`,
        )
        .setColor(0xff0000)
        .setTimestamp();

      await ownerUser.send({ embeds: [alertEmbed] }).catch(() => {});
    }
  } catch (error) {
    console.error("[WEBHOOK PROTECTION ERROR]", error);
  }
};
