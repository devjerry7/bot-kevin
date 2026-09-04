// commands/nuke.js
const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  handleNuke: async (message) => {
    // --- Lendo variáveis estéticas do .env ---
    const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
    const EMOJI_NUKE = process.env.EMOJI_NUKE || "💥";
    const GIF_NUKE = process.env.GIF_NUKE;
    const COLOR_ERROR = process.env.COLOR_ERROR
      ? parseInt(process.env.COLOR_ERROR.replace("#", ""), 16)
      : 0xff0000;

    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)
    ) {
      return message.reply(
        `${EMOJI_ERROR} Você precisa de permissão de **Gerenciar Canais** para usar este comando.`,
      );
    }

    const channel = message.channel;
    const position = channel.position;

    try {
      // Cria um clone do canal com as mesmas configurações
      const newChannel = await channel.clone();

      // Define a posição correta e deleta o antigo
      await newChannel.setPosition(position);
      await channel.delete();

      const nukeEmbed = new EmbedBuilder()
        .setTitle(`${EMOJI_NUKE} CANAL RESETADO`)
        .setDescription(
          "Este canal foi recriado. O histórico foi completamente limpo.",
        )
        .setImage(GIF_NUKE)
        .setColor(COLOR_ERROR)
        .setFooter({ text: `Ação realizada por ${message.author.tag}` });

      await newChannel.send({ embeds: [nukeEmbed] });
    } catch (error) {
      console.error("[NUKE ERROR] Falha ao resetar o canal:", error);
      // Se o canal já foi deletado e der erro na recriação, tenta mandar na DM
      message.author
        .send(
          `${EMOJI_ERROR} Ocorreu um erro ao tentar resetar o canal. Verifique se o bot tem permissão suficiente.`,
        )
        .catch(() => {});
    }
  },
};
