// handlers/tempVoiceHandler.js
const { ChannelType, PermissionsBitField } = require("discord.js");

// CONFIGURAÇÃO DIRETA (IDs que você me passou)
const JOIN_TO_CREATE_ID = "1447208962733768827"; // Canal Gatilho
const TEMP_CATEGORY_ID = "1443766901120700551"; // Categoria de Destino

module.exports = async (oldState, newState) => {
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
              PermissionsBitField.Flags.ManageChannels, // Permite mudar nome/limite
              PermissionsBitField.Flags.MuteMembers,
              PermissionsBitField.Flags.DeafenMembers,
              PermissionsBitField.Flags.MoveMembers,
            ],
          },
        ],
      });

      // Move o usuário para a nova sala
      await member.voice.setChannel(voiceChannel);

      // (Opcional) Enviar mensagem de dicas no chat da sala (se houver chat de voz ativado)
      // voiceChannel.send(`Olá ${member}! Você é o dono desta sala. Pode mudar o nome ou trancar clicando na engrenagem.`);
    } catch (error) {
      console.error("[TEMP VOICE] Erro ao criar sala:", error);
    }
  }

  // --- 2. USUÁRIO SAIU DE UM CANAL (VERIFICAR SE DEVE DELETAR) ---
  // Se o usuário saiu de um canal (oldState.channel) E esse canal não é nulo
  if (oldState.channel) {
    const channel = oldState.channel;

    // Verificações de Segurança:
    // 1. O canal pertence à categoria de temporários?
    // 2. O canal NÃO é o canal gatilho "Criar Sala"?
    // 3. O ID da categoria bate com a config?
    if (
      channel.parentId === TEMP_CATEGORY_ID &&
      channel.id !== JOIN_TO_CREATE_ID &&
      channel.members.size === 0 // Está vazio?
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
            // console.log(`[TEMP VOICE] Sala ${channel.name} deletada por inatividade.`);
          }
        }, 1000);
      } catch (e) {
        console.error("[TEMP VOICE] Erro ao deletar sala:", e);
      }
    }
  }
};
