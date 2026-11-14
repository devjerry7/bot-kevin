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
    // Garante que o cache de canais da guilda está atualizado
    await guild.channels.fetch().catch(() => {});

    // 1. Busca os canais da categoria, IGNORANDO o canal protegido
    const categoryChannels = guild.channels.cache.filter(
      (c) =>
        c.parentId === CATEGORY_ID &&
        c.type === ChannelType.GuildVoice &&
        c.id !== IGNORED_CHANNEL_ID,
    );

    if (categoryChannels.size === 0) {
      isProcessing = false;
      return;
    }

    const emptyChannels = [];

    categoryChannels.forEach((channel) => {
      // Conta apenas membros humanos conectados
      const humansCount = channel.members.filter((m) => !m.user.bot).size;
      if (humansCount === 0) {
        emptyChannels.push(channel);
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

      console.log(
        `[DYNAMIC VOICE] Tentando criar nova call: "${nameToUse}" na categoria ${CATEGORY_ID}...`,
      );

      const newChannel = await guild.channels.create({
        name: nameToUse,
        type: ChannelType.GuildVoice,
        parent: CATEGORY_ID,
        reason: "Auto-gerenciador: Todas as calls dinâmicas estavam ocupadas.",
      });

      console.log(
        `[DYNAMIC VOICE] Sucesso! Canal criado com ID: ${newChannel.id}`,
      );
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
    // 🔍 AGORA QUALQUER ERRO DE PERMISSÃO VAI APARECER DETALHADO NO CONSOLE
    console.error("[DYNAMIC VOICE CREATE ERROR]:", error);
  } finally {
    isProcessing = false;
  }
};
