// commands/help.js
const { getGuildConfig } = require("../utils/guildConfigManager");
const { createGuildEmbed } = require("../utils/embedFactory"); // <--- A MÁGICA

module.exports = {
  name: "help",
  description: "Mostra a lista de comandos.",
  async execute(message, args) {
    // 1. Pega Config do Banco
    const config = await getGuildConfig(message.guild.id);
    const PREFIX = config.prefix || "k!";

    // 2. Cria o Embed usando a Fábrica (Já vem com cor e banner do banco)
    const embed = await createGuildEmbed(message.guild.id);

    embed.setTitle(`🛠️ Central de Ajuda - ${message.client.user.username}`);
    embed.setDescription(`O prefixo atual neste servidor é: **\`${PREFIX}\`**`);

    embed.addFields(
      {
        name: "💰 Economia",
        value: `\`${PREFIX}atm\`, \`${PREFIX}work\`, \`${PREFIX}daily\``,
        inline: true,
      },
      {
        name: "💎 VIP",
        value: `\`${PREFIX}vip\`, \`${PREFIX}criarsala\``,
        inline: true,
      },
      {
        name: "🛡️ Moderação",
        value: `\`${PREFIX}ban\`, \`${PREFIX}kick\`, \`${PREFIX}mute\``,
        inline: true,
      },
      {
        name: "⚙️ Configuração",
        value: `Use **/config** para personalizar este bot.`,
      }
    );

    embed.setFooter({
      text: `Solicitado por ${message.author.tag}`,
      iconURL: message.author.displayAvatarURL(),
    });

    message.channel.send({ embeds: [embed] });
  },
};
