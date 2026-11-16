// handlers/dynamicVoiceHandlers.js
const { ChannelType } = require("discord.js");

const CATEGORY_ID = "1535753779314430043";

// 🔒 LISTA BLINDADA DE CANAIS FIXOS/IMUNES (Jamais serão deletados ou contados como dinâmicos)
const IGNORED_CHANNEL_IDS = [
  "1571297862124306613",
  "1535754635351162901",
  "1535754703613329579",
  "1535758916133199883",
  "1549213649502216342",
  "1548427161751396372",
  "1548859310145146980",
];

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

    // 1. Pega apenas os canais de voz que pertencem estritamente à categoria dinâmica
    const allCategoryChannels = guild.channels.cache.filter(
      (c) => c.parentId === CATEGORY_ID && c.type === ChannelType.GuildVoice,
    );

    if (allCategoryChannels.size === 0) {
      isProcessing = false;
      return;
    }

    // 2. Separa APENAS as calls dinâmicas (excluindo os canais fixos/imunes da lista)
    const dynamicChannels = allCategoryChannels.filter(
      (c) => !IGNORED_CHANNEL_IDS.includes(c.id),
    );

    const emptyDynamicChannels = [];

    dynamicChannels.forEach((channel) => {
      // Conta apenas membros humanos conectados na call dinâmica
      const humansCount = channel.members.filter((m) => !m.user.bot).size;
      if (humansCount === 0) {
        emptyDynamicChannels.push(channel);
      }
    });

    console.log(
      `[DYNAMIC VOICE] Total Dinâmicas: ${dynamicChannels.size} | Vazias: ${emptyDynamicChannels.length}`,
    );

    // 3. REGRA DE CRIAÇÃO: Se todas as calls dinâmicas estiverem ocupadas (0 vazias)
    if (emptyDynamicChannels.length === 0) {
      const activeNames = new Set(
        allCategoryChannels.map((c) => c.name.toLowerCase()),
      );
      const availableNamesFiltered = AVAILABLE_NAMES.filter(
        (name) => !activeNames.has(name.toLowerCase()),
      );

      const nameToUse =
        availableNamesFiltered.length > 0
          ? availableNamesFiltered[
              Math.floor(Math.random() * availableNamesFiltered.length)
            ]
          : `call-${dynamicChannels.size + 1}`;

      console.log(
        `[DYNAMIC VOICE] Todas as dinâmicas cheias! Criando nova call: "${nameToUse}"...`,
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
    // 4. REGRA DE LIMPEZA: Se houver mais de 1 call dinâmica vazia (mantém apenas 1 de sobra)
    else if (emptyDynamicChannels.length > 1) {
      // Garante de forma tripla que nenhuma sala da lista de ignorados será tocada
      const channelsToDelete = emptyDynamicChannels
        .slice(1)
        .filter((c) => !IGNORED_CHANNEL_IDS.includes(c.id));

      for (const channel of channelsToDelete) {
        console.log(
          `[DYNAMIC VOICE] Deletando call vazia excedente: ${channel.name} (${channel.id})`,
        );
        await channel
          .delete("Auto-gerenciador: Excesso de calls vazias.")
          .catch((err) => console.error("[DELETE ERROR]:", err));
      }
    }
  } catch (error) {
    console.error("[DYNAMIC VOICE CREATE ERROR]:", error);
  } finally {
    isProcessing = false;
  }
};
