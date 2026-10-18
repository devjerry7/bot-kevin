// listeners/streamerVoiceTracker.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const streamerConfig = require("../config/streamerConfig");

const streamerVoiceSessions = new Map();

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

  const now = Date.now();

  // CENÁRIO A: Entrou em uma categoria monitorada
  if (!wasInMonitoredCategory && isInMonitoredCategory) {
    streamerVoiceSessions.set(userId, now);
  }

  // CENÁRIO B: Saiu de uma categoria monitorada
  else if (wasInMonitoredCategory && (!isInMonitoredCategory || !newChannel)) {
    if (streamerVoiceSessions.has(userId)) {
      const joinTime = streamerVoiceSessions.get(userId);
      const durationMinutes = Math.floor((now - joinTime) / (1000 * 60));

      if (durationMinutes > 0) {
        try {
          // Utilizando o campo correto do schema: discordUserId
          let streamerRecord = await prisma.streamer.findFirst({
            where: { discordUserId: userId },
          });

          if (!streamerRecord) {
            streamerRecord = await prisma.streamer.create({
              data: {
                discordUserId: userId,
                displayName: member.user.tag,
                enabled: true,
              },
            });
          }

          await prisma.streamer.update({
            where: { id: streamerRecord.id },
            data: {
              weeklyVoiceMinutes: {
                increment: durationMinutes,
              },
            },
          });
        } catch (err) {
          console.error("[STREAMER VOICE TRACKER DB ERROR]:", err);
        }
      }

      streamerVoiceSessions.delete(userId);
    }
  }
};
