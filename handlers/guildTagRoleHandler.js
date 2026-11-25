// handlers/guildTagRoleHandler.js
const {
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");
const config = require("../config");

const TAG_ROLE_ID = "1541990508640084008";
const THANK_YOU_CATEGORY_ID = "1535753779314430042";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Verifica se o membro está utilizando a tag oficial do servidor atual
 * e habilitada no perfil.
 */
function hasServerTagEquipped(member) {
  if (!member || !member.user || member.user.bot || !member.guild) {
    return false;
  }

  const primaryGuild = member.user.primaryGuild;
  if (!primaryGuild) return false;

  return (
    primaryGuild.identityGuildId === member.guild.id &&
    primaryGuild.identityEnabled === true
  );
}

/**
 * Localiza o primeiro canal de texto da categoria alvo onde o bot pode enviar mensagens.
 */
function getFirstCategoryTextChannel(guild, botMember) {
  if (!guild) return null;

  const textChannels = guild.channels.cache
    .filter(
      (ch) =>
        ch.parentId === THANK_YOU_CATEGORY_ID &&
        ch.type === ChannelType.GuildText,
    )
    .sort((a, b) => a.rawPosition - b.rawPosition);

  for (const [, channel] of textChannels) {
    if (!botMember) return channel;
    const perms = channel.permissionsFor(botMember);
    if (
      perms &&
      perms.has(PermissionFlagsBits.ViewChannel) &&
      perms.has(PermissionFlagsBits.SendMessages) &&
      perms.has(PermissionFlagsBits.EmbedLinks)
    ) {
      return channel;
    }
  }

  return null;
}

/**
 * Envia o embed de agradecimento no primeiro chat da categoria configurada
 * sem fazer menção/ping ao cargo.
 */
async function sendTagEquippedEmbed(guild, botMember, member, role) {
  try {
    const targetChannel = getFirstCategoryTextChannel(guild, botMember);
    if (!targetChannel) {
      console.warn(
        `[GUILD TAG ROLE] Nenhum canal de texto encontrado na categoria ${THANK_YOU_CATEGORY_ID} para enviar agradecimento.`,
      );
      return;
    }

    const embedColor = process.env.COLOR_BASE
      ? parseInt(process.env.COLOR_BASE.replace("#", ""), 16)
      : config.colorInfo || 0x962dc0;

    const tagLabel = member.user.primaryGuild?.tag
      ? `[${member.user.primaryGuild.tag}]`
      : "da nossa tag";

    const thankYouEmbed = new EmbedBuilder()
      .setTitle(
        "<a:01roxo1_heart2qn:1560755540710260776> Tag Equipada • Obrigado pelo Apoio!",
      )
      .setDescription(
        `Obrigado ${member} por ajudar a contribuir com a estética do servidor usando **${tagLabel}**! <a:09amarelo_hootingstar2qn:1567102220632072263>\n\n` +
          `Você foi premiado com o cargo **${role.name}** e todas as permissões que ele possui.`,
      )
      .setColor(embedColor)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({
        text: `${guild.name} • Sistema de Tag`,
        iconURL: guild.iconURL({ dynamic: true }) || undefined,
      })
      .setTimestamp();

    await targetChannel.send({ embeds: [thankYouEmbed] });
  } catch (error) {
    console.error(
      `[GUILD TAG ROLE EMBED ERROR - ${member?.id}]:`,
      error.message || error,
    );
  }
}

/**
 * Sincroniza o cargo da tag para um único membro (adiciona se tiver tag, remove se não tiver).
 * @param {import("discord.js").GuildMember} member
 * @param {{ sendEmbedOnEquip?: boolean }} options
 */
async function syncMemberTagRole(member, options = {}) {
  const { sendEmbedOnEquip = true } = options;

  try {
    if (!member || !member.guild || member.user?.bot) return false;

    const guild = member.guild;
    const role =
      guild.roles.cache.get(TAG_ROLE_ID) ||
      (await guild.roles.fetch(TAG_ROLE_ID).catch(() => null));

    if (!role) {
      console.warn(
        `[GUILD TAG ROLE] Cargo ${TAG_ROLE_ID} não encontrado na guilda ${guild.id}.`,
      );
      return false;
    }

    // Garante que o bot consegue gerenciar esse cargo na hierarquia
    const botMember =
      guild.members.me || (await guild.members.fetchMe().catch(() => null));
    if (!botMember || role.position >= botMember.roles.highest.position) {
      console.warn(
        `[GUILD TAG ROLE] Cargo ${role.name} (${role.id}) está acima ou no mesmo nível do cargo do bot.`,
      );
      return false;
    }

    // Garante GuildMember completo caso venha parcial
    const fullMember = member.partial
      ? await member.fetch().catch(() => null)
      : member;
    if (!fullMember) return false;

    const shouldHaveRole = hasServerTagEquipped(fullMember);
    const currentlyHasRole = fullMember.roles.cache.has(TAG_ROLE_ID);

    if (shouldHaveRole && !currentlyHasRole) {
      await fullMember.roles.add(
        role,
        "Tag oficial do servidor equipada no perfil.",
      );
      console.log(
        `[GUILD TAG ROLE] Cargo adicionado para ${fullMember.user.tag} (${fullMember.id}).`,
      );

      if (sendEmbedOnEquip) {
        await sendTagEquippedEmbed(guild, botMember, fullMember, role);
      }

      return true;
    }

    if (!shouldHaveRole && currentlyHasRole) {
      await fullMember.roles.remove(
        role,
        "Tag oficial do servidor removida ou desativada no perfil.",
      );
      console.log(
        `[GUILD TAG ROLE] Cargo removido de ${fullMember.user.tag} (${fullMember.id}).`,
      );
      return true;
    }

    return false;
  } catch (error) {
    if (error.code === 50013) {
      console.error(
        `[GUILD TAG ROLE] Sem permissão (50013) ao alterar cargo para ${member?.id}.`,
      );
    } else if (error.code !== 10007) {
      console.error(
        `[GUILD TAG ROLE ERROR - ${member?.id}]:`,
        error.message || error,
      );
    }
    return false;
  }
}

/**
 * Varre os membros de uma guilda para sincronizar quem tem ou não a tag
 * sem disparar o embed de boas-vindas em massa no startup.
 */
async function syncGuildTagRoles(guild) {
  if (!guild) return;

  try {
    const members = await guild.members.fetch().catch(() => null);
    if (!members) return;

    let updatedCount = 0;

    for (const [, member] of members) {
      if (member.user.bot) continue;

      const shouldHaveRole = hasServerTagEquipped(member);
      const currentlyHasRole = member.roles.cache.has(TAG_ROLE_ID);

      if (shouldHaveRole !== currentlyHasRole) {
        const changed = await syncMemberTagRole(member, {
          sendEmbedOnEquip: false,
        });
        if (changed) {
          updatedCount++;
          await sleep(400);
        }
      }
    }

    if (updatedCount > 0) {
      console.log(
        `[GUILD TAG ROLE] Sincronização concluída em ${guild.name}: ${updatedCount} cargo(s) atualizado(s).`,
      );
    }
  } catch (error) {
    console.error(
      `[GUILD TAG SYNC ERROR - ${guild.id}]:`,
      error.message || error,
    );
  }
}

module.exports = {
  TAG_ROLE_ID,
  THANK_YOU_CATEGORY_ID,
  hasServerTagEquipped,
  syncMemberTagRole,
  syncGuildTagRoles,
};
