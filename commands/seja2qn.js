const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "seja2qn",
  description: "Envia a embed oficial de recrutamento para a staff da 2QN.",
  async execute(message, args, client) {
    if (
      message.member &&
      !message.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return message.reply(
        "❌ Você precisa ser Administrador para usar este comando.",
      );
    }

    if (message.deletable) {
      await message.delete().catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setImage(
        "https://cdn.discordapp.com/attachments/1555226500066836490/1566530652227117056/IMG_0185.png?ex=6ae8e0dc&is=6ae78f5c&hm=f9774062b307a23c0f33e774f695b3279f4a2d8e7877622264be591505cdcdf1&",
      )
      .setDescription(
        "**⚡ 2QN • FAÇA PARTE DO TIME**\n\n" +
          "Quer fazer parte do time e construir o servidor que mais cresce?\n\n" +
          "Escolha sua área e fale direto com o responsável:\n\n\n" +
          "**🎨 ESTÉTICA**\n" +
          "Deixar o servidor bem frufru, padronizado e com moral no visual.\n" +
          "Liderança: <@946092563536941126> & <@496716578205990922>\n\n\n" +
          "**🚀 DIV**\n" +
          "Trazer gente nova, botar o servidor pra frente e expandir nossa base.\n" +
          "Liderança: <@343961792462061579> & <@789865303588601876>\n\n\n" +
          "**🎬 MÍDIA**\n" +
          "Estourar nas redes, cortar vídeo, fazer TikTok e botar a marca pra rodar na internet.\n" +
          "Liderança: <@1524007175825915964> & <@849327062976430100>\n\n\n" +
          "**🔥 MOV**\n" +
          "Manter a call cheia, o chat vivo, dar recepção pra geral e não deixar a casa cair no tédio.\n" +
          "Liderança: <@1519030281947054245>",
      )
      .setFooter({ text: "2QN • O topo é o único caminho." });

    await message.channel.send({ embeds: [embed] });
  },
};
