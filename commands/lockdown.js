// commands/lockdown.js
const {
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");

// Função interna auxiliar para ler a Whitelist do .env
const getWhitelistIds = () => {
  const whitelistEnv = process.env.WHITELIST_IDS || "";
  return whitelistEnv
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
};

// 🛡️ SISTEMA DE LOCKDOWN AUTOMÁTICO INTELIGENTE (ANTI-RAID)
const triggerAutoLockdown = async (
  guild,
  reason = "Atividade suspeita em massa detectada",
) => {
  try {
    const CHANNELS = guild.channels.cache.filter(
      (c) =>
        c.type === ChannelType.GuildText ||
        c.type === ChannelType.GuildAnnouncement,
    );

    let count = 0;
    for (const [id, channel] of CHANNELS) {
      try {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: false,
        });
        count++;
      } catch (e) {
        // Ignora canais sem permissão de edição
      }
    }

    const EMOJI_ALERT = "🚨";
    const COLOR_ERROR = 0xff0000;

    const alertEmbed = new EmbedBuilder()
      .setTitle(`${EMOJI_ALERT} LOCKDOWN AUTOMÁTICO ACIONADO (ANTI-RAID)`)
      .setDescription(
        `O servidor foi trancado automaticamente para proteção contra um ataque/raid.\n\n` +
          `📌 **Motivo da Ativação:** \`${reason}\`\n` +
          `🔒 **Canais Afetados:** ${count} canais bloqueados.`,
      )
      .setColor(COLOR_ERROR)
      .setTimestamp();

    // 1. Envia aviso no canal de logs de segurança se configurado
    const securityLogId = process.env.SECURITY_LOG_ID;
    if (securityLogId) {
      const logChannel = guild.channels.cache.get(securityLogId);
      if (logChannel) {
        await logChannel.send({ embeds: [alertEmbed] }).catch(() => {});
      }
    }

    // 2. Notifica todos os donos no PV (Direct Message) com segurança contra falhas de DM fechada
    const whitelistIds = getWhitelistIds();
    for (const ownerId of whitelistIds) {
      try {
        const ownerUser = await guild.client.users.fetch(ownerId);
        if (ownerUser) {
          await ownerUser.send({
            content: `⚠️ **ALERTA CRÍTICO DE SEGURANÇA - ${guild.name}**`,
            embeds: [alertEmbed],
          });
        }
      } catch (dmErr) {
        console.log(
          `[LOCKDOWN AUTO] Não foi possível enviar DM para o dono ID ${ownerId}`,
        );
      }
    }

    console.log(
      `[LOCKDOWN AUTOMÁTICO] Servidor ${guild.name} trancado devido a: ${reason}`,
    );
    return true;
  } catch (err) {
    console.error("[ERRO FATAL NO TRIGGER AUTO-LOCKDOWN]:", err);
    return false;
  }
};

module.exports = {
  triggerAutoLockdown,

  // --- TRANCA UM CANAL (Manual) ---
  handleLockdown: async (message) => {
    const EMOJI_SECURITY = process.env.EMOJI_SECURITY || "🔒";
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const COLOR_ERROR = process.env.COLOR_ERROR
      ? parseInt(process.env.COLOR_ERROR.replace("#", ""), 16)
      : 0xff0000;

    const WHITELIST_IDS = getWhitelistIds();
    if (!WHITELIST_IDS.includes(message.author.id)) {
      return message.channel.send(
        `${EMOJI_SECURITY} Apenas membros da Whitelist podem trancar o canal.`,
      );
    }

    const channel = message.channel;

    try {
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: false,
      });

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJI_SECURITY} CANAL TRANCADO`)
        .setDescription("Este canal foi bloqueado manualmente.")
        .setColor(COLOR_ERROR);

      message.channel.send({ embeds: [embed] });
    } catch (e) {
      console.error(e);
      message.channel.send(`${EMOJI_ERROR} Erro ao tentar trancar este canal.`);
    }
  },

  // --- TRANCA TODOS OS CANAIS - GLOBAL (Manual) ---
  handleLockdownAll: async (message) => {
    const EMOJI_SECURITY = process.env.EMOJI_SECURITY || "🔒";
    const EMOJI_ALERT = process.env.EMOJI_ALERT || "🚨";

    const WHITELIST_IDS = getWhitelistIds();
    if (!WHITELIST_IDS.includes(message.author.id)) {
      return message.channel.send(
        `${EMOJI_SECURITY} Apenas membros da Whitelist podem iniciar Lockdown Global.`,
      );
    }

    const channels = message.guild.channels.cache.filter(
      (c) =>
        c.type === ChannelType.GuildText ||
        c.type === ChannelType.GuildAnnouncement,
    );

    await message.channel.send(
      `${EMOJI_ALERT} **INICIANDO LOCKDOWN GLOBAL...** (${channels.size} canais detectados).`,
    );

    let count = 0;
    for (const [id, channel] of channels) {
      try {
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
          SendMessages: false,
        });
        count++;
      } catch (e) {
        console.log(`Falha ao trancar ${channel.name}: ${e.message}`);
      }
    }

    message.channel.send(
      `${EMOJI_SECURITY} **SUCESSO:** ${count} canais foram trancados.`,
    );
  },

  // --- DESTRANCA UM CANAL (Manual) ---
  handleUnlockdown: async (message) => {
    const EMOJI_UNLOCK = process.env.EMOJI_UNLOCK || "🔓";
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const COLOR_SUCCESS = process.env.COLOR_SUCCESS
      ? parseInt(process.env.COLOR_SUCCESS.replace("#", ""), 16)
      : 0x00ff00;

    const WHITELIST_IDS = getWhitelistIds();
    if (!WHITELIST_IDS.includes(message.author.id)) return;

    const channel = message.channel;

    try {
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: null,
      });

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJI_UNLOCK} CANAL DESTRANCADO`)
        .setDescription("Chat liberado.")
        .setColor(COLOR_SUCCESS);

      message.channel.send({ embeds: [embed] });
    } catch (e) {
      message.channel.send(`${EMOJI_ERROR} Erro ao destrancar.`);
    }
  },

  // --- DESTRANCA TODOS OS CANAIS - GLOBAL (Manual) ---
  handleUnlockdownAll: async (message) => {
    const EMOJI_UNLOCK = process.env.EMOJI_UNLOCK || "🔓";
    const EMOJI_SUCCESS = process.env.EMOJI_SUCCESS || "✅";

    const WHITELIST_IDS = getWhitelistIds();
    if (!WHITELIST_IDS.includes(message.author.id)) return;

    const channels = message.guild.channels.cache.filter(
      (c) =>
        c.type === ChannelType.GuildText ||
        c.type === ChannelType.GuildAnnouncement,
    );

    await message.channel.send(
      `${EMOJI_UNLOCK} **INICIANDO DESBLOQUEIO GLOBAL...** (${channels.size} canais).`,
    );

    let count = 0;
    for (const [id, channel] of channels) {
      try {
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
          SendMessages: null,
        });
        count++;
      } catch (e) {
        console.log(`Falha ao destrancar ${channel.name}`);
      }
    }

    message.channel.send(
      `${EMOJI_SUCCESS} **SUCESSO:** ${count} canais foram liberados.`,
    );
  },
};
