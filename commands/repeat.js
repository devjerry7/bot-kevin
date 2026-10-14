// commands/repeat.js
const { EmbedBuilder } = require("discord.js");
const config = require("../config");

module.exports = {
  handleRepeat: async (message, args) => {
    const PREFIX = config.prefix || "mc!";
    const COLOR_ERROR = config.colorError || 0xff0000;
    const EMOJI_ERROR = "<:br_errado2qn:1556905095919050762>";

    // Função auxiliar para criar embeds de feedback
    const createFeedbackEmbed = (title, description, color = COLOR_ERROR) => {
      return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
    };

    // --- VERIFICAÇÃO DE DONOS DIRETO DO CONFIG.JS ---
    const allowedOwners = [config.vip.owner1Id, config.vip.owner2Id].filter(
      Boolean,
    );

    if (!allowedOwners.includes(message.author.id)) {
      if (message.deletable) await message.delete().catch(() => {});
      return message.channel
        .send({
          embeds: [
            createFeedbackEmbed(
              `${EMOJI_ERROR} Acesso Negado`,
              `Eu respondo somente ao dede e o jerry \`${PREFIX}repeat\`.`,
            ),
          ],
        })
        .then((msg) => {
          setTimeout(() => msg.delete().catch(() => {}), 5000);
        });
    }

    const textToRepeat = args.join(" ");

    if (!textToRepeat) {
      return message.channel.send({
        embeds: [
          createFeedbackEmbed(
            `${EMOJI_ERROR} Uso Incorreto`,
            `Você precisa me dizer o que repetir! Use o formato \`${PREFIX}repeat <seu texto>\`.`,
          ),
        ],
      });
    }

    // Apaga a mensagem original do comando para o bot falar limpo
    if (message.deletable) await message.delete().catch(() => {});

    await message.channel.send(textToRepeat);
  },
};
