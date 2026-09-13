const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../../config");

module.exports = {
  name: "fflist",
  description:
    "Lista todos os jogadores inscritos no campeonato 2x2 de Free Fire.",
  async execute(message, args) {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.channel.send(
        `${config.emoji.error || "❌"} Você precisa ser Administrador para usar este comando.`,
      );
    }

    // Busca todos os participantes no banco
    const participants = await prisma.ffParticipant.findMany();

    if (participants.length === 0) {
      return message.channel.send(
        "Nenhum jogador se inscreveu no campeonato ainda.",
      );
    }

    // Formata a lista marcando os jogadores (ex: 1. @User)
    const formattedList = participants
      .map((p, index) => `**${index + 1}.** <@${p.userId}>`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("📋 Inscritos no Campeonato 2x2")
      .setDescription(
        `Total de inscritos: **${participants.length}**\n\n${formattedList}`,
      )
      .setColor(config.colorBase || 0x962dc0)
      .setFooter({
        text: "Use este comando para checar antes de rodar o sorteio.",
      });

    return message.channel.send({ embeds: [embed] });
  },
};
