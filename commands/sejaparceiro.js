const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "sejaparceiro",
  description: "Envia a embed oficial de parceria na 2QN.",
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
        "https://media.discordapp.net/attachments/1558933994467500174/1566562416333033662/1E857174-95A7-419A-9A2C-F6C7991A8E17.png?ex=6ae8fe71&is=6ae7acf1&hm=13ff83d507d5201e97378375229f16ffdcf54119592984e6e37fb6bb6429ab9f&=&format=webp&quality=lossless&width=1280&height=512",
      )
      .setDescription(
        "**<a:am_aliana2qn:1556881754076348547> SEJA PARCEIRO • 2QN NETWORK**\n\n" +
          "Quer crescer junto com uma comunidade que ferve 24/7? A gente fortalece quem corre com a gente.\n\n" +
          "Nosso foco principal são **streamers e criadores de conteúdo**, mas estamos sempre abertos a conversar sobre qualquer outra proposta de parceria que seja boa para os dois lados.\n\n\n" +
          "**<:ama_coroa2qn:1535775618615087154> VIP STREAM • VANTAGENS EXCLUSIVAS:**\n" +
          "• Notificação automática da sua live assim que abrir transmissão.\n" +
          "• Cargo exclusivo destacado no topo do servidor (<@&1535758466294096033>).\n" +
          "• Benefícios e vantagens do cargo <@&1566520876252401814>.\n" +
          "• Acesso liberado ao chat de divulgação <#1535759130298421258>.\n" +
          "• Permissão de enviar imagens no chat.\n" +
          "• Call privada + tag personalizada.\n" +
          "• Sorteios exclusivos para parceiros.\n\n\n" +
          "**<:roxo2qnavisos:1556916486398939186> COMO FECHAR PARCERIA:**\n" +
          "Seja você streamer ou dono de algum projeto/ideia pra somar com a 2QN, chame no privado um dos responsáveis:\n\n" +
          "<:roxo1_st2QN:1560333690301583390> <@697947696702554223>\n" +
          "<:roxo1_st2QN:1560333690301583390> <@1551147533454282806>",
      )
      .setFooter({ text: "2QN Network • O topo é o único caminho." });

    await message.channel.send({ embeds: [embed] });
  },
};
