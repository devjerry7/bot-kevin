// commands/vip.js
const {
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

// Importação corrigida para a pasta services!
const {
  addVip,
  removeVip,
  getVipData,
  addFriend,
  removeFriend,
  addVipTime,
  MAX_FRIENDS,
} = require("../services/vipManager");

const PREFIX = "k!";

// IDs dos Botões
const BTN_TAG = "vip_manage_tag";
const BTN_CHANNEL = "vip_manage_channel";
const BTN_ADD_MEMBER = "vip_add_member_role";

// ⚠️ ATENÇÃO: COLOQUE O LINK DO SEU BANNER NOVO AQUI ⚠️
const HEADER_IMAGE = "LINK_DO_SEU_BANNER_NOVO_AQUI";
const COLOR_DIAMOND = 0x00e5ff;

// Permissões de Gerente VIP
const VIP_MANAGER_ROLES = ["1435040516814147715"];

function isVipManager(member) {
  const managers = process.env.STAFF_TRUSTED_ROLES?.split(",") || [];
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.roles.cache.some(
      (role) =>
        VIP_MANAGER_ROLES.includes(role.id) || managers.includes(role.id),
    )
  );
}

// Helper Visual
const createEmbed = (title, description, color = COLOR_DIAMOND) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setImage(HEADER_IMAGE)
    .setTimestamp();
};

