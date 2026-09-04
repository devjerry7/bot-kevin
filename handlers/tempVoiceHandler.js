// handlers/tempVoiceHandler.js
const { ChannelType, PermissionsBitField } = require("discord.js");

module.exports = async (oldState, newState) => {
  // Puxando os IDs direto do .env
  const JOIN_TO_CREATE_ID = process.env.JOIN_TO_CREATE_ID;
  const TEMP_CATEGORY_ID = process.env.TEMP_CATEGORY_ID;

  // Se por acaso os IDs não estiverem no .env, não faz nada para não dar erro
  if (!JOIN_TO_CREATE_ID || !TEMP_CATEGORY_ID) return;

  // --- 1. USUÁRIO ENTROU NO GATILHO (CRIAR SALA) ---
  if (newState.channelId === JOIN_TO_CREATE_ID) {
    const member = newState.member;
    const guild = newState.guild;

    try {
      // Cria o canal temporário
      const voiceChannel = await guild.channels.create({
        name: `Sala de ${member.user.username}`,
        type: ChannelType.GuildVoice,
        parent: TEMP_CATEGORY_ID,
        permissionOverwrites: [
          // Permissões Padrão (Amigos podem ver/entrar)
          {
            id: guild.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.Connect,
            ],
          },
          // Permissões do Dono da Sala (Pode gerenciar tudo)
          {
            id: member.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.MuteMembers,
              PermissionsBitField.Flags.DeafenMembers,
              PermissionsBitField.Flags.MoveMembers,
            ],
          },
        ],
      });

      // Move o usuário para a nova sala
      await member.voice.setChannel(voiceChannel);
    } catch (error) {
      console.error("[TEMP VOICE ERROR] Erro ao criar sala:", error);
    }
  }

  // --- 2. USUÁRIO SAIU DE UM CANAL (VERIFICAR SE DEVE DELETAR) ---
  if (oldState.channel) {
    const channel = oldState.channel;

    // Verificações de Segurança:
    // 1. O canal pertence à categoria de temporários?
    // 2. O canal NÃO é o canal gatilho "Criar Sala"?
    // 3. Está vazio?
    if (
      channel.parentId === TEMP_CATEGORY_ID &&
      channel.id !== JOIN_TO_CREATE_ID &&
      channel.members.size === 0
    ) {
      try {
        // Aguarda 1 segundo para evitar bugs de troca rápida
        setTimeout(async () => {
          // Checa novamente se está vazio antes de deletar
          const currentChannel = await channel.guild.channels
            .fetch(channel.id)
            .catch(() => null);

          if (currentChannel && currentChannel.members.size === 0) {
            await currentChannel.delete().catch(() => {});
          }
        }, 1000);
      } catch (e) {
        console.error("[TEMP VOICE ERROR] Erro ao deletar sala:", e);
      }
    }
  }
};
