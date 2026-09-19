// listeners/staffVoiceTracker.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = async (oldState, newState) => {
  const member = newState.member;
  if (!member || member.user.bot) return;

  // 1. Verifica se o usuário é um staff cadastrado na trilha CALL e ativo
  const staff = await prisma.staffUser.findUnique({
    where: { discordId: member.id },
  });

  if (!staff || staff.status !== "ACTIVE" || staff.trackType !== "CALL") return;

  const now = new Date();

  // Garante que o registro de tracking existe na tabela
  let tracking = await prisma.staffTracking.findUnique({
    where: { discordId: member.id },
  });

  if (!tracking) {
    tracking = await prisma.staffTracking.create({
      data: { discordId: member.id, msgCount: 0, voiceMinutes: 0 },
    });
  }

  // Condições de validade da Call
  const wasInValidCall =
    oldState.channelId && !oldState.selfMute && !oldState.selfDeaf;
  const isInValidCall =
    newState.channelId && !newState.selfMute && !newState.selfDeaf;

  // Regra: Deve ter pelo menos outra pessoa na sala (excluindo bots)
  const hasOtherPeople = newState.channel
    ? newState.channel.members.filter((m) => !m.user.bot).size > 1
    : false;

  // CASO A: Entrou em call válida / Desmutou / Outra pessoa entrou na sala
  if (!wasInValidCall && isInValidCall && hasOtherPeople) {
    await prisma.staffTracking.update({
      where: { discordId: member.id },
      data: { lastVoiceJoin: now },
    });
  }
  // CASO B: Saiu da call / Mutou / Ficou sozinho na sala
  else if (
    wasInValidCall &&
    (!isInValidCall ||
      !hasOtherPeople ||
      newState.selfMute ||
      newState.selfDeaf)
  ) {
    if (tracking.lastVoiceJoin) {
      const diffMs = now - new Date(tracking.lastVoiceJoin);
      const diffMinutes = Math.floor(diffMs / 60000); // Converte milissegundos para minutos

      if (diffMinutes > 0) {
        await prisma.staffTracking.update({
          where: { discordId: member.id },
          data: {
            voiceMinutes: { increment: diffMinutes },
            lastVoiceJoin: null,
          },
        });
      } else {
        // Limpa o join se o tempo foi irrelevante (< 1 min)
        await prisma.staffTracking.update({
          where: { discordId: member.id },
          data: { lastVoiceJoin: null },
        });
      }
    }
  }
};
