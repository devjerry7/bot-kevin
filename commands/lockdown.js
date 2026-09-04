// commands/lockdown.js
const {
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");

module.exports = {
  // --- TRANCA UM CANAL ---
  handleLockdown: async (message) => {
    const EMOJI_SECURITY = process.env.EMOJI_SECURITY || "🔒";
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const COLOR_ERROR = process.env.COLOR_ERROR
      ? parseInt(process.env.COLOR_ERROR.replace("#", ""), 16)
      : 0xff0000;

    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.channel.send(
        `${EMOJI_SECURITY} Apenas Administradores podem trancar o canal.`,
      );
    }

    const channel = message.channel;

    try {
      // Nega envio de mensagens para @everyone
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: false,
      });

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJI_SECURITY} CANAL TRANCADO`)
        .setDescription("Este canal foi bloqueado pela administração.")
        .setColor(COLOR_ERROR);

      message.channel.send({ embeds: [embed] });
    } catch (e) {
      console.error(e);
      message.channel.send(`${EMOJI_ERROR} Erro ao tentar trancar este canal.`);
    }
  },

  // --- TRANCA TODOS OS CANAIS (GLOBAL) ---
  handleLockdownAll: async (message) => {
    const EMOJI_SECURITY = process.env.EMOJI_SECURITY || "🔒";
    const EMOJI_ALERT = process.env.EMOJI_ALERT || "🚨";

    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.channel.send(
        `${EMOJI_SECURITY} Apenas Admins podem iniciar Lockdown Global.`,
      );
    }

    // Filtra apenas canais de texto
    const channels = message.guild.channels.cache.filter(
      (c) => c.type === ChannelType.GuildText,
    );

    await message.channel.send(
      `${EMOJI_ALERT} **INICIANDO LOCKDOWN GLOBAL...** (${channels.size} canais detectados). Isso pode levar um momento.`,
    );

    let count = 0;
    // Loop seguro para evitar Rate Limit
    for (const [id, channel] of channels) {
      try {
        // Atualiza a permissão
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

  // --- DESTRANCA UM CANAL ---
  handleUnlockdown: async (message) => {
    const EMOJI_UNLOCK = process.env.EMOJI_UNLOCK || "🔓";
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const COLOR_SUCCESS = process.env.COLOR_SUCCESS
      ? parseInt(process.env.COLOR_SUCCESS.replace("#", ""), 16)
      : 0x00ff00;

    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    )
      return;

    const channel = message.channel;

    try {
      // Define como null para voltar ao padrão (herdado da categoria)
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

  // --- DESTRANCA TODOS OS CANAIS (GLOBAL) ---
  handleUnlockdownAll: async (message) => {
    const EMOJI_UNLOCK = process.env.EMOJI_UNLOCK || "🔓";
    const EMOJI_SUCCESS = process.env.EMOJI_SUCCESS || "✅";

    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    )
      return;

    const channels = message.guild.channels.cache.filter(
      (c) => c.type === ChannelType.GuildText,
    );

    await message.channel.send(
      `${EMOJI_UNLOCK} **INICIANDO DESBLOQUEIO GLOBAL...** (${channels.size} canais).`,
    );

    let count = 0;
    for (const [id, channel] of channels) {
      try {
        // Reseta a permissão para o padrão (null remove o bloqueio específico)
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
