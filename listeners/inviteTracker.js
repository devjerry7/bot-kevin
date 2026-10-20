// listeners/inviteTracker.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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
  if (!invitesCache.has(invite.guild.id)) {
    invitesCache.set(invite.guild.id, new Map());
  }
  const guildInvites = invitesCache.get(invite.guild.id);
  guildInvites.set(invite.code, {
    code: invite.code,
    uses: invite.uses || 0,
    inviterId: invite.inviter?.id || null,
  });
}

/**
 * Remove do cache quando um convite é deletado ou expira
 */
async function handleInviteDelete(invite) {
  if (invitesCache.has(invite.guild.id)) {
    invitesCache.get(invite.guild.id).delete(invite.code);
  }
}

/**
 * Processa a entrada do membro para descobrir qual convite foi utilizado
 */
async function handleMemberAdd(member) {
  try {
    const { guild } = member;
    if (!guild || member.user.bot) return;

    if (!invitesCache.has(guild.id)) return;

    const oldInvites = invitesCache.get(guild.id);
    const newInvites = await guild.invites.fetch().catch(() => null);
    if (!newInvites) return;

    let usedInvite = null;

    // Compara os usos atuais com o cache anterior
    for (const [code, newInvite] of newInvites) {
      const oldInvite = oldInvites.get(code);
      if (oldInvite && newInvite.uses > oldInvite.uses) {
        usedInvite = newInvite;
        break;
      }
    }

    // Atualiza o cache com os novos dados de uso
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

      // Verifica se o membro que convidou é um streamer cadastrado e ativo
      const streamerRecord = await prisma.streamer.findFirst({
        where: { discordUserId: inviterDiscordId, enabled: true },
      });

      if (streamerRecord) {
        // Incrementa os convites da semana no banco de dados
        await prisma.streamer.update({
          where: { id: streamerRecord.id },
          data: {
            weeklyInvites: {
              increment: 1,
            },
          },
        });
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
