const { MessageFlags } = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../config");

module.exports = {
  name: "ffsair",
  description:
    "Remove sua inscrição do campeonato 2x2 de Free Fire caso tenha desistido.",
  async execute(message, args) {
    const tournament = await prisma.ffTournament.findUnique({
      where: { id: "main" },
    });

    if (tournament && !tournament.isOpen) {
      return message.channel.send({
        content: `${config.emoji.error || "❌"} As inscrições já foram encerradas e o campeonato já começou! Não é possível sair agora.`,
      });
    }

    try {
      const participant = await prisma.ffParticipant.findUnique({
        where: { userId: message.author.id },
      });

      if (!participant) {
        return message.channel.send({
          content: `${config.emoji.warning || "⚠️"} Você não está inscrito neste campeonato!`,
        });
      }

      await prisma.ffParticipant.delete({
        where: { userId: message.author.id },
      });

      return message.channel.send({
        content: `${config.emoji.success || "✅"} <@${message.author.id}>, sua inscrição foi cancelada com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao processar saída do torneio:", error);
      return message.channel.send({
        content: `${config.emoji.error || "❌"} Ocorreu um erro ao tentar remover sua inscrição.`,
      });
    }
  },
};
