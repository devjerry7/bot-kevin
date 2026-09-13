const { PermissionsBitField } = require("discord.js");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../../config");

module.exports = {
  name: "ffend",
  description:
    "Encerra o torneio atual, deleta as calls de voz e limpa o banco de dados.",
  async execute(message, args) {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.channel.send(
        `${config.emoji.error || "❌"} Apenas administradores podem usar este comando.`,
      );
    }

    await message.channel.send(
      `${config.emoji.loading || "⏳"} **Iniciando a limpeza e encerramento do torneio...**`,
    );

    // 1. Busca todas as equipes para encontrar os IDs das calls de voz criadas
    const teams = await prisma.ffTeam.findMany();
    let deletedChannelsCount = 0;

    for (const team of teams) {
      if (team.channelId) {
        try {
          const channel = await message.guild.channels
            .fetch(team.channelId)
            .catch(() => null);
          if (channel) {
            await channel.delete("Torneio de Free Fire encerrado.");
            deletedChannelsCount++;
          }
        } catch (err) {
          console.error(`Erro ao deletar call da ${team.teamName}:`, err);
        }
      }
    }

    // 2. Limpa os dados do torneio no banco de dados
    await prisma.ffMatch.deleteMany({});
    await prisma.ffTeam.deleteMany({});
    await prisma.ffParticipant.deleteMany({});

    // Reseta o status do torneio
    await prisma.ffTournament.upsert({
      where: { id: "main" },
      update: { isOpen: false },
      create: { id: "main", isOpen: false },
    });

    return message.channel.send(
      `${config.emoji.success || "✅"} **Torneio encerrado com sucesso!**\n` +
        `• Calls de voz deletadas: **${deletedChannelsCount}**\n` +
        `• Banco de dados limpo para a próxima edição.`,
    );
  },
};
