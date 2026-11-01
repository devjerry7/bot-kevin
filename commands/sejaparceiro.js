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
      .setColor("#2b2d31")
      .setImage(
        "https://cdn.discordapp.com/attachments/1555226500066836490/1566530652227117056/IMG_0185.png?ex=6ae8e0dc&is=6ae78f5c&hm=f9774062b307a23c0f33e774f695b3279f4a2d8e7877622264be591505cdcdf1&",
      )
      .setDescription(
        "**🎥 SEJA PARCEIRO • 2QN NETWORK**\n\n" +
          "Quer crescer junto com uma comunidade que ferve 24/7? A gente fortalece quem corre com a gente.\n\n" +
          "Nosso foco principal são **streamers e criadores de conteúdo**, mas estamos sempre abertos a conversar sobre qualquer outra proposta de parceria que seja boa para os dois lados.\n\n\n" +
          "**👑 VIP STREAM • VANTAGENS EXCLUSIVAS:**\n" +
          "• Notificação automática da sua live assim que abrir transmissão.\n" +
          "• Cargo exclusivo destacado no topo do servidor (<@&1535758466294096033>).\n" +
          "• Benefícios e vantagens do cargo <@&1566520876252401814>.\n" +
          "• Acesso liberado ao chat de divulgação <#1535759130298421258>.\n" +
          "• Permissão de enviar imagens no chat.\n" +
          "• Call privada + tag personalizada.\n" +
          "• Sorteios exclusivos para parceiros.\n\n\n" +
          "**📩 COMO FECHAR PARCERIA:**\n" +
          "Seja você streamer ou dono de algum projeto/ideia pra somar com a 2QN, chame no privado um dos responsáveis:\n\n" +
          "👉 <@697947696702554223>\n" +
          "👉 <@1551147533454282806>",
      )
      .setFooter({ text: "2QN Network • O topo é o único caminho." });

    await message.channel.send({ embeds: [embed] });
  },
};
