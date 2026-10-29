// listeners/inviteTracker.js
const prisma = require("../database");

// Cache em memória para armazenar os convites do servidor: Map<guildId, Map<inviteCode, inviteObject>>
const invitesCache = new Map();

/**
 * Carrega e armazena em cache todos os convites ativos do servidor ao iniciar o bot
 */
async function loadServerInvites(client) {
  try {
    for (const [guildId, guild] of client.guilds.cache) {
      if (!guild.members.me?.permissions.has("ManageGuild")) continue;

      const firstInvites = await guild.invites.fetch().catch(() => null);
      if (!firstInvites) continue;

      const guildInvites = new Map();
      firstInvites.forEach((invite) => {
        guildInvites.set(invite.code, {
          code: invite.code,
          uses: invite.uses || 0,
          inviterId: invite.inviter?.id || null,
        });
      });

      invitesCache.set(guildId, guildInvites);
    }
    console.log("[InviteTracker] Cache de convites inicializado com sucesso.");
  } catch (err) {
    console.error("[InviteTracker] Erro ao carregar convites iniciais:", err);
  }
}

/**
 * Atualiza o cache quando um convite é criado
 */
async function handleInviteCreate(invite) {
  try {
    if (!invitesCache.has(invite.guild.id)) {
      invitesCache.set(invite.guild.id, new Map());
    }
    const guildInvites = invitesCache.get(invite.guild.id);
    guildInvites.set(invite.code, {
      code: invite.code,
      uses: invite.uses || 0,
      inviterId: invite.inviter?.id || null,
    });
  } catch (err) {
    console.error("[InviteTracker] Erro em handleInviteCreate:", err);
  }
}

/**
 * Remove do cache quando um convite é deletado ou expira
 */
async function handleInviteDelete(invite) {
  try {
    if (invitesCache.has(invite.guild.id)) {
      invitesCache.get(invite.guild.id).delete(invite.code);
    }
  } catch (err) {
    console.error("[InviteTracker] Erro em handleInviteDelete:", err);
  }
}

/**
 * Processa a entrada do membro para descobrir qual convite foi utilizado (Blindado)
 */
async function handleMemberAdd(member) {
  try {
    const { guild } = member;
    if (!guild || member.user.bot) return;

    if (!invitesCache.has(guild.id)) {
      // Se por algum motivo o cache estiver vazio, inicializa na hora
      await loadServerInvites(member.client);
    }

    const oldInvites = invitesCache.get(guild.id) || new Map();
    const newInvites = await guild.invites.fetch().catch(() => null);
    if (!newInvites) return;

    let usedInvite = null;

    // Compara os usos atuais com o cache anterior para achar o convite incrementado
    for (const [code, newInvite] of newInvites) {
      const oldInvite = oldInvites.get(code);
      const oldUses = oldInvite ? oldInvite.uses : 0;

      if (newInvite.uses > oldUses) {
        usedInvite = newInvite;
        break;
      }
    }

    // Atualiza o cache imediatamente com os novos dados
    const guildInvites = new Map();
    newInvites.forEach((invite) => {
      guildInvites.set(invite.code, {
        code: invite.code,
        uses: invite.uses || 0,
        inviterId: invite.inviter?.id || null,
      });
    });
    invitesCache.set(guild.id, guildInvites);

    if (usedInvite && usedInvite.inviter) {
      const inviterDiscordId = usedInvite.inviter.id;

      // Verifica se quem criou o convite é um streamer cadastrado e ativo
      const streamerRecord = await prisma.streamer.findFirst({
        where: { discordUserId: inviterDiscordId, enabled: true },
      });

      if (streamerRecord) {
        // Incrementa os convites da semana no banco de dados para este streamer
        await prisma.streamer.update({
          where: { id: streamerRecord.id },
          data: {
            weeklyInvites: {
              increment: 1,
            },
          },
        });
        console.log(
          `[InviteTracker] Novo convite contabilizado para o streamer ${streamerRecord.displayName || inviterDiscordId} via link code: ${usedInvite.code}`,
        );
      }
    }
  } catch (err) {
    console.error("[InviteTracker ERROR]", err);
  }
}

module.exports = {
  loadServerInvites,
  handleInviteCreate,
  handleInviteDelete,
  handleMemberAdd,
};
