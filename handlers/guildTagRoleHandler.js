// handlers/guildTagRoleHandler.js
const {
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("../config");

const TAG_ROLE_ID = "1541990508640084008";
const THANK_YOU_CATEGORY_ID = "1535753779314430042";

const OPT_OUT_DIR = path.join(__dirname, "..", "data");
const OPT_OUT_FILE = path.join(OPT_OUT_DIR, "guildTagOptOut.json");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Carrega os IDs de usuários que optaram por não receber o cargo da tag.
 * Nunca lança erro caso o arquivo não exista ou esteja inválido.
 */
function loadOptOutUsers() {
  try {
    if (!fs.existsSync(OPT_OUT_FILE)) {
      return new Set();
    }

    const raw = fs.readFileSync(OPT_OUT_FILE, "utf8");
    if (!raw || !raw.trim()) {
      return new Set();
    }

    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed?.optOutUsers)
      ? parsed.optOutUsers
      : Array.isArray(parsed)
        ? parsed
        : [];

    return new Set(
      list
        .map((id) => String(id).trim())
        .filter((id) => /^\d{17,20}$/.test(id)),
    );
  } catch (error) {
    console.error("[GUILD TAG OPT-OUT READ ERROR]:", error.message || error);
    return new Set();
  }
}

/**
 * Salva os IDs de opt-out em disco de forma segura.
 */
function saveOptOutUsers(optOutSet) {
  try {
    if (!fs.existsSync(OPT_OUT_DIR)) {
      fs.mkdirSync(OPT_OUT_DIR, { recursive: true });
    }

    const payload = JSON.stringify(
      {
        optOutUsers: Array.from(optOutSet),
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    );

    const tempFile = `${OPT_OUT_FILE}.tmp`;
    fs.writeFileSync(tempFile, payload, "utf8");
    fs.renameSync(tempFile, OPT_OUT_FILE);
    return true;
  } catch (error) {
    console.error("[GUILD TAG OPT-OUT SAVE ERROR]:", error.message || error);
    return false;
  }
}

/**
 * Verifica se o usuário está na lista de opt-out do cargo da tag.
 */
function isUserOptedOut(userId) {
  if (!userId) return false;
  const optOutSet = loadOptOutUsers();
  return optOutSet.has(String(userId));
}

/**
 * Adiciona um usuário à lista de opt-out.
 */
function addUserToOptOut(userId) {
  if (!userId) return false;
  const optOutSet = loadOptOutUsers();
  const normalizedId = String(userId);
  if (optOutSet.has(normalizedId)) return false;

  optOutSet.add(normalizedId);
  return saveOptOutUsers(optOutSet);
}

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
 * Detecta quando o membro tinha o cargo da tag e perdeu/retirou mantendo a tag equipada,
 * registrando o ID na lista de opt-out para não devolver o cargo automaticamente.
 */
async function handleTagRoleOptOutCheck(oldMember, newMember) {
  try {
    const targetMember = newMember || oldMember;
    if (!targetMember || !targetMember.guild || targetMember.user?.bot) {
      return false;
    }

    const hadRoleBefore = Boolean(oldMember?.roles?.cache?.has(TAG_ROLE_ID));
    const hasRoleNow = Boolean(newMember?.roles?.cache?.has(TAG_ROLE_ID));

    if (hadRoleBefore && !hasRoleNow) {
      const fullMember = newMember?.partial
        ? await newMember.fetch().catch(() => newMember)
        : newMember;

      if (fullMember && hasServerTagEquipped(fullMember)) {
        const added = addUserToOptOut(fullMember.id);
        if (added) {
          console.log(
            `[GUILD TAG OPT-OUT] ${fullMember.user.tag} (${fullMember.id}) removido do cargo automático da tag.`,
          );
        }
        return added;
      }
    }

    return false;
  } catch (error) {
    console.error("[GUILD TAG OPT-OUT CHECK ERROR]:", error.message || error);
    return false;
  }
}

/**
 * Sincroniza o cargo da tag para um único membro (adiciona se tiver tag e não estiver em opt-out,
 * remove se não tiver tag).
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
    const optedOut = isUserOptedOut(fullMember.id);

    if (shouldHaveRole && !currentlyHasRole && !optedOut) {
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
 * respeitando opt-out e sem disparar o embed de boas-vindas em massa no startup.
 */
async function syncGuildTagRoles(guild) {
  if (!guild) return;

  try {
    const members = await guild.members.fetch().catch(() => null);
    if (!members) return;

    const optOutSet = loadOptOutUsers();
    let updatedCount = 0;

    for (const [, member] of members) {
      if (member.user.bot) continue;

      const shouldHaveRole = hasServerTagEquipped(member);
      const currentlyHasRole = member.roles.cache.has(TAG_ROLE_ID);
      const optedOut = optOutSet.has(String(member.id));

      if (
        (shouldHaveRole && !currentlyHasRole && !optedOut) ||
        (!shouldHaveRole && currentlyHasRole)
      ) {
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
  isUserOptedOut,
  addUserToOptOut,
  handleTagRoleOptOutCheck,
  syncMemberTagRole,
  syncGuildTagRoles,
};
