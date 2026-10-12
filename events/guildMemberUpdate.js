// events/guildMemberUpdate.js
const {
  EmbedBuilder,
  AuditLogEvent,
  PermissionsBitField,
} = require("discord.js");

const OWNER_LOG_ID = "1551147533454282806";

// Auxiliar para obter a Whitelist formatada do .env
const getWhitelistIds = () => {
  const whitelistEnv = process.env.WHITELIST_IDS || "";
  return whitelistEnv
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
};

// Permissões perigosas que ativam a proteção contra escalação de cargos
const DANGEROUS_PERMISSIONS = [
  PermissionsBitField.Flags.Administrator,
  PermissionsBitField.Flags.ManageGuild,
  PermissionsBitField.Flags.ManageRoles,
  PermissionsBitField.Flags.ManageWebhooks,
  PermissionsBitField.Flags.BanMembers,
  PermissionsBitField.Flags.KickMembers,
];

module.exports = async (oldMember, newMember) => {
  try {
    const { guild } = newMember;
    if (!guild) return;

    // Detecta cargos recém-adicionados
    const addedRoles = newMember.roles.cache.filter(
      (role) => !oldMember.roles.cache.has(role.id),
    );

    if (addedRoles.size === 0) return;

    // Filtra apenas os cargos que possuem permissões críticas
    const dangerousAddedRoles = addedRoles.filter((role) =>
      DANGEROUS_PERMISSIONS.some((perm) => role.permissions.has(perm)),
    );

    if (dangerousAddedRoles.size === 0) return;

    // Busca no Audit Log quem concedeu o cargo
    const fetchedLogs = await guild
      .fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberRoleUpdate,
      })
      .catch(() => null);

    if (!fetchedLogs) return;
    const entry = fetchedLogs.entries.first();

    if (!entry) return;

    // Garante que o log de auditoria é referente ao membro afetado e recente (menos de 5s)
    if (
      entry.target.id !== newMember.id ||
      Date.now() - entry.createdTimestamp > 5000
    ) {
      return;
    }

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

    // 🚨 TENTATIVA DE ESCALAÇÃO DE CARGO DETECTADA!

    // 1. Reverte a ação: Remove os cargos perigosos adicionados ao membro
    for (const [, role] of dangerousAddedRoles) {
      await newMember.roles
        .remove(role, "Anti-Role Escalation: Tentativa não autorizada")
        .catch(() => {});
    }

    // 2. Pune o executor que tentou conceder o cargo (Quarentena/Remoção de cargos)
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
          "Anti-Role Escalation: Concedeu cargos sensíveis sem estar na Whitelist",
        )
        .catch(() => {});
    }

    // 3. Notificação Crítica no PV do Dono
    const ownerUser = await guild.client.users
      .fetch(OWNER_LOG_ID)
      .catch(() => null);
    if (ownerUser) {
      const roleNames = dangerousAddedRoles.map((r) => r.name).join(", ");
      const alertEmbed = new EmbedBuilder()
        .setTitle(
          "<a:verm_alerta2qn:1555456678256975974> [SEGURANÇA] ESCALAÇÃO DE CARGO NEUTRALIZADA",
        )
        .setDescription(
          `Uma tentativa não autorizada de conceder cargo com permissões administrativas foi bloqueada em **${guild.name}**.\n\n` +
            `👤 **Executor:** ${executor.tag} (\`${executor.id}\`)\n` +
            `🎯 **Alvo:** ${newMember.user.tag} (\`${newMember.id}\`)\n` +
            `🛡️ **Cargo(s) Interceptado(s):** \`${roleNames}\`\n\n` +
            `Ação tomada: Cargos removidos do alvo e cargos editáveis do executor foram revogados.`,
        )
        .setColor(0xff0000)
        .setTimestamp();

      await ownerUser.send({ embeds: [alertEmbed] }).catch(() => {});
    }
  } catch (error) {
    console.error("[ROLE ESCALATION ERROR]", error);
  }
};
