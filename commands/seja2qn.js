const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "seja2qn",
  description: "Envia a embed oficial de recrutamento para a staff da 2QN.",
  async execute(message, args, client) {
    // Trava opcional para garantir que apenas administradores possam disparar o comando
    if (
      message.member &&
      !message.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return message.reply(
        "❌ Você precisa ser Administrador para usar este comando.",
      );
    }

    // Deleta a mensagem do comando para o chat ficar limpo
    if (message.deletable) {
      await message.delete().catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor("#3c00ff") // Cor padrão limpa (Dark / Discord aesthetic)
      .setTitle("<:roxo_2qn:1566228040223162468> 2QN • ENTRE PRO TIME")
      .setDescription(
        "Quer fazer parte do império e construir o ecossistema que mais cresce? Aqui a cobrança é justa, o reconhecimento é real e quem corre pelo certo só tem a ganhar.\n\n" +
          "Escolha sua área de atuação abaixo e entre em contato com o responsável direto:",
      )
      .addFields(
        {
          name: "🎨 ESTÉTICA & VISUAL",
          value:
            "**O que faz:** Organização visual, padronização do servidor e identidade gráfica.\n" +
            "**O que você ganha:** Visibilidade, portfólio de peso e liberdade criativa.\n" +
            "**Liderança:** <@946092563536941126> & <@496716578205990922>",
          inline: false,
        },
        {
          name: "🚀 DIV (DIVULGAÇÃO & RECRUTAMENTO)",
          value:
            "**O que faz:** Expansão de fronteiras, captação de membros e atração de sangue novo.\n" +
            "**O que você ganha:** Destaque por resultado, aprendizado de táticas reais e prioridade em cargos de liderança.\n" +
            "**Liderança:** <@343961792462061579> & <@789865303588601876>",
          inline: false,
        },
        {
          name: "🎬 MÍDIA (MARKETING & REDES)",
          value:
            "**O que faz:** Cortes, TikTok, Reels e explosão da marca nas redes sociais.\n" +
            "**O que você ganha:** Alcance gigante nas redes oficiais, domínio de engajamento e contato direto com criadores.\n" +
            "**Liderança:** <@1524007175825915964> & <@849327062976430100>",
          inline: false,
        },
        {
          name: "🔥 MOV (MOVIMENTAÇÃO & RECEPÇÃO)",
          value:
            "**O que faz:** Recepção impecável, chat ativo e calls movimentadas para manter a casa viva.\n" +
            "**O que você ganha:** Networking diário com membros e streamers, influência direta no clima da comunidade e moral na base.\n" +
            "**Liderança:** <@1519030281947054245>",
          inline: false,
        },
      )
      .setImage(
        "https://cdn.discordapp.com/attachments/1555226500066836490/1566530652227117056/IMG_0185.png?ex=6ae8e0dc&is=6ae78f5c&hm=f9774062b307a23c0f33e774f695b3279f4a2d8e7877622264be591505cdcdf1&",
      )
      .setFooter({ text: "2QN Network • O topo é o único caminho." });

    // Envia a embed no canal onde o comando foi executado
    await message.channel.send({ embeds: [embed] });
  },
};
