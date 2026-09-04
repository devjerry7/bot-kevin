// handlers/vipHandler.js
const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");

const {
  getVipData,
  updateVipData,
  addFriend,
} = require("../services/vipManager");
const { BTN_TAG, BTN_CHANNEL, BTN_ADD_MEMBER } = require("../commands/vip");

// IDs Internos dos Modais
const MODAL_TAG = "vip_modal_tag";
const MODAL_CHANNEL = "vip_modal_channel";
const MODAL_ADD_USER = "vip_modal_add_user";

module.exports = async (interaction) => {
  const isButton = interaction.isButton();
  const isModal = interaction.isModalSubmit();

  // --- CARREGANDO VARIÁVEIS DO .ENV ---
  const BANNER_URL = process.env.BANNER_VIP || "";
  const COLOR_NEUTRAL = process.env.COLOR_NEUTRAL
    ? parseInt(process.env.COLOR_NEUTRAL.replace("#", ""), 16)
    : 0x2f3136;

  const EMOJI_SUCCESS = process.env.EMOJI_SUCCESS || "✅";
  const EMOJI_ERROR = process.env.EMOJI_ERROR || "❌";
  const EMOJI_WARNING = process.env.EMOJI_WARNING || "⚠️";
  const EMOJI_TRASH = process.env.EMOJI_TRASH || "🗑️";

  const VIP_ANCHOR_ROLE_ID = process.env.VIP_ANCHOR_ROLE_ID;
  const VIP_CATEGORY_ID = process.env.VIP_CATEGORY_ID;
  const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;

  // Helper para respostas padronizadas
  const replyEmbed = (int, title, desc) => {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(desc)
      .setColor(COLOR_NEUTRAL)
      .setTimestamp();

    if (BANNER_URL) embed.setImage(BANNER_URL);

    return int.editReply({ embeds: [embed], content: null });
  };

  // --- 1. BOTÕES (Abrem os Modais) ---
  if (
    isButton &&
    [BTN_TAG, BTN_CHANNEL, BTN_ADD_MEMBER].includes(interaction.customId)
  ) {
    if (interaction.customId === BTN_TAG) {
      const modal = new ModalBuilder()
        .setCustomId(MODAL_TAG)
        .setTitle("Configurar Tag");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("tag_name")
            .setLabel("Nome")
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("tag_color")
            .setLabel("Cor Hex (Ex: #FF0000)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false),
        ),
      );
      await interaction.showModal(modal);
    } else if (interaction.customId === BTN_CHANNEL) {
      const modal = new ModalBuilder()
        .setCustomId(MODAL_CHANNEL)
        .setTitle("Configurar Canal");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("channel_name")
            .setLabel("Nome (digite 'deletar' p/ apagar)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
      );
      await interaction.showModal(modal);
    } else if (interaction.customId === BTN_ADD_MEMBER) {
      const modal = new ModalBuilder()
        .setCustomId(MODAL_ADD_USER)
        .setTitle("Adicionar Amigo");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("friend_id")
            .setLabel("ID do Amigo")
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
      );
      await interaction.showModal(modal);
    }
    return true;
  }

  // --- 2. MODAIS (Processam a Lógica) ---
  if (
    isModal &&
    [MODAL_TAG, MODAL_CHANNEL, MODAL_ADD_USER].includes(interaction.customId)
  ) {
    await interaction.deferReply({ ephemeral: true });

    // Busca dados no Banco de Dados
    const vipData = await getVipData(interaction.user.id);

    if (!vipData) {
      return replyEmbed(
        interaction,
        "Erro",
        `${EMOJI_ERROR} Você não possui um plano VIP ativo ou seus dados foram perdidos.`,
      );
    }

    // --- A. CONFIGURAR TAG ---
    if (interaction.customId === MODAL_TAG) {
      const tagName = interaction.fields.getTextInputValue("tag_name");
      const tagColor =
        interaction.fields.getTextInputValue("tag_color") || "#FFFFFF";

      try {
        let role;
        if (vipData.customRoleId) {
          role = await interaction.guild.roles
            .fetch(vipData.customRoleId)
            .catch(() => null);
        }

        if (role) {
          await role.edit({ name: tagName, color: tagColor });
          replyEmbed(
            interaction,
            "Sucesso",
            `${EMOJI_SUCCESS} Tag editada para **${tagName}**!`,
          );
        } else {
          // Busca ID da âncora e calcula posição
          const anchorRole = VIP_ANCHOR_ROLE_ID
            ? interaction.guild.roles.cache.get(VIP_ANCHOR_ROLE_ID)
            : null;
          const position = anchorRole ? anchorRole.position - 1 : 1;

          role = await interaction.guild.roles.create({
            name: tagName,
            color: tagColor,
            position,
            reason: `VIP: ${interaction.user.tag}`,
          });

          const member = await interaction.guild.members.fetch(
            interaction.user.id,
          );
          await member.roles.add(role);

          await updateVipData(interaction.user.id, { customRoleId: role.id });

          // Se tiver canal, dá a permissão para a nova tag
          if (vipData.customChannelId) {
            const ch = await interaction.guild.channels
              .fetch(vipData.customChannelId)
              .catch(() => null);
            if (ch) {
              await ch.permissionOverwrites.edit(role.id, {
                Connect: true,
                ViewChannel: true,
              });
            }
          }

          replyEmbed(
            interaction,
            "Sucesso",
            `${EMOJI_SUCCESS} Tag **${tagName}** criada e vinculada!`,
          );
        }
      } catch (e) {
        console.error("[VIP ERROR]", e);
        replyEmbed(
          interaction,
          "Erro",
          `${EMOJI_ERROR} Falha ao configurar tag. Verifique se o meu cargo de Bot está acima da âncora VIP na configuração do servidor.`,
        );
      }
    }

    // --- B. CONFIGURAR CANAL ---
    else if (interaction.customId === MODAL_CHANNEL) {
      const channelName = interaction.fields.getTextInputValue("channel_name");

      // Deletar Canal
      if (channelName.toLowerCase() === "deletar") {
        if (vipData.customChannelId) {
          const ch = await interaction.guild.channels
            .fetch(vipData.customChannelId)
            .catch(() => null);
          if (ch) {
            await ch.delete();
            await updateVipData(interaction.user.id, { customChannelId: null });
            return replyEmbed(
              interaction,
              "Sucesso",
              `${EMOJI_TRASH} Seu canal VIP foi deletado.`,
            );
          } else {
            await updateVipData(interaction.user.id, { customChannelId: null });
            return replyEmbed(
              interaction,
              "Aviso",
              `${EMOJI_WARNING} Canal não encontrado no servidor, mas limpamos seu registro no banco de dados.`,
            );
          }
        }
        return replyEmbed(
          interaction,
          "Erro",
          `${EMOJI_ERROR} Você não tem canal para deletar.`,
        );
      }

      try {
        let channel;
        if (vipData.customChannelId) {
          channel = await interaction.guild.channels
            .fetch(vipData.customChannelId)
            .catch(() => null);
        }

        if (channel) {
          await channel.setName(channelName);
          replyEmbed(
            interaction,
            "Sucesso",
            `${EMOJI_SUCCESS} Canal renomeado para **${channelName}**.`,
          );
        } else {
          // CRIAÇÃO
          if (!VIP_CATEGORY_ID) {
            return replyEmbed(
              interaction,
              "Configuração",
              `${EMOJI_WARNING} A categoria VIP não foi configurada pelo desenvolvedor (.env).`,
            );
          }

          const overwrites = [
            // Everyone: BLOQUEADO
            {
              id: interaction.guild.id,
              deny: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.Connect,
              ],
            },
            // Dono: LIBERADO
            {
              id: interaction.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.Connect,
                PermissionsBitField.Flags.ManageChannels,
              ],
            },
          ];

          if (VERIFIED_ROLE_ID) {
            overwrites.push({
              id: VERIFIED_ROLE_ID,
              allow: [PermissionsBitField.Flags.ViewChannel],
              deny: [PermissionsBitField.Flags.Connect],
            });
          }

          if (vipData.customRoleId) {
            overwrites.push({
              id: vipData.customRoleId,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.Connect,
              ],
            });
          }

          channel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: VIP_CATEGORY_ID,
            permissionOverwrites: overwrites,
          });

          await updateVipData(interaction.user.id, {
            customChannelId: channel.id,
          });

          replyEmbed(
            interaction,
            "Sucesso",
            `${EMOJI_SUCCESS} Canal **${channelName}** criado e vinculado a você!`,
          );
        }
      } catch (e) {
        console.error("[VIP ERROR]", e);
        replyEmbed(
          interaction,
          "Erro",
          `${EMOJI_ERROR} Falha ao criar canal. Verifique se o Bot tem permissão de gerenciar canais naquela categoria.`,
        );
      }
    }

    // --- C. ADD AMIGO ---
    else if (interaction.customId === MODAL_ADD_USER) {
      const friendId = interaction.fields.getTextInputValue("friend_id");

      if (!vipData.customRoleId) {
        return replyEmbed(
          interaction,
          "Atenção",
          `${EMOJI_ERROR} Você precisa configurar sua Tag VIP primeiro.`,
        );
      }

      const role = await interaction.guild.roles
        .fetch(vipData.customRoleId)
        .catch(() => null);
      if (!role) {
        return replyEmbed(
          interaction,
          "Erro Crítico",
          `${EMOJI_ERROR} Sua Tag foi deletada do servidor. Crie-a novamente no painel.`,
        );
      }

      const friend = await interaction.guild.members
        .fetch(friendId)
        .catch(() => null);
      if (!friend) {
        return replyEmbed(
          interaction,
          "Erro",
          `${EMOJI_ERROR} O usuário não foi encontrado no servidor. Pegue o ID correto.`,
        );
      }

      const res = await addFriend(interaction.user.id, friendId);
      if (!res.success) {
        return replyEmbed(interaction, "Erro", `${EMOJI_ERROR} ${res.msg}`);
      }

      try {
        await friend.roles.add(role);
        replyEmbed(
          interaction,
          "Sucesso",
          `${EMOJI_SUCCESS} **${friend.user.tag}** recebeu sua tag VIP e agora é seu convidado!`,
        );
      } catch (e) {
        console.error("[VIP ERROR]", e);
        replyEmbed(
          interaction,
          "Erro",
          `${EMOJI_ERROR} Erro ao entregar a tag ao usuário. Verifique a hierarquia de cargos.`,
        );
      }
    }
    return true;
  }
  return false;
};
