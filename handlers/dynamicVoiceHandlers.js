// handlers/dynamicVoiceHandler.js
const { ChannelType } = require("discord.js");

const CATEGORY_ID = "1535753779314430043";
const IGNORED_CHANNEL_ID = "1571297862124306613"; // 🔒 ID do canal fixo/imune

const AVAILABLE_NAMES = [
  "ballena",
  "vivencias",
  "Área 51",
  "perdas & ganhos",
  "1337",
  "scarface",
];

let isProcessing = false;

module.exports = async (oldState, newState) => {
  const guild = newState.guild || oldState.guild;
  if (!guild) return;

  if (isProcessing) return;
  isProcessing = true;

  try {
    // 1. Busca os canais da categoria, IGNORANDO o canal protegido
    const categoryChannels = guild.channels.cache.filter(
      (c) =>
        c.parentId === CATEGORY_ID &&
        c.type === ChannelType.GuildVoice &&
        c.id !== IGNORED_CHANNEL_ID, // 👈 Aqui ele ignora o canal imune
    );

    if (categoryChannels.size === 0) {
      isProcessing = false;
      return;
    }

    const emptyChannels = [];
    const populatedChannels = [];

    categoryChannels.forEach((channel) => {
      const humansCount = channel.members.filter((m) => !m.user.bot).size;
      if (humansCount === 0) {
        emptyChannels.push(channel);
      } else {
        populatedChannels.push(channel);
      }
    });

    // 2. REGRA DE CRIAÇÃO: Se não há nenhuma call dinâmica vazia
    if (emptyChannels.length === 0) {
      const activeNames = new Set(
        categoryChannels.map((c) => c.name.toLowerCase()),
      );
      const availableNamesFiltered = AVAILABLE_NAMES.filter(
        (name) => !activeNames.has(name.toLowerCase()),
      );

      const nameToUse =
        availableNamesFiltered.length > 0
          ? availableNamesFiltered[
              Math.floor(Math.random() * availableNamesFiltered.length)
            ]
          : `call-${categoryChannels.size + 1}`;

      await guild.channels.create({
        name: nameToUse,
        type: ChannelType.GuildVoice,
        parent: CATEGORY_ID,
        reason: "Auto-gerenciador: Todas as calls dinâmicas estavam ocupadas.",
      });
    }
    // 3. REGRA DE LIMPEZA: Se houver mais de 1 call vazia
    else if (emptyChannels.length > 1) {
      const channelsToDelete = emptyChannels.slice(1);

      for (const channel of channelsToDelete) {
        await channel
          .delete("Auto-gerenciador: Excesso de calls vazias.")
          .catch(() => {});
      }
    }
  } catch (error) {
    console.error("[DYNAMIC VOICE ERROR]:", error);
  } finally {
    isProcessing = false;
  }
};
