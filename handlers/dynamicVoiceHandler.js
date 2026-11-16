// handlers/dynamicVoiceHandlers.js
const { ChannelType } = require("discord.js");

const CATEGORY_ID = "1535753779314430043";

// 🔒 LISTA BLINDADA DE CANAIS FIXOS/IMUNES (Jamais serão deletados, mas entram na contagem de salas vazias)
const IGNORED_CHANNEL_IDS = [
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
  // 1. FILTRO DE PERFORMANCE: Só executa se alguém realmente entrou, saiu ou trocou de canal
  if (oldState.channelId === newState.channelId) return;

  const guild = newState.guild || oldState.guild;
  if (!guild) return;

  // Só processa se a movimentação envolveu a categoria alvo
  const oldParent = oldState?.channel?.parentId;
  const newParent = newState?.channel?.parentId;
  if (oldParent !== CATEGORY_ID && newParent !== CATEGORY_ID) return;

  if (isProcessing) return;
  isProcessing = true;

  try {
    // Busca todos os canais de voz da categoria (fixos + dinâmicos)
    const allCategoryChannels = guild.channels.cache.filter(
      (c) => c.parentId === CATEGORY_ID && c.type === ChannelType.GuildVoice,
    );

    if (allCategoryChannels.size === 0) {
      isProcessing = false;
      return;
    }

    // Separa todas as calls vazias da categoria e quais delas são dinâmicas (deletáveis)
    const allEmptyChannels = [];
    const emptyDynamicChannels = [];

    allCategoryChannels.forEach((channel) => {
      const humansCount = channel.members.filter((m) => !m.user.bot).size;
      if (humansCount === 0) {
        allEmptyChannels.push(channel);
        if (!IGNORED_CHANNEL_IDS.includes(channel.id)) {
          emptyDynamicChannels.push(channel);
        }
      }
    });

    console.log(
      `[DYNAMIC VOICE] Total Categoria: ${allCategoryChannels.size} | Vazias Total: ${allEmptyChannels.length} | Vazias Dinâmicas: ${emptyDynamicChannels.length}`,
    );

    // 2. REGRA DE CRIAÇÃO: Só cria se TODAS as calls da categoria (fixas + dinâmicas) tiverem pelo menos 1 membro
    if (allEmptyChannels.length === 0) {
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
          : `call-${allCategoryChannels.size + 1}`;

      console.log(
        `[DYNAMIC VOICE] Todas as calls da categoria ocupadas! Criando nova call: "${nameToUse}"...`,
      );

      const newChannel = await guild.channels.create({
        name: nameToUse,
        type: ChannelType.GuildVoice,
        parent: CATEGORY_ID,
        reason:
          "Auto-gerenciador: Todas as calls da categoria estavam ocupadas.",
      });

      console.log(
        `[DYNAMIC VOICE] Sucesso! Canal criado: ${newChannel.name} (${newChannel.id})`,
      );
    }
    // 3. REGRA DE LIMPEZA: Se houver mais de 1 call vazia no total da categoria, apaga apenas as dinâmicas excedentes
    else if (allEmptyChannels.length > 1 && emptyDynamicChannels.length > 0) {
      // Calcula quantas calls vazias excedentes precisamos apagar para sobrar apenas 1 vazia no total
      const excessCount = allEmptyChannels.length - 1;
      const channelsToDelete = emptyDynamicChannels.slice(0, excessCount);

      for (const channel of channelsToDelete) {
        if (!guild.channels.cache.has(channel.id)) continue;

        console.log(
          `[DYNAMIC VOICE] Deletando call dinâmica vazia excedente: ${channel.name} (${channel.id})`,
        );
        await channel
          .delete("Auto-gerenciador: Excesso de calls vazias na categoria.")
          .catch((err) => {
            if (err.code !== 10003) console.error("[DELETE ERROR]:", err);
          });
      }
    }
  } catch (error) {
    console.error("[DYNAMIC VOICE CREATE ERROR]:", error);
  } finally {
    isProcessing = false;
  }
};