module.exports = {
  BTN_TAG,
  BTN_CHANNEL,
  BTN_ADD_MEMBER,

  handleVipCommands: async (message, command, args) => {
    const targetId = args[1]?.replace(/<@!?(\d+)>/, "$1");
    const firstArgTarget = args[0]?.replace(/<@!?(\d+)>/, "$1");
    const subCommand = args[0]?.toLowerCase();

    // --- 1. COMANDO k!vip (PAINEL DO USUÁRIO) ---
    if (command === "vip") {
      const userData = await getVipData(message.author.id);

      if (!userData) {
        return message.channel.send({
          embeds: [
            createEmbed(
              "💎 Status VIP",
              "Você não possui um plano VIP ativo no momento.",
            ),
          ],
        });
      }

      const expiresDate = userData.expiresAt
        ? `<t:${Math.floor(userData.expiresAt / 1000)}:R>`
        : "Nunca";
      const friendCount = userData.friends ? userData.friends.length : 0;

      const embed = new EmbedBuilder()
        .setTitle(`💎 Painel de Controle VIP`)
        .setDescription(`Gerencie seus benefícios exclusivos abaixo.`)
        .setColor(COLOR_DIAMOND)
        .setImage(HEADER_IMAGE)
        .addFields(
          {
            name: "⏱️ Expira em",
            value: expiresDate,
            inline: true,
          },
          {
            name: "🏷️ Tag Exclusiva",
            value: userData.customRoleId
              ? `<@&${userData.customRoleId}>`
              : "❌ Não criada",
            inline: true,
          },
          {
            name: "🔊 Canal Privado",
            value: userData.customChannelId
              ? `<#${userData.customChannelId}>`
              : "❌ Não criado",
            inline: true,
          },
          {
            name: "👥 Amigos",
            value: `**${friendCount}** / ${MAX_FRIENDS}`,
            inline: false,
          },
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(BTN_TAG)
          .setLabel("Configurar Tag")
          .setEmoji("🏷️")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(BTN_CHANNEL)
          .setLabel("Gerenciar Canal")
          .setEmoji("🔊")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(BTN_ADD_MEMBER)
          .setLabel("Adicionar Amigo")
          .setEmoji("👥")
          .setStyle(ButtonStyle.Secondary),
      );

      return message.channel.send({ embeds: [embed], components: [row] });
    }

    // --- 2. k!setvip @user [dias] (ADMIN) ---
    if (command === "setvip") {
      if (!isVipManager(message.member))
        return message.reply("🔒 Sem permissão.");

      const days = args[1] ? parseInt(args[1]) : 30;
      if (!firstArgTarget)
        return message.reply(`❌ Uso: \`${PREFIX}setvip @usuario [dias]\``);

      if (await addVip(firstArgTarget, days)) {
        const targetMember = await message.guild.members
          .fetch(firstArgTarget)
          .catch(() => null);
        const vipRole = message.guild.roles.cache.get(process.env.VIP_ROLE_ID);

        if (targetMember && vipRole) {
          await targetMember.roles
            .add(vipRole)
            .catch((e) => console.error("Erro ao dar cargo VIP:", e));
        }

        return message.channel.send({
          embeds: [
            createEmbed(
              "✅ Sucesso",
              `**${targetMember ? targetMember.user.tag : firstArgTarget}** agora é VIP por **${days} dias**!`,
              0x00ff00,
            ),
          ],
        });
      }
      return message.channel.send(
        "⚠️ Este usuário já está na lista VIP. Use `k!addtime` para estender.",
      );
    }

    // --- 3. k!addtime @user <dias> (RENOVAR) ---
    if (command === "addtime" || command === "renovar") {
      if (!isVipManager(message.member))
        return message.reply("🔒 Sem permissão.");

      const days = parseInt(args[1]);
      if (!firstArgTarget || !days)
        return message.reply(`❌ Uso: \`${PREFIX}addtime @usuario <dias>\``);

      const newExpire = await addVipTime(firstArgTarget, days);
      if (!newExpire) return message.reply("❌ Usuário não é VIP.");

      return message.channel.send({
        embeds: [
          createEmbed(
            "✅ Renovado",
            `Tempo adicionado! Novo vencimento: <t:${Math.floor(newExpire / 1000)}:F>`,
            0x00ff00,
          ),
        ],
      });
    }

    // --- 4. k!vipadm rem (ADMIN REMOVE) ---
    if (command === "vipadm" && subCommand === "rem") {
      if (!isVipManager(message.member))
        return message.reply("🔒 Sem permissão.");

      const result = await removeVip(targetId);

      if (result.success) {
        const tm = await message.guild.members
          .fetch(targetId)
          .catch(() => null);
        const vr = message.guild.roles.cache.get(process.env.VIP_ROLE_ID);
        if (tm && vr) await tm.roles.remove(vr);

        if (result.customRoleId) {
          const cr = message.guild.roles.cache.get(result.customRoleId);
          if (cr) await cr.delete("VIP Removido").catch(() => {});
        }
        if (result.customChannelId) {
          const cc = message.guild.channels.cache.get(result.customChannelId);
          if (cc) await cc.delete("VIP Removido").catch(() => {});
        }
        return message.channel.send({
          embeds: [
            createEmbed(
              "🗑️ VIP Removido",
              "Benefícios, tag e canal deletados.",
              0xff0000,
            ),
          ],
        });
      }
      return message.channel.send("⚠️ Usuário não era VIP.");
    }

    // --- 5. k!addvip / k!remvip (TEXTO) ---
    if (command === "addvip" || command === "remvip") {
      const vipData = await getVipData(message.author.id);
      if (!vipData)
        return message.channel.send(
          "💎 Apenas usuários VIP podem usar este comando.",
        );

      const friendId = args[0]?.replace(/<@!?(\d+)>/, "$1");
      if (!friendId)
        return message.channel.send(`Uso: \`${PREFIX}${command} @amigo\``);

      if (!vipData.customRoleId)
        return message.channel.send(
          "❌ Crie sua Tag Exclusiva no painel `k!vip` primeiro.",
        );

      const customRole = message.guild.roles.cache.get(vipData.customRoleId);
      if (!customRole)
        return message.channel.send(
          "❌ Erro: Sua tag exclusiva não foi encontrada (deletada?).",
        );

      const friendMember = await message.guild.members
        .fetch(friendId)
        .catch(() => null);
      if (!friendMember) return message.channel.send("Usuário não encontrado.");

      if (command === "addvip") {
        const result = await addFriend(message.author.id, friendId);
        if (result.success) {
          await friendMember.roles.add(customRole);
          return message.channel.send({
            embeds: [
              createEmbed(
                "✅ Amigo Adicionado",
                `**${friendMember.user.tag}** recebeu sua tag!`,
                0x00ff00,
              ),
            ],
          });
        } else {
          return message.channel.send(`❌ Erro: ${result.msg}`);
        }
      }

      if (command === "remvip") {
        const result = await removeFriend(message.author.id, friendId);
        if (result.success) {
          await friendMember.roles.remove(customRole);
          return message.channel.send({
            embeds: [
              createEmbed(
                "🗑️ Amigo Removido",
                `**${friendMember.user.tag}** foi removido da sua tag.`,
              ),
            ],
          });
        } else {
          return message.channel.send(`❌ Erro: ${result.msg}`);
        }
      }
    }
  },
};
