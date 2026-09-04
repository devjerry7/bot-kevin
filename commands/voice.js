// commands/voice.js
const { PermissionsBitField } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");

module.exports = {
  handleVoice: async (message, args, command) => {
    // --- Lendo variáveis do .env ---
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_SECURITY = process.env.EMOJI_SECURITY || "🔒";
    const EMOJI_SPEAKER = process.env.EMOJI_SPEAKER || "🔊";
    const EMOJI_WAVE = process.env.EMOJI_WAVE || "👋";

    // Apenas Staff pode mandar o bot entrar/sair (Segurança)
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)
    ) {
      return message.reply(
        `${EMOJI_SECURITY} Você não tem permissão para controlar o bot na call.`,
      );
    }

    const voiceChannel = message.member.voice.channel;

    // --- COMANDO: k!join / k!entrar ---
    if (command === "join" || command === "entrar") {
      if (!voiceChannel) {
        return message.reply(
          `${EMOJI_ERROR} Você precisa estar em um canal de voz primeiro!`,
        );
      }

      try {
        joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
          selfDeaf: false,
          selfMute: false,
        });

        return message.channel.send(
          `${EMOJI_SPEAKER} Conectado ao canal **${voiceChannel.name}**!`,
        );
      } catch (error) {
        console.error("[VOICE JOIN ERROR]:", error);
        return message.channel.send(`${EMOJI_ERROR} Erro ao tentar conectar.`);
      }
    }

    // --- COMANDO: k!leave / k!sair ---
    if (command === "leave" || command === "sair") {
      const connection = getVoiceConnection(message.guild.id);

      if (!connection) {
        return message.reply(
          `${EMOJI_ERROR} Eu não estou conectado em nenhum canal de voz.`,
        );
      }

      connection.destroy();
      return message.channel.send(
        `${EMOJI_WAVE} Desconectado do canal de voz.`,
      );
    }
  },
};
