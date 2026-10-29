// listeners/streamerVoiceTracker.js
const prisma = require("../database");
const streamerConfig = require("../config/streamerConfig");

module.exports = async (oldState, newState) => {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const streamerRoleId = streamerConfig.streamerRoleId;
  const monitoredCategories = streamerConfig.monitoredVoiceCategoryIds || [];

  const hasStreamerRole = member.roles.cache.has(streamerRoleId);
  if (!hasStreamerRole) return;

  const userId = member.id;
  const oldChannel = oldState.channel;
  const newChannel = newState.channel;

  const oldCategoryId = oldChannel ? oldChannel.parentId : null;
  const newCategoryId = newChannel ? newChannel.parentId : null;

  const wasInMonitoredCategory =
    oldCategoryId && monitoredCategories.includes(oldCategoryId);
  const isInMonitoredCategory =
    newCategoryId && monitoredCategories.includes(newCategoryId);

  const now = new Date();

  try {
    // Busca o streamer estritamente no banco (NÃO cria mais automaticamente)
    const streamerRecord = await prisma.streamer.findFirst({
      where: { discordUserId: userId, enabled: true },
    });

    // Se o usuário não estiver cadastrado oficialmente como streamer, ignoramos o rastreamento
    if (!streamerRecord) return;

    // CENÁRIO A: Entrou em uma categoria monitorada e não tinha registro de entrada ativo
    if (!wasInMonitoredCategory && isInMonitoredCategory) {
      if (!streamerRecord.voiceJoinedAt) {
        await prisma.streamer.update({
          where: { id: streamerRecord.id },
          data: { voiceJoinedAt: now },
        });
      }
    }

    // CENÁRIO B: Saiu de uma categoria monitorada (ou saiu totalmente da call)
    else if (
      wasInMonitoredCategory &&
      (!isInMonitoredCategory || !newChannel)
    ) {
      if (streamerRecord.voiceJoinedAt) {
        const joinTime = new Date(streamerRecord.voiceJoinedAt).getTime();
        const durationMinutes = Math.floor(
          (now.getTime() - joinTime) / (1000 * 60),
        );

        if (durationMinutes > 0) {
          await prisma.streamer.update({
            where: { id: streamerRecord.id },
            data: {
              weeklyVoiceMinutes: {
                increment: durationMinutes,
              },
              voiceJoinedAt: null, // Limpa o timestamp de entrada
            },
          });
        } else {
          // Limpa mesmo se o tempo for menor que 1 minuto para evitar travar o estado
          await prisma.streamer.update({
            where: { id: streamerRecord.id },
            data: { voiceJoinedAt: null },
          });
        }
      }
    }
  } catch (err) {
    console.error("[STREAMER VOICE TRACKER DB ERROR]:", err);
  }
};
