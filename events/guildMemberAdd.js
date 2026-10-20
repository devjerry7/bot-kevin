// events/guildMemberAdd.js
const { EmbedBuilder } = require("discord.js");
const { triggerAutoLockdown } = require("../commands/lockdown");
const { handleMemberAdd } = require("../listeners/inviteTracker");

const OWNER_LOG_ID = "1551147533454282806";

// Configurações do Raid Spike
const TIME_WINDOW_MS = 10000; // Janela de 10 segundos
const MAX_JOINS = 5; // Máximo de entradas permitidas na janela

// Armazena as entradas recentes por servidor: Map<guildId, Array<timestamp>>
const joinTracker = new Map();
// Armazena os membros recentes para ação punitiva no disparo: Map<guildId, Array<GuildMember>>
const recentMembers = new Map();

module.exports = async (member) => {
  try {
    const { guild } = member;
    if (!guild) return;

    // ====================================================
    // 1. RASTREAMENTO DE CONVITE DO STREAMER (+1 convite)
    // ====================================================
    handleMemberAdd(member).catch((err) =>
      console.error("[INVITE TRACKER ERROR]", err),
    );

    // ====================================================
    // 2. SISTEMA ANTI-RAID (Proteção contra surto de entradas)
    // ====================================================
    const now = Date.now();

    // Inicializa os rastreadores do servidor se não existirem
    if (!joinTracker.has(guild.id)) joinTracker.set(guild.id, []);
    if (!recentMembers.has(guild.id)) recentMembers.set(guild.id, []);

    const timestamps = joinTracker.get(guild.id);
    const membersList = recentMembers.get(guild.id);

    // Registra a nova entrada
    timestamps.push(now);
    membersList.push(member);

    // Remove entradas mais antigas que a janela de 10 segundos
    while (timestamps.length > 0 && now - timestamps[0] > TIME_WINDOW_MS) {
      timestamps.shift();
      membersList.shift();
    }

    // 🚨 CHECAGEM DE RAID SPIKE THRESHOLD
    if (timestamps.length >= MAX_JOINS) {
      console.warn(
        `[ANTI-RAID] Detectado pico de entradas simultâneas em ${guild.name} (${timestamps.length} membros em 10s)!`,
      );

      // 1. Aciona o Lockdown Automático do Servidor
      await triggerAutoLockdown(
        guild,
        `Anti-Raid Trigger: Pico de ${timestamps.length} entradas detectado em menos de 10 segundos.`,
      ).catch(() => {});

      // 2. Expulsa/Bane os membros que participaram do surto de raid
      const membersToPunish = [...membersList];
      let punishedCount = 0;

      for (const raider of membersToPunish) {
        if (raider.bannable) {
          await raider
            .ban({
              reason:
                "[SISTEMA ANTI-RAID] Entradas simultâneas suspeitas em massa.",
            })
            .then(() => punishedCount++)
            .catch(() => {});
        }
      }

      // Limpa os rastreadores para evitar loops de disparo
      joinTracker.set(guild.id, []);
      recentMembers.set(guild.id, []);

      // 3. Notificação Crítica no PV do Dono
      const ownerUser = await guild.client.users
        .fetch(OWNER_LOG_ID)
        .catch(() => null);
      if (ownerUser) {
        const alertEmbed = new EmbedBuilder()
          .setTitle(
            "<a:verm_alerta2qn:1555456678256975974> [SEGURANÇA] RAID DE ENTRADAS NEUTRALIZADO",
          )
          .setDescription(
            `Um pico de entradas em massa (Raid) foi interceptado no servidor **${guild.name}**.\n\n` +
              `📊 **Entradas Detectadas:** \`${timestamps.length}\` contas em menos de 10 segundos.\n` +
              `🔨 **Membros Banidos:** \`${punishedCount}\` contas envolvidas no surto.\n` +
              `🔒 **Status do Servidor:** Lockdown de emergência ativado automaticamente.`,
          )
          .setColor(0xff0000)
          .setTimestamp();

        await ownerUser.send({ embeds: [alertEmbed] }).catch(() => {});
      }
    }
  } catch (error) {
    console.error("[GUILD MEMBER ADD ERROR]", error);
  }
};
