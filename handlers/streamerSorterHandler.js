// handlers/streamerSorterHandler.js
const { ChannelType } = require("discord.js");

const STREAMER_CATEGORY_ID = "1535757868064837681";

let isSorting = false;

module.exports = async (guild) => {
  if (!guild || isSorting) return;
  isSorting = true;

  try {
    // Garante o cache atualizado dos canais
    await guild.channels.fetch().catch(() => {});

    // Busca todos os canais de voz da categoria de streamers
    const channels = guild.channels.cache.filter(
      (c) =>
        c.parentId === STREAMER_CATEGORY_ID &&
        c.type === ChannelType.GuildVoice,
    );

    if (channels.size <= 1) {
      isSorting = false;
      return;
    }

    // Separa os canais em dois grupos: Ocupados e Vazios
    const populated = [];
    const empty = [];

    channels.forEach((channel) => {
      const humansCount = channel.members.filter((m) => !m.user.bot).size;
      if (humansCount > 0) {
        populated.push(channel);
      } else {
        empty.push(channel);
      }
    });

    // Junta na ordem desejada: Ocupados primeiro, Vazios depois
    const sortedChannels = [...populated, ...empty];

    // Atualiza a posição de cada canal na categoria (se necessário)
    for (let i = 0; i < sortedChannels.length; i++) {
      const channel = sortedChannels[i];
      if (channel.position !== i) {
        await channel.setPosition(i).catch(() => {});
      }
    }
  } catch (error) {
    console.error("[STREAMER SORTER ERROR]:", error);
  } finally {
    isSorting = false;
  }
};
