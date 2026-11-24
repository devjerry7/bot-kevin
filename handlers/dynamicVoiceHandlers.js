// handlers/dynamicVoiceHandlers.js
const { ChannelType } = require("discord.js");

const CATEGORY_ID = "1535753779314430043";

// 🔒 LISTA BLINDADA DE CANAIS FIXOS/IMUNES (Jamais serão deletados)
const IGNORED_CHANNEL_IDS = new Set([
  "1535754635351162901",
  "1572019029000847543",
  "1572019229471809696",
  "1535754703613329579",
  "1572019374955430028",
  "1535758916133199883",
  "1572019512361091164",
  "1572019699896553553",
  "1548859310145146980",
  "1572019924203995246",
  "1549213649502216342",
  "1548427161751396372",
  "1572020126495150160",
]);

const AVAILABLE_NAMES = [
  "ballena",
  "vivencias",
  "Área 51",
  "perdas & ganhos",
  "1337",
  "scarface",
  "vandal",
  "smg",
  "ump",
  "capudos",
];

// Controles de concorrência para evitar duplicação ou delete duplo
let isProcessing = false;
let pendingReRun = false;
const deletingChannels = new Set();

async function syncCategoryChannels(guild) {
  if (!guild) return;

  // Filtra todos os canais de voz da categoria alvo que não estão sendo deletados agora
  const allCategoryChannels = guild.channels.cache.filter(
    (c) =>
      c.parentId === CATEGORY_ID &&
      c.type === ChannelType.GuildVoice &&
      !deletingChannels.has(c.id),
  );

  if (allCategoryChannels.size === 0) return;

  // Agrupa os canais pelo limite de usuários (userLimit: 2, 3, 4, 5, 8, 10...)
  const groupsByLimit = new Map();

  allCategoryChannels.forEach((channel) => {
    const limit = channel.userLimit || 0;
    if (!groupsByLimit.has(limit)) {
      groupsByLimit.set(limit, []);
    }
    groupsByLimit.get(limit).push(channel);
  });

  // Coleta nomes ativos em minúsculo para evitar nomes repetidos
  const activeNames = new Set(
    allCategoryChannels.map((c) => c.name.trim().toLowerCase()),
  );

  for (const [limit, channels] of groupsByLimit.entries()) {
    // Ignora salas sem limite (userLimit === 0), a menos que existam apenas elas
    if (limit === 0) continue;

    const emptyAll = [];
    const emptyDynamic = [];
    let fullCount = 0;

    for (const channel of channels) {
      const humansCount = channel.members.filter((m) => !m.user.bot).size;

      if (humansCount === 0) {
        emptyAll.push(channel);
        if (!IGNORED_CHANNEL_IDS.has(channel.id)) {
          emptyDynamic.push(channel);
        }
      }

      if (humansCount >= limit) {
        fullCount++;
      }
    }

    // 1. REGRA DE CRIAÇÃO POR LIMITE:
    // Se TODAS as calls desse limite (ex: 2 de 2, 2 de 3, 2 de 4...) estiverem lotadas (fullCount === channels.length)
    // e não houver nenhuma vazia desse limite, cria +1 call dinâmica com o mesmo userLimit
    if (fullCount === channels.length && emptyAll.length === 0) {
      const availableNamesFiltered = AVAILABLE_NAMES.filter(
        (name) => !activeNames.has(name.trim().toLowerCase()),
      );

      const baseName =
        availableNamesFiltered.length > 0
          ? availableNamesFiltered[
              Math.floor(Math.random() * availableNamesFiltered.length)
            ]
          : `call-${allCategoryChannels.size + 1}`;

      activeNames.add(baseName.trim().toLowerCase());

      // Pega uma call de referência do mesmo grupo para herdar a posição logo abaixo dela
      const referenceChannel = channels[channels.length - 1];
      const targetPosition = referenceChannel
        ? referenceChannel.position + 1
        : undefined;

      console.log(
        `[DYNAMIC VOICE] Grupo [${limit} vagas] lotado (${fullCount}/${channels.length})! Criando call "${baseName}" (${limit} vagas)...`,
      );

      try {
        const newChannel = await guild.channels.create({
          name: baseName,
          type: ChannelType.GuildVoice,
          parent: CATEGORY_ID,
          userLimit: limit,
          position: targetPosition,
          reason: `Auto-gerenciador: Todas as calls de ${limit} vagas estavam cheias.`,
        });

        console.log(
          `[DYNAMIC VOICE] Sucesso! Call criada: ${newChannel.name} (${newChannel.id}) [${limit} vagas]`,
        );
      } catch (err) {
        console.error(
          `[DYNAMIC VOICE CREATE ERROR - Limite ${limit}]:`,
          err.message || err,
        );
      }
    }
    // 2. REGRA DE LIMPEZA POR LIMITE:
    // Se o grupo tiver mais de 1 call vazia (ex: as 2 fixas esvaziaram + sobrou 1 dinâmica vazia)
    // e pelo menos uma delas não estiver lotada, remove APENAS as dinâmicas vazias excedentes
    else if (emptyAll.length > 1 && emptyDynamic.length > 0) {
      const excessCount = emptyAll.length - 1;
      const channelsToDelete = emptyDynamic.slice(0, excessCount);

      for (const channel of channelsToDelete) {
        // Dupla verificação de blindagem
        if (IGNORED_CHANNEL_IDS.has(channel.id)) continue;
        if (deletingChannels.has(channel.id)) continue;
        if (!guild.channels.cache.has(channel.id)) continue;

        // Confirma mais uma vez se ainda está 100% vazia antes de deletar
        const currentHumans = channel.members.filter((m) => !m.user.bot).size;
        if (currentHumans > 0) continue;

        deletingChannels.add(channel.id);

        console.log(
          `[DYNAMIC VOICE] Deletando call dinâmica excedente [${limit} vagas]: ${channel.name} (${channel.id})`,
        );

        try {
          await channel.delete(
            `Auto-gerenciador: Excesso de calls vazias no grupo de ${limit} vagas.`,
          );
        } catch (err) {
          if (err.code !== 10003) {
            console.error(
              `[DYNAMIC VOICE DELETE ERROR - ${channel.id}]:`,
              err.message || err,
            );
          }
        } finally {
          deletingChannels.delete(channel.id);
        }
      }
    }
  }
}

module.exports = async (oldState, newState) => {
  try {
    // Só processa se houve mudança real de canal (entrada, saída ou troca)
    if (oldState?.channelId === newState?.channelId) return;

    const guild = newState?.guild || oldState?.guild;
    if (!guild) return;

    // Só processa se o canal anterior ou o novo canal pertencer à categoria alvo
    const oldParent = oldState?.channel?.parentId;
    const newParent = newState?.channel?.parentId;
    if (oldParent !== CATEGORY_ID && newParent !== CATEGORY_ID) return;

    // Se já estiver processando uma atualização, agenda uma rechecagem logo em seguida
    if (isProcessing) {
      pendingReRun = true;
      return;
    }

    isProcessing = true;

    do {
      pendingReRun = false;
      await syncCategoryChannels(guild);
    } while (pendingReRun);
  } catch (error) {
    console.error("[DYNAMIC VOICE CRITICAL ERROR]:", error);
  } finally {
    isProcessing = false;
  }
};