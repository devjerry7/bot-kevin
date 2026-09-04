// commands/repeat.js
const { EmbedBuilder } = require("discord.js");

module.exports = {
  handleRepeat: async (message, args) => {
    // --- Lendo variáveis do .env ---
    const PREFIX = process.env.PREFIX || "mc!";
    const COLOR_ERROR = process.env.COLOR_ERROR
      ? parseInt(process.env.COLOR_ERROR.replace("#", ""), 16)
      : 0xff0000;
    const EMOJI_QUESTION = process.env.EMOJI_QUESTION || "❓";

    // Função auxiliar para criar embeds de feedback
    const createFeedbackEmbed = (title, description, color = COLOR_ERROR) => {
      return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
    };

    const textToRepeat = args.join(" ");

    if (!textToRepeat) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            `${EMOJI_QUESTION} Uso Incorreto`,
            `Você precisa me dizer o que repetir! Use o formato \`${PREFIX}repeat <seu texto>\`.`,
          ),
        ],
      });
    }

    // Opcional: apaga a mensagem original do comando para o bot falar "limpo"
    if (message.deletable) await message.delete().catch(() => {});

    await message.channel.send(textToRepeat);
  },
};
