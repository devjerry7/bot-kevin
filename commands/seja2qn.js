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
      .setColor("#6600ff")
      .setImage(
        "https://cdn.discordapp.com/attachments/1558933994467500174/1566553378916663306/79E16801-04C2-43B5-92E5-6B0AA9201759.png?ex=6ae8f606&is=6ae7a486&hm=9bf6204255b1d3faee020036d52cade146e5f667b126c5dfacaa51f5956af027&",
      )
      .setDescription(
        "**<:roxo_div2QN:1566557524541444146> 2QN • FAÇA PARTE DO TIME**\n\n" +
          "Quer fazer parte do time?\n\n" +
          "Escolha sua área e fale direto com o responsável:\n\n\n" +
          "**<:roxo_visual2QN:1566557759804276887> ESTÉTICA**\n" +
          "Deixar o servidor bem frufru, padronizado e com moral no visual.\n" +
          "Liderança: <@946092563536941126> & <@496716578205990922>\n\n\n" +
          "**<:roxo_mov2QN:1566557594544513114> DIV**\n" +
          "Trazer gente nova, colocar o servidor pra frente e expandir nossa base.\n" +
          "Liderança: <@343961792462061579> & <@789865303588601876>\n\n\n" +
          "**<:roxo_midia2QN:1566557686403833876> MÍDIA**\n" +
          "Estourar nas redes, cortar vídeo, fazer TikTok e botar a marca pra rodar na internet.\n" +
          "Liderança: <@1524007175825915964> & <@849327062976430100>\n\n\n" +
          "**<:roxo_rec2Qn:1566557832927514795> MOV**\n" +
          "Manter a call cheia, o chat vivo, dar recepção pra geral e não deixar a casa cair no tédio.\n" +
          "Liderança: <@1519030281947054245>",
      )
      .setFooter({ text: "2QN • O topo é o único caminho." });

    await message.channel.send({ embeds: [embed] });
  },
};
